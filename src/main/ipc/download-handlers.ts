import { downloadManager } from "@main/services/downloads"
import logger from "@main/utils/logger"
import type { DownloadItem, DownloadStats } from "@shared/types/downloads"
import type { CompleteCollectionResult, ProcessedMod } from "@shared/types/workshop"
import { ipcMain } from "electron"
import { broadcastInstancesChange } from "./instance-handlers"

/**
 * Register download-related IPC handlers
 */
export function registerDownloadHandlers(): () => void {
	ipcMain.handle("downloads:getAll", async (): Promise<DownloadItem[]> => {
		return downloadManager.getAllDownloads()
	})

	ipcMain.handle("downloads:getStats", async (): Promise<DownloadStats> => {
		return downloadManager.getDownloadStats()
	})

	ipcMain.handle("downloads:cancel", async (_event, id: string): Promise<boolean> => {
		return downloadManager.cancelDownload(id)
	})

	ipcMain.handle("downloads:pause", async (_event, id: string): Promise<boolean> => {
		return downloadManager.pauseDownload(id)
	})

	ipcMain.handle("downloads:resume", async (_event, id: string): Promise<boolean> => {
		return downloadManager.resumeDownload(id)
	})

	ipcMain.handle("downloads:retry", async (_event, id: string): Promise<boolean> => {
		return downloadManager.retryDownload(id)
	})

	ipcMain.handle("downloads:cleanup", async (_event, maxAgeMs?: number): Promise<number> => {
		return downloadManager.cleanupDownloads(maxAgeMs)
	})

	ipcMain.handle("downloads:clearFinished", async (): Promise<number> => {
		return downloadManager.clearFinishedDownloads()
	})

	ipcMain.handle(
		"downloads:queueWorkshopItem",
		async (
			_event,
			options: {
				workshopId: string
				name: string
				instanceId?: string
				metadata?: ProcessedMod
			}
		): Promise<string> => {
			const { workshopId, name, instanceId, metadata } = options

			const downloadMetadata = {
				workshopId,
				title: name || metadata?.name,
				thumbnailUrl: metadata?.thumbnailUrl,
				imageUrl: metadata?.thumbnailUrl,
				description: metadata?.description,
				author: metadata?.author,
				tags: metadata?.tags || [],
				dateCreated: metadata?.dateCreated,
				dateUpdated: metadata?.dateUpdated,
				...(metadata || {})
			}

			logger.system.debug(`Queuing workshop item ${workshopId} (${name})`, {
				metadata: downloadMetadata
			})

			return downloadManager.queueDownload({
				name: name || `Workshop Item ${workshopId}`,
				type: "workshop_item",
				url: workshopId,
				targetId: instanceId,
				size: metadata?.size || 100 * 1024 * 1024,
				metadata: downloadMetadata
			})
		}
	)

	ipcMain.handle(
		"downloads:queueCollection",
		async (_event, collection: CompleteCollectionResult, instanceId?: string): Promise<string> => {
			if (collection.error || !collection.data) {
				throw new Error(`Invalid collection: ${collection.error || "No data"}`)
			}

			const {
				id: collectionId,
				title: name,
				modIds = [],
				modCount = 0,
				imageUrl,
				description
			} = collection.data

			logger.system.debug(`Queueing collection ${collectionId} with ${modCount} mods`, {
				instanceId,
				modIds: modIds.length,
				modsDetails: collection.modsDetails?.length || 0
			})

			const enhancedMetadata = {
				collectionId,
				modCount,
				title: name,
				description,
				imageUrl,
				totalSize: collection.totalSize,
				modIds,
				modsDetails: collection.modsDetails || [],
				modAuthors: collection.modsDetails?.map((mod) => mod.author).filter(Boolean) || [],
				primaryTags: Array.from(
					new Set(collection.modsDetails?.flatMap((mod) => mod.tags || []).slice(0, 10) || [])
				),
				dateCreated: collection.modsDetails?.[0]?.dateCreated,
				dateUpdated: collection.modsDetails?.[0]?.dateUpdated,
				source: "workshop"
			}

			const collectionDownloadId = downloadManager.queueDownload({
				name: name || `Collection ${collectionId}`,
				type: "workshop_collection",
				targetId: instanceId,
				children: modIds,
				size: collection.totalSize || modCount * 50 * 1024 * 1024,
				metadata: enhancedMetadata
			})

			return collectionDownloadId
		}
	)

	downloadManager.on("instance:downloads-complete", () => {
		broadcastInstancesChange()
	})

	logger.system.info("Download IPC handlers registered")

	return () => {
		ipcMain.removeHandler("downloads:getAll")
		ipcMain.removeHandler("downloads:getStats")
		ipcMain.removeHandler("downloads:cancel")
		ipcMain.removeHandler("downloads:pause")
		ipcMain.removeHandler("downloads:resume")
		ipcMain.removeHandler("downloads:retry")
		ipcMain.removeHandler("downloads:cleanup")
		ipcMain.removeHandler("downloads:clearFinished")
		ipcMain.removeHandler("downloads:queueWorkshopItem")
		ipcMain.removeHandler("downloads:queueCollection")
	}
}
