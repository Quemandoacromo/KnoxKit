import type { CompleteCollectionResult, ProcessedMod } from "./workshop"

export type InstanceStatus = "Ready" | "Running" | "Error" | "Downloading" | "Updating"

export type GameVersion = "stable" | "beta"

/**
 * Instance mod configuration
 */
export interface InstanceModsConfig {
	enabledModIds: string[]
	workshopModIds: string[]
	loadOrder: string[]
	collections: string[]
	localMods: Record<string, boolean>
}

/**
 * Relationship between an instance and a mod, with instance-specific metadata
 */
export interface InstanceModRelation {
	modId: string
	enabled: boolean
	loadOrder: number
	installedAt?: Date
}

/**
 * Source from which the instance was created
 */
export type InstanceSource = "manual" | "collection" | "template"

export interface GameInstance {
	id: string
	name: string
	description?: string
	path: string
	launchParams?: string[]

	source?: InstanceSource
	collectionId?: string

	modIds: string[]
	modRelations?: InstanceModRelation[]

	status: InstanceStatus
	lastPlayed?: Date
	createdAt: Date
	updatedAt: Date
	memoryAllocation?: number
	modsEnabled?: boolean
	customOptions?: Record<string, unknown>
	playTime?: number
	gameVersion?: GameVersion

	modsConfig?: InstanceModsConfig
	installedMods?: ProcessedMod[]
	activeCollection?: string

	collectionData?: CompleteCollectionResult

	totalModsSize?: number
	modsCount?: number
	enabledModsCount?: number
}

export interface LaunchOptions {
	memoryMb?: number
	debug?: boolean
	safeMode?: boolean
	noSteam?: boolean
	additionalArgs?: string[]
	minimizeToTray?: boolean
}

export interface InstancesState {
	instances: GameInstance[]
	activeInstance: string | null
	instancesDirectory: string
}
