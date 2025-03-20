export interface WorkshopItem {
	id: string
	title: string
	description: string
	author: {
		name: string
		profileUrl: string
	}
	imageUrl: string
	rating: string
	url: string
}

export interface WorkshopQueryParams {
	appId: string
	searchText?: string
	page?: number
	pageSize?: number
	tags?: string[]
	sortBy?: "trend" | "rated" | "popular" | "updated" | "created"
}

export interface WorkshopQueryResult {
	totalResults: number
	items: WorkshopItem[]
}

export interface CollectionData {
	id: string
	title: string
	description: string
	imageUrl: string
	modCount: number
	modIds: string[]
}

/**
 * Types for Steam Workshop API and mod management in KnoxKit
 */

// ------------------
// STEAM WORKSHOP API
// ------------------

/**
 * Steam Workshop item tag
 */
export interface SteamWorkshopTag {
	tag: string
}

/**
 * Details of an item published in Steam Workshop
 */
export interface SteamPublishedFileDetails {
	publishedfileid: string
	result: number
	creator: string
	creator_app_id: number
	consumer_app_id: number
	filename: string
	file_size: string
	file_url: string
	hcontent_file: string
	preview_url: string
	hcontent_preview: string
	title: string
	description: string
	time_created: number
	time_updated: number
	visibility: number
	banned: number
	ban_reason: string
	subscriptions: number
	favorited: number
	lifetime_subscriptions: number
	lifetime_favorited: number
	views: number
	tags: SteamWorkshopTag[]
}

/**
 * Response from Steam Workshop file details API
 */
export interface SteamPublishedFileDetailsResponse {
	response: {
		result: number
		resultcount: number
		publishedfiledetails: SteamPublishedFileDetails[]
	}
}

/**
 * Collection item
 */
export interface SteamCollectionItem {
	publishedfileid: string
	sortorder: number
	filetype: number
}

/**
 * Collection details
 */
export interface SteamCollectionDetails {
	publishedfileid: string
	result: number
	children: SteamCollectionItem[]
}

/**
 * Response from Steam Workshop collection details API
 */
export interface SteamCollectionDetailsResponse {
	response: {
		result: number
		resultcount: number
		collectiondetails: SteamCollectionDetails[]
	}
}

// ------------------
// WORKSHOP DOWNLOAD
// ------------------

/**
 * Download progress information for a Workshop mod
 */
export interface ModDownloadProgress {
	modId: string
	name: string
	progress: number
	totalSize: number
	downloadedSize: number
	status: "queued" | "downloading" | "complete" | "error"
	error?: string
}

/**
 * Collection download status
 */
export interface CollectionDownloadStatus {
	collectionId: string
	totalMods: number
	completedMods: number
	failedMods: number
	totalSize: number
	downloadedSize: number
	progress: number
	status: "preparing" | "downloading" | "complete" | "error"
	mods: Record<string, ModDownloadProgress>
	error?: string
}

/**
 * Workshop collection import state
 */
export interface WorkshopImportState {
	collectionId: string
	status: "idle" | "loading" | "parsing" | "downloading" | "error" | "success"
	error?: string
	data?: CollectionData
	progress?: number
	downloadStatus?: CollectionDownloadStatus
}

/**
 * Result of parsing a collection
 */
export interface ParseCollectionResult {
	data: CollectionData
	error?: string
}

// ------------------
// PROJECT ZOMBOID MODS
// ------------------

/**
 * Information contained in a mod.info file
 */
export interface ModInfoFile {
	id: string
	name?: string
	author?: string
	description?: string
	url?: string
	poster?: string[] | string
	icon?: string
	modversion?: string
	require?: string[] | string
	incompatible?: string[] | string
	loadModAfter?: string[] | string
	loadModBefore?: string[] | string
	category?: string
	pack?: string[] | string
	tiledef?: string
	versionMin?: string
	versionMax?: string
	[key: string]: unknown
}

/**
 * A processed mod with combined information from Workshop and mod.info
 */
export interface ProcessedMod {
	id: string
	workshopId?: string
	name: string
	description?: string
	author?: string
	url?: string
	version?: string
	tags: string[]
	infoFile?: ModInfoFile
	workshopDetails?: SteamPublishedFileDetails
	thumbnailUrl?: string
	downloadUrl?: string
	isLocal: boolean
	isWorkshop: boolean
	isEnabled: boolean
	isCompatible: boolean
	dependencies: string[]
	incompatibilities: string[]
	loadOrder: number
	size?: number
	dateCreated?: Date
	dateUpdated?: Date
	path?: string
	installStatus?: "not_installed" | "downloading" | "installed" | "error"
	instanceIds?: string[]
}

/**
 * A processed collection with combined information
 */
export interface ProcessedModCollection {
	id: string
	workshopId?: string
	name: string
	description?: string
	author?: string
	thumbnailUrl?: string
	mods: string[]
	modsDetails?: ProcessedMod[]
	dateCreated?: Date
	dateUpdated?: Date
	isLocal: boolean
	totalSize?: number
}

// ------------------
// MANAGEMENT STATES
// ------------------

/**
 * Mod manager state
 */
export interface ModManagerState {
	installedMods: ProcessedMod[]
	availableMods: ProcessedMod[]
	collections: ProcessedModCollection[]
	isLoading: boolean
	isDownloading: boolean
	downloadProgress: {
		[modId: string]: number
	}
	activeFilters: {
		tags: string[]
		searchTerm: string
		onlyInstalled: boolean
		onlyEnabled: boolean
	}
}

/**
 * Workshop sync state
 */
export interface WorkshopSyncState {
	lastSync: Date | null
	isInProgress: boolean
	itemsProcessed: number
	totalItems: number
	errors: string[]
}

/**
 * Mod manager configuration
 */
export interface ModManagerConfig {
	autoUpdateMods: boolean
	syncOnStartup: boolean
	downloadDirectory?: string
	concurrentDownloads: number
	saveBackups: boolean
	preferredLanguage?: string
	checkCompatibility: boolean
	sortOrder: "alphabetical" | "recent" | "size" | "popularity"
}

/**
 * Extended result of parsing a collection with all mod details
 */
export interface CompleteCollectionResult extends ParseCollectionResult {
	modsDetails?: ProcessedMod[]
	totalSize?: number
}
