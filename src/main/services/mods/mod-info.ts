import { promises as fs } from "node:fs"
import { join } from "node:path"
import logger from "@main/utils/logger"
import type { ModInfoFile } from "@shared/types/workshop"

/**
 * Parses a Project Zomboid mod.info file
 * @param filePath Path to the mod.info file
 */
export async function parseModInfoFile(filePath: string): Promise<ModInfoFile | null> {
	try {
		const content = await fs.readFile(filePath, "utf-8")
		const lines = content
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("//"))

		const result: Partial<ModInfoFile> = {}

		for (const line of lines) {
			if (line.startsWith("poster=")) {
				const value = line.substring("poster=".length)
				if (!result.poster) {
					result.poster = value
				} else if (Array.isArray(result.poster)) {
					result.poster.push(value)
				} else {
					result.poster = [result.poster, value]
				}
				continue
			}

			if (line.startsWith("require=")) {
				const value = line.substring("require=".length)
				result.require = value.split(",").map((item) => item.trim())
				continue
			}

			if (line.startsWith("incompatible=")) {
				const value = line.substring("incompatible=".length)
				result.incompatible = value.split(",").map((item) => item.trim())
				continue
			}

			const separatorIndex = line.indexOf("=")
			if (separatorIndex > 0) {
				const key = line.substring(0, separatorIndex).trim()
				const value = line.substring(separatorIndex + 1).trim()

				// @ts-ignore - Asignación dinámica basada en la clave
				result[key] = value
			}
		}

		if (!result.name || !result.id) {
			logger.steam.warn(`Mod info file missing required fields: ${filePath}`)
			return null
		}

		return result as ModInfoFile
	} catch (error) {
		logger.steam.error(`Error parsing mod info file ${filePath}: ${error}`)
		return null
	}
}

/**
 * Scans and parses mod.info files in a mods directory
 * @param modsDirectory Directory containing the mods
 */
export async function scanModsDirectory(modsDirectory: string): Promise<Map<string, ModInfoFile>> {
	const result = new Map<string, ModInfoFile>()

	try {
		const entries = await fs.readdir(modsDirectory, { withFileTypes: true })

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const modDir = join(modsDirectory, entry.name)
				const modInfoPath = join(modDir, "mod.info")

				try {
					if (
						await fs
							.stat(modInfoPath)
							.then(() => true)
							.catch(() => false)
					) {
						const modInfo = await parseModInfoFile(modInfoPath)
						if (modInfo) {
							result.set(modInfo.id, modInfo)
						}
					}
				} catch (error) {
					logger.steam.error(`Error processing mod directory ${modDir}: ${error}`)
				}
			}
		}

		return result
	} catch (error) {
		logger.steam.error(`Error scanning mods directory ${modsDirectory}: ${error}`)
		return result
	}
}
