export type DownloadStatus =
	| "pending"
	| "downloading"
	| "complete"
	| "error"
	| "cancelled"
	| "paused"
	| "failed"

/**
 * Represents a download item as seen by the UI and API
 */
export interface DownloadItem {
	id: string
	name: string
	type: string
	progress: number
	status: DownloadStatus
	statusText?: string
	error?: string | null
	startTime?: Date
	endTime?: Date
	size?: number
	downloaded?: number
	targetId?: string
	url?: string
	filename?: string
	savePath?: string
	speed?: number
	mimeType?: string
	metadata?: Record<string, unknown>
	parentId?: string
}

/**
 * Statistics about all downloads
 */
export interface DownloadStats {
	active: number
	paused: number
	completed: number
	cancelled: number
	failed: number
	total: number
	avgSpeed: number
}

/**
 * Internal use - represents an item in the download queue with additional fields
 */
export interface DownloadQueueItem extends Omit<DownloadItem, "error"> {
	error: string | null
	metadata?: Record<string, unknown>
	children?: string[]
	parentId?: string
}

/**
 * Download Manager API interface
 */
export interface DownloadManagerAPI {
	getAllDownloads(): DownloadItem[]
	getDownloadStats(): DownloadStats
	queueDownload(item: Partial<DownloadQueueItem>): string
	addDownload(item: Partial<DownloadQueueItem>): string
	cancelDownload(id: string): Promise<boolean>
	pauseDownload(id: string): Promise<boolean>
	resumeDownload(id: string): Promise<boolean>
	retryDownload(id: string): Promise<boolean>
	cleanupDownloads(maxAgeMs?: number): Promise<number>
	clearFinishedDownloads(): Promise<number>
	updateDownload(id: string, updates: Partial<DownloadQueueItem>): void
}

/**
 * Workshop item metadata for downloads
 */
export interface WorkshopItemMetadata {
	workshopId?: string
	title?: string
	author?: string
	description?: string
	tags?: string[]
	thumbnailUrl?: string
	imageUrl?: string
	dateCreated?: string
	dateUpdated?: string
	[key: string]: unknown
}

/**
 * Workshop collection metadata for downloads
 */
export interface WorkshopCollectionMetadata {
	collectionId?: string
	title?: string
	description?: string
	modCount?: number
	modIds?: string[]
	modsDetails?: Array<{
		id: string
		name: string
		author?: string
		description?: string
		tags?: string[]
		thumbnailUrl?: string
		[key: string]: unknown
	}>
	imageUrl?: string
	totalSize?: number
	modAuthors?: string[]
	primaryTags?: string[]
	dateCreated?: Date | string
	dateUpdated?: Date | string
	source?: string
	[key: string]: unknown
}

/**
 * Mod details for download item metadata
 */
export interface DownloadModDetails {
	id: string
	name: string
	author?: string
	description?: string
	tags?: string[]
	thumbnailUrl?: string
	size?: number
	dateCreated?: string
	dateUpdated?: string
	instanceId?: string
}
