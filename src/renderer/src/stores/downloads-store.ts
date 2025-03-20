import { logger } from "@renderer/lib/utils"
import type { DownloadItem, DownloadStats } from "@shared/types/downloads"
import type { CompleteCollectionResult, ProcessedMod } from "@shared/types/workshop"
import type { IpcRendererEvent } from "electron"
import { atom, computed } from "nanostores"

interface DownloadsState {
	items: DownloadItem[]
	stats: DownloadStats | null
	loading: boolean
	error: string | null
	lastUpdated: number
	isSubscribed: boolean
}

const downloadsStore = atom<DownloadsState>({
	items: [],
	stats: null,
	loading: false,
	error: null,
	lastUpdated: 0,
	isSubscribed: false
})

export const activeDownloads = computed(downloadsStore, (state) =>
	state.items.filter((item) => ["downloading", "pending", "paused"].includes(item.status))
)

export const completedDownloads = computed(downloadsStore, (state) =>
	state.items.filter((item) => item.status === "complete")
)

export const failedDownloads = computed(downloadsStore, (state) =>
	state.items.filter((item) => ["error", "failed"].includes(item.status))
)

function handleDownloadUpdate(_event: IpcRendererEvent, updatedDownload: DownloadItem) {
	const state = downloadsStore.get()
	const items = [...state.items]
	const index = items.findIndex((item) => item.id === updatedDownload.id)

	if (index >= 0) {
		items[index] = updatedDownload
	}

	downloadsStore.set({
		...state,
		items,
		lastUpdated: Date.now()
	})

	refreshStats().catch((err) => logger.error(`Error refreshing stats: ${err}`))
}

function handleDownloadAdded(_event: IpcRendererEvent, newDownload: DownloadItem) {
	const state = downloadsStore.get()
	const items = [...state.items]

	if (!items.find((item) => item.id === newDownload.id)) {
		items.push(newDownload)
	}

	downloadsStore.set({
		...state,
		items,
		lastUpdated: Date.now()
	})

	refreshStats().catch((err) => logger.error(`Error refreshing stats: ${err}`))
}

export function subscribeToDownloadUpdates() {
	const state = downloadsStore.get()
	if (state.isSubscribed) return // Already subscribed

	window.api.downloads.onUpdated(handleDownloadUpdate)
	window.api.downloads.onAdded(handleDownloadAdded)

	downloadsStore.set({
		...state,
		isSubscribed: true
	})

	logger.info("Subscribed to download updates")
}

export function unsubscribeFromDownloadUpdates() {
	const state = downloadsStore.get()
	if (!state.isSubscribed) return // Not subscribed

	window.api.downloads.offUpdated(handleDownloadUpdate)
	window.api.downloads.offAdded(handleDownloadAdded)

	downloadsStore.set({
		...state,
		isSubscribed: false
	})

	logger.info("Unsubscribed from download updates")
}

export async function loadDownloads(): Promise<DownloadItem[]> {
	try {
		downloadsStore.set({
			...downloadsStore.get(),
			loading: true,
			error: null
		})

		const [items, stats] = await Promise.all([
			window.api.downloads.getAll(),
			window.api.downloads.getStats()
		])

		downloadsStore.set({
			...downloadsStore.get(),
			items,
			stats,
			loading: false,
			error: null,
			lastUpdated: Date.now()
		})

		subscribeToDownloadUpdates()

		return items
	} catch (error) {
		logger.error(`Failed to load downloads:  ${error}`)

		downloadsStore.set({
			...downloadsStore.get(),
			loading: false,
			error: error instanceof Error ? error.message : String(error)
		})

		return []
	}
}

export async function refreshStats(): Promise<void> {
	try {
		const stats = await window.api.downloads.getStats()

		downloadsStore.set({
			...downloadsStore.get(),
			stats,
			lastUpdated: Date.now()
		})
	} catch (error) {
		logger.error(`Failed to refresh download stats: ${error}`)
	}
}

export async function queueWorkshopItemDownload(options: {
	workshopId: string
	name: string
	instanceId?: string
	metadata?: ProcessedMod
}): Promise<string> {
	try {
		const id = await window.api.downloads.queueWorkshopItem(options)
		await loadDownloads()
		return id
	} catch (error) {
		logger.error(`Failed to queue workshop item download: ${error}`)
		throw error
	}
}

export async function queueCollectionDownload(
	collection: CompleteCollectionResult,
	instanceId?: string
): Promise<string> {
	try {
		logger.info(`Queueing collection download for instance: ${instanceId || "none"}`)
		const id = await window.api.downloads.queueCollection(collection, instanceId)
		await loadDownloads()
		return id
	} catch (error) {
		logger.error(`Failed to queue collection download: ${error}`)
		throw error
	}
}

export async function cancelDownload(id: string): Promise<boolean> {
	try {
		const result = await window.api.downloads.cancel(id)
		await loadDownloads()
		return result
	} catch (error) {
		logger.error(`Failed to cancel download ${id}: ${error}`)
		throw error
	}
}

export async function pauseDownload(id: string): Promise<boolean> {
	try {
		const result = await window.api.downloads.pause(id)
		await loadDownloads()
		return result
	} catch (error) {
		logger.error(`Failed to pause download ${id}: ${error}`)
		throw error
	}
}

export async function resumeDownload(id: string): Promise<boolean> {
	try {
		const result = await window.api.downloads.resume(id)
		await loadDownloads()
		return result
	} catch (error) {
		logger.error(`Failed to resume download ${id}: ${error}`)
		throw error
	}
}

export async function retryDownload(id: string): Promise<boolean> {
	try {
		const result = await window.api.downloads.retry(id)
		await loadDownloads()
		return result
	} catch (error) {
		logger.error(`Failed to retry download ${id}: ${error}`)
		throw error
	}
}

export async function clearFinishedDownloads(): Promise<number> {
	try {
		const count = await window.api.downloads.clearFinished()
		await loadDownloads()
		return count
	} catch (error) {
		logger.error(`Failed to clear finished downloads: ${error}`)
		throw error
	}
}

export { downloadsStore }
