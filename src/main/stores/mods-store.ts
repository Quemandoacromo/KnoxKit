import { Conf } from "electron-conf"
import type { ModsState } from "@shared/types/mods"

const modsStore = new Conf<ModsState>({
	name: "mods-data",
	defaults: {
		installedMods: [],
		collections: [],
		favorites: []
	}
})

export const getModsData = () => modsStore.store
export const updateModsData = (data: Partial<ModsState>) => modsStore.set(data)

export default modsStore
