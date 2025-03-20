import type { ProcessedMod, ProcessedModCollection } from "./workshop"

export type ModData = ProcessedMod

export type ModsCollection = ProcessedModCollection

export interface ModsState {
	installedMods: ModData[]
	collections: ModsCollection[]
	favorites: string[] // Mod IDs
}
