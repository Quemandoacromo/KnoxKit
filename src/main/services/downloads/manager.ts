import { EventEmitter } from "node:events"
import { promises as fs, existsSync } from "node:fs"
import { join } from "node:path"
import { broadcastInstancesChange } from "@main/ipc/instance-handlers"
import { downloadWorkshopItem, getWorkshopItemModPaths } from "@main/services/steam"
import { getInstance, getInstancePath, updateInstanceData } from "@main/stores/instances-store"
import logger from "@main/utils/logger"
import type {
	DownloadItem,
	DownloadQueueItem,
	DownloadStats,
	DownloadStatus
} from "@shared/types/downloads"
import { BrowserWindow } from "electron"
import { v4 as uuidv4 } from "uuid"

/**
 * Download Manager Service
 * Handles all download operations for the application
 */
export class DownloadManager extends EventEmitter {
	private downloads: Map<string, DownloadQueueItem> = new Map()
	private activeDownloads: Set<string> = new Set()
	private maxConcurrent = 3

	constructor() {
		super()
		logger.system.info("Download Manager initialized")

		this.on("download:updated", (download) => {
			this.sendToRenderer("download:updated", download)
		})

		this.on("download:added", (download) => {
			this.sendToRenderer("download:added", download)
		})
	}

	/**
	 * Send events to all renderer processes
	 */
	private sendToRenderer(channel: string, ...args: unknown[]) {
		const windows = BrowserWindow.getAllWindows()
		for (const window of windows) {
			if (!window.isDestroyed()) {
				window.webContents.send(channel, ...args)
			}
		}
	}

	/**
	 * Get all downloads
	 */
	getAllDownloads(): DownloadItem[] {
		return Array.from(this.downloads.values()).map((item) => this.sanitizeDownload(item))
	}

	/**
	 * Get download statistics
	 */
	getDownloadStats(): DownloadStats {
		const downloads = Array.from(this.downloads.values())
		const active = downloads.filter((d) => d.status === "downloading").length
		const paused = downloads.filter((d) => d.status === "paused").length
		const completed = downloads.filter((d) => d.status === "complete").length
		const cancelled = downloads.filter((d) => d.status === "cancelled").length
		const failed = downloads.filter((d) => d.status === "failed" || d.status === "error").length

		const activeItems = downloads.filter((d) => d.status === "downloading")
		const avgSpeed =
			activeItems.length > 0
				? activeItems.reduce((sum, item) => sum + (item.speed || 0), 0) / activeItems.length
				: 0

		return {
			active,
			paused,
			completed,
			cancelled,
			failed,
			total: downloads.length,
			avgSpeed
		}
	}

	/**
	 * Queue a download without starting it immediately
	 */
	queueDownload(item: Partial<DownloadQueueItem>): string {
		const id = item.id || uuidv4()

		const downloadItem: DownloadQueueItem = {
			id,
			name: item.name || `Download ${id}`,
			type: item.type || "unknown",
			progress: 0,
			status: "pending",
			error: null,
			startTime: new Date(),
			size: item.size || 0,
			downloaded: 0,
			speed: 0,
			parentId: item.parentId,
			metadata: item.metadata,
			...item
		}

		this.downloads.set(id, downloadItem)
		logger.system.info(`Download queued: ${downloadItem.name} (${id})`)
		this.emit("download:added", this.sanitizeDownload(downloadItem))

		this.processQueue()

		return id
	}

	/**
	 * Add a download and start it immediately if possible
	 */
	addDownload(item: Partial<DownloadQueueItem>): string {
		return this.queueDownload({
			...item,
			status: "pending"
		})
	}

