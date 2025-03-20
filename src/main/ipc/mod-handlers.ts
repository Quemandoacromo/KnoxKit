import { promises as fs } from "node:fs"
import path from "node:path"
import { getInstancePath } from "@main/stores/instances-store"
import logger from "@main/utils/logger"
import type { ModInfoFile, ProcessedMod } from "@shared/types/workshop"
import { ipcMain } from "electron"
import { parse as parseIni } from "ini"

/**
 * Register mod-related IPC handlers
 */
export function registerModHandlers(): () => void {
	ipcMain.handle(
		"mods:getForInstance",
		async (_event, instanceId: string): Promise<ProcessedMod[]> => {
			try {
				return await getModsForInstance(instanceId)
			} catch (error) {
				logger.system.error(`Failed to get mods for instance ${instanceId}:`, error)
				return []
			}
		}
	)

	logger.system.info("Mod IPC handlers registered")

	return () => {
		ipcMain.removeHandler("mods:getForInstance")
	}
}

/**
 * Get mods installed for a specific game instance
 */
async function getModsForInstance(instanceId: string): Promise<ProcessedMod[]> {
	try {
		const instancePath = await getInstancePath(instanceId)
		const modsPath = path.join(instancePath, "Zomboid", "mods")

		try {
			await fs.access(modsPath)
		} catch (e) {
			logger.system.info(`Mods directory doesn't exist for instance ${instanceId}: ${modsPath}`)
			return []
		}

		const modFolders = await fs.readdir(modsPath)
		const result: ProcessedMod[] = []

		for (const folder of modFolders) {
			const modPath = path.join(modsPath, folder)
			const stats = await fs.stat(modPath)

			if (!stats.isDirectory()) continue

			try {
				const modInfoPath = path.join(modPath, "mod.info")
				let modInfo: ModInfoFile | undefined

				try {
					const modInfoContent = await fs.readFile(modInfoPath, "utf-8")
					modInfo = parseIni(modInfoContent) as ModInfoFile
				} catch (e) {
					logger.system.debug(`No mod.info found in ${folder}`)
					continue
				}

				if (!modInfo || !modInfo.id) continue

				const posterPath = modInfo.poster
					? typeof modInfo.poster === "string"
						? path.join(modPath, modInfo.poster)
						: path.join(modPath, modInfo.poster[0])
					: null

				let thumbnailUrl: string | undefined
				if (posterPath) {
					try {
						await fs.access(posterPath)
						thumbnailUrl = `file://${posterPath}`
					} catch (e) {}
				}

				const dependencies: string[] = []
				if (modInfo.require) {
					if (typeof modInfo.require === "string") {
						dependencies.push(modInfo.require)
					} else {
						dependencies.push(...modInfo.require)
					}
				}

				const incompatibilities: string[] = []
				if (modInfo.incompatible) {
					if (typeof modInfo.incompatible === "string") {
						incompatibilities.push(modInfo.incompatible)
					} else {
						incompatibilities.push(...modInfo.incompatible)
					}
				}

				const processedMod: ProcessedMod = {
					id: modInfo.id,
					name: modInfo.name || folder,
					description: modInfo.description,
					author: modInfo.author,
					version: modInfo.modversion,
					tags: modInfo.category ? [modInfo.category] : [],
					infoFile: modInfo,
					isLocal: true,
					isWorkshop: false,
					isEnabled: true,
					isCompatible: true,
					dependencies,
					incompatibilities,
					loadOrder: 0,
					thumbnailUrl,
					path: modPath,
					installStatus: "installed",
					instanceIds: [instanceId]
				}

				result.push(processedMod)
			} catch (e) {
				logger.system.warn(`Error processing mod in folder ${folder}:`, e)
			}
		}

		logger.system.info(`Found ${result.length} mods for instance ${instanceId}`)
		return result
	} catch (error) {
		logger.system.error(`Failed to get mods for instance ${instanceId}:`, error)
		throw error
	}
}