	/**
	 * Process the download queue
	 */
	private processQueue() {
		if (this.activeDownloads.size >= this.maxConcurrent) return

		const pending = Array.from(this.downloads.values())
			.filter((d) => d.status === "pending")
			.sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0))

		for (const download of pending) {
			if (this.activeDownloads.size >= this.maxConcurrent) break

			this.startDownload(download.id)
		}
	}

	/**
	 * Start a specific download
	 */
	private async startDownload(id: string): Promise<boolean> {
		const download = this.downloads.get(id)
		if (!download) return false

		if (this.activeDownloads.has(id)) return true

		this.updateDownload(id, {
			status: "downloading",
			startTime: new Date()
		})

		this.activeDownloads.add(id)

		try {
			if (download.type === "workshop_item") {
				await this.downloadWorkshopItem(download)
			} else if (download.type === "workshop_collection") {
				await this.downloadWorkshopCollection(download)
			} else {
				this.updateDownload(id, {
					error: "Unsupported download type",
					status: "failed"
				})
				return false
			}

			return true
		} catch (error) {
			logger.system.error(`Download error for ${id}: ${error}`)
			this.updateDownload(id, {
				error: error instanceof Error ? error.message : String(error),
				status: "failed",
				endTime: new Date()
			})
			return false
		} finally {
			this.activeDownloads.delete(id)
			this.processQueue()
		}
	}

	/**
	 * Download a workshop item
	 */
	private async downloadWorkshopItem(item: DownloadQueueItem): Promise<boolean> {
		if (!item.url) {
			throw new Error("Missing workshop item ID")
		}

		const workshopId = item.url

		const progressInterval = setInterval(() => {
			const currentItem = this.downloads.get(item.id)
			if (!currentItem || currentItem.status !== "downloading") {
				clearInterval(progressInterval)
				return
			}

			const newProgress = Math.min(95, (currentItem.progress || 0) + 5)
			const speed = Math.random() * 1024 * 1024 * 2

			this.updateDownload(item.id, {
				progress: newProgress,
				speed,
				downloaded: Math.floor((newProgress / 100) * (item.size || 1000000))
			})
		}, 1000)

		try {
			const result = await downloadWorkshopItem(workshopId)

			clearInterval(progressInterval)

			if (result) {
				this.updateDownload(item.id, {
					status: "complete",
					progress: 100,
					endTime: new Date(),
					downloaded: item.size,
					speed: 0
				})

				if (item.targetId) {
					await this.installModToInstance(workshopId, item.targetId, item.name)
				}

				return true
			}
			throw new Error("Workshop item download failed")
		} catch (error) {
			clearInterval(progressInterval)
			throw error
		}
	}

	/**
	 * Install a downloaded mod to a specific instance
	 */
	private async installModToInstance(
		workshopId: string,
		instanceId: string,
		modName: string
	): Promise<boolean> {
		try {
			const modPaths = await getWorkshopItemModPaths(workshopId)

			if (modPaths.length === 0) {
				logger.system.warn(`No mod folders found for workshop item ${workshopId}`)
				return false
			}

			const instancePath = await getInstancePath(instanceId)
			logger.system.info(`Installing mod ${modName} to instance ${instanceId} at ${instancePath}`)
			const modsDir = join(instancePath, "Zomboid", "mods")

			if (!existsSync(modsDir)) {
				await fs.mkdir(modsDir, { recursive: true })
				logger.system.info(`Created mods directory: ${modsDir}`)
			}

			let successCount = 0
			for (const modPath of modPaths) {
				const modFolderName = modPath.split("/").pop()?.split("\\").pop()
				if (!modFolderName) continue

				const destPath = join(modsDir, modFolderName)

				try {
					if (existsSync(destPath)) {
						await fs.rm(destPath, { recursive: true, force: true })
					}

					await fs.cp(modPath, destPath, { recursive: true })
					logger.system.info(`Installed mod from ${modPath} to ${destPath}`)
					successCount++
				} catch (err) {
					logger.system.error(`Error copying mod ${modFolderName}: ${err}`)
				}
			}

			logger.system.info(
				`Installed ${successCount}/${modPaths.length} mods for instance ${instanceId}`
			)

			if (successCount > 0) {
				try {
					const modDownload = Array.from(this.downloads.values()).find(
						(d) => d.url === workshopId && d.type === "workshop_item"
					)

					const modMetadata = modDownload?.metadata || {
						workshopId,
						title: modName
					}

					const instanceData = await getInstance(instanceId)
					const currentModsCount = instanceData?.modsCount || 0
					const installedMods = instanceData?.installedMods || []

					const updatedMods = [...installedMods]
					const existingModIndex = updatedMods.findIndex(
						(m) => m.id === workshopId || m.workshopId === workshopId
					)
					if (existingModIndex >= 0) {
						updatedMods[existingModIndex] = { ...updatedMods[existingModIndex], ...modMetadata }
					} else {
						updatedMods.push({
							...modMetadata,
							id: workshopId,
							name: "",
							tags: [],
							isLocal: false,
							isWorkshop: false,
							isEnabled: false,
							isCompatible: false,
							dependencies: [],
							incompatibilities: [],
							loadOrder: 0
						})
					}

					await updateInstanceData(instanceId, {
						status: "Ready",
						modsCount: currentModsCount + (existingModIndex >= 0 ? 0 : 1),
						installedMods: updatedMods
					})

					if (typeof broadcastInstancesChange === "function") {
						broadcastInstancesChange()
					}

					logger.system.info(`Updated instance ${instanceId} with new mod information`)
				} catch (err) {
					logger.system.error(`Failed to update instance data after mod installation: ${err}`)
				}
			}

			return successCount > 0
		} catch (error) {
			logger.system.error(`Failed to install mod ${workshopId} to instance ${instanceId}: ${error}`)
			return false
		}
	}

	/**
	 * Process collection installation after downloads complete
	 */
	private async installCollectionToInstance(
		collectionId: string,
		instanceId: string
	): Promise<boolean> {
		const children = Array.from(this.downloads.values()).filter(
			(d) =>
				d.parentId &&
				this.downloads.get(d.parentId)?.metadata?.collectionId === collectionId &&
				d.status === "complete" &&
				d.url
		)

		if (children.length === 0) {
			logger.system.warn(`No completed downloads found for collection ${collectionId}`)
			return false
		}

		let successCount = 0
		for (const child of children) {
			if (child.url) {
				const result = await this.installModToInstance(child.url, instanceId, child.name)
				if (result) successCount++
			}
		}

		logger.system.info(
			`Installed ${successCount}/${children.length} mods for collection ${collectionId} to instance ${instanceId}`
		)
		return successCount > 0
	}

	/**
	 * Download a workshop collection
	 */
	private async downloadWorkshopCollection(item: DownloadQueueItem): Promise<boolean> {
		if (!item.metadata?.collectionId) {
			logger.system.error("Collection download missing collectionId, metadata:", item.metadata)
			throw new Error("Missing collection ID")
		}

		const collectionId = String(item.metadata.collectionId)
		const modIds = item.children || []

		if (!modIds.length) {
			logger.system.error(`Collection ${collectionId} has no mods`)
			throw new Error("No mods found in collection")
		}

		logger.system.info(
			`Processing collection ${collectionId} with ${modIds.length} mods for instance: ${item.targetId || "unknown"}`
		)

		const modsDetails = Array.isArray(item.metadata.modsDetails) ? item.metadata.modsDetails : []

		const modDetailsMap = new Map()
		if (modsDetails.length > 0) {
			for (const mod of modsDetails) {
				modDetailsMap.set(mod.id, mod)
			}
		}

		for (const modId of modIds) {
			const modDetails = modDetailsMap.get(modId)

			this.queueDownload({
				name: modDetails ? modDetails.name : `Mod ${modId}`,
				type: "workshop_item",
				url: modId,
				parentId: item.id,
				targetId: item.targetId,
				size: modDetails?.size || Math.floor((Math.random() * 50 + 10) * 1024 * 1024),
				metadata: modDetails
					? {
							workshopId: modId,
							title: modDetails.name,
							author: modDetails.author,
							description: modDetails.description,
							tags: modDetails.tags || [],
							thumbnailUrl: modDetails.thumbnailUrl,
							dateCreated: modDetails.dateCreated,
							dateUpdated: modDetails.dateUpdated,
							...modDetails
						}
					: {
							workshopId: modId
						}
			})
		}

		const checkChildrenStatus = () => {
			const children = Array.from(this.downloads.values()).filter((d) => d.parentId === item.id)

			if (!children.length) return

			const allFinished = children.every((d) =>
				["complete", "failed", "cancelled", "error"].includes(d.status)
			)

			if (allFinished) {
				const allSuccessful = children.every((d) => d.status === "complete")

				this.updateDownload(item.id, {
					status: allSuccessful ? "complete" : "failed",
					progress: 100,
					endTime: new Date(),
					error: allSuccessful ? null : "Some mods failed to download"
				})

				if (item.targetId) {
					if (allSuccessful && item.metadata?.collectionId) {
						this.installCollectionToInstance(
							String(item.metadata.collectionId),
							item.targetId
						).catch((err) => {
							logger.system.error(`Error installing collection: ${err}`)
						})
					}

					this.emit("instance:downloads-complete", {
						instanceId: item.targetId,
						successful: allSuccessful,
						collectionId: item.metadata?.collectionId
					})

					try {
						const newStatus = allSuccessful ? "Ready" : "Error"
						logger.system.info(
							`Updating instance ${item.targetId} status to ${newStatus} after download completion`
						)
						updateInstanceData(item.targetId, {
							status: newStatus,
							modsCount: modIds.length,
							installedMods: modsDetails
						})
							.then(() => {
								if (typeof broadcastInstancesChange === "function") {
									broadcastInstancesChange()
								}
							})
							.catch((err) => logger.system.error(`Failed to update instance status: ${err}`))
					} catch (error) {
						logger.system.error(`Error updating instance status after download: ${error}`)
					}
				}
			} else {
				const totalProgress = children.reduce((sum, c) => sum + c.progress, 0) / children.length

				this.updateDownload(item.id, {
					progress: Math.floor(totalProgress)
				})
			}
		}

		const handleChildUpdate = (updated: DownloadItem) => {
			if (updated.parentId === item.id) {
				checkChildrenStatus()
			}
		}

		this.on("download:updated", handleChildUpdate)

		this.updateDownload(item.id, {
			status: "downloading",
			progress: 0
		})

		return true
	}

	/**
	 * Cancel a download
	 */
	async cancelDownload(id: string): Promise<boolean> {
		const download = this.downloads.get(id)
		if (!download) return false

		this.activeDownloads.delete(id)

		if (download.children && download.children.length > 0) {
			for (const childId of download.children) {
				await this.cancelDownload(childId)
			}
		}

		this.updateDownload(id, {
			status: "cancelled",
			endTime: new Date()
		})

		this.processQueue()

		return true
	}

	/**
	 * Pause a download
	 */
	async pauseDownload(id: string): Promise<boolean> {
		const download = this.downloads.get(id)
		if (!download || download.status !== "downloading") return false

		this.activeDownloads.delete(id)

		this.updateDownload(id, {
			status: "paused"
		})

		this.processQueue()

		return true
	}

	/**
	 * Resume a download
	 */
	async resumeDownload(id: string): Promise<boolean> {
		const download = this.downloads.get(id)
		if (!download || download.status !== "paused") return false

		this.updateDownload(id, {
			status: "pending"
		})

		this.processQueue()

		return true
	}

	/**
	 * Retry a failed download
	 */
	async retryDownload(id: string): Promise<boolean> {
		const download = this.downloads.get(id)
		if (!download || !["failed", "error", "cancelled"].includes(download.status)) return false

		this.updateDownload(id, {
			status: "pending",
			error: null
		})

		this.processQueue()

		return true
	}

	/**
	 * Clean up old downloads
	 */
	async cleanupDownloads(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
		const now = Date.now()
		let count = 0

		for (const [id, download] of this.downloads.entries()) {
			if (!["complete", "cancelled", "failed", "error"].includes(download.status)) {
				continue
			}

			const endTime = download.endTime || download.startTime
			if (endTime && now - endTime.getTime() > maxAgeMs) {
				this.downloads.delete(id)
				count++
			}
		}

		if (count > 0) {
			this.emit("downloads:cleaned", count)
		}

		return count
	}

	/**
	 * Clear finished downloads
	 */
	async clearFinishedDownloads(): Promise<number> {
		const finishedStatuses: DownloadStatus[] = ["complete", "cancelled", "failed", "error"]
		let count = 0

		for (const [id, download] of this.downloads.entries()) {
			if (finishedStatuses.includes(download.status)) {
				this.downloads.delete(id)
				count++
			}
		}

		if (count > 0) {
			this.emit("downloads:cleared", count)
		}

		return count
	}

	/**
	 * Update a download
	 */
	updateDownload(id: string, updates: Partial<DownloadQueueItem>): void {
		const download = this.downloads.get(id)
		if (!download) return

		const updated = { ...download, ...updates }
		this.downloads.set(id, updated)

		this.emit("download:updated", this.sanitizeDownload(updated))
	}

	/**
	 * Convert internal queue item to public download item (sanitize internal fields)
	 * Updated to preserve metadata for UI display
	 */
	private sanitizeDownload(item: DownloadQueueItem): DownloadItem {
		const { children, ...rest } = item

		if (rest.type === "workshop_item" && rest.metadata) {
			if (rest.metadata.title === undefined) {
				rest.metadata.title = rest.name
			}
		}

		return rest
	}
}

export const downloadManager = new DownloadManager()
