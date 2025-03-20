import { exec } from "node:child_process"
import { join } from "node:path"
import { promisify } from "node:util"
import logger from "@main/utils/logger"
import { PZ_APP_ID } from "@shared/constants/project-zomboid"
import type {
	CompleteCollectionResult,
	ParseCollectionResult,
	ProcessedMod
} from "@shared/types/workshop"

import { promises as fs, existsSync } from "node:fs"
import {
	getCollectionDetails,
	getMultiplePublishedFileDetails,
	getPublishedFileDetails
} from "@main/services/steam/api"

import { getSteamCmdPath, installSteamCmd, isSteamCmdInstalled } from "./installer"

const execAsync = promisify(exec)

/**
 * Checks if SteamCMD is installed
 */
export async function isSteamCmdAvailable(): Promise<boolean> {
	return isSteamCmdInstalled()
}

/**
 * Installs SteamCMD if not available
 */
export async function ensureSteamCmdInstalled(): Promise<boolean> {
	if (await isSteamCmdAvailable()) {
		return true
	}

	try {
		const result = await installSteamCmd()
		return result
	} catch (error) {
		logger.system.error(`SteamCMD installation failed: ${error}`)
		throw error
	}
}

/**
 * Downloads a Steam Workshop item
 * @param workshopId ID of the Workshop item
 * @param username Username (optional, anonymous by default)
 */
export async function downloadWorkshopItem(
	workshopId: string,
	username = "anonymous"
): Promise<boolean> {
	try {
		await ensureSteamCmdInstalled()

		const steamCmdPath = getSteamCmdPath()
		const executable = join(
			steamCmdPath,
			process.platform === "win32" ? "steamcmd.exe" : "steamcmd.sh"
		)

		const cmd = [
			`"${executable}"`,
			"+@NoPromptForPassword 1",
			`+login ${username}`,
			`+workshop_download_item ${PZ_APP_ID} ${workshopId}`,
			"+quit"
		].join(" ")

		logger.system.info(`Downloading Workshop item ${workshopId} for app ${PZ_APP_ID}`)

		await execAsync(cmd)
		return true
	} catch (error) {
		logger.system.error(`Failed to download Workshop item ${workshopId}: ${error}`)
		return false
	}
}

/**
 * Downloads a game or content using SteamCMD
 * @param appId ID of the game or content
 * @param installDir Installation directory
 * @param username Username (optional, anonymous by default)
 */
export async function downloadContent(
	appId: string,
	installDir: string,
	username = "anonymous"
): Promise<boolean> {
	try {
		await ensureSteamCmdInstalled()

		const steamCmdPath = getSteamCmdPath()
		const executable = join(
			steamCmdPath,
			process.platform === "win32" ? "steamcmd.exe" : "steamcmd.sh"
		)

		const cmd = [
			`"${executable}"`,
			"+@NoPromptForPassword 1",
			`+login ${username}`,
			`+force_install_dir "${installDir}"`,
			`+app_update ${appId} validate`,
			"+quit"
		].join(" ")

		logger.system.info(`Downloading app ${appId} to ${installDir}`)
		await execAsync(cmd)
		return true
	} catch (error) {
		logger.system.error(`Failed to download content ${appId}: ${error}`)
		return false
	}
}

/**
 * Parses a Workshop collection to get its details
 * @param collectionId ID of the collection
 * @param includeModDetails Whether to include detailed information about each mod
 */
export async function parseCollection(
	collectionId: string,
	includeModDetails = false
): Promise<ParseCollectionResult | CompleteCollectionResult | { error: string }> {
	try {
		const collectionDetails = await getPublishedFileDetails(collectionId)
		if (!collectionDetails) {
			throw new Error(`Collection ${collectionId} not found`)
		}

		const collection = await getCollectionDetails(collectionId)
		if (!collection) {
			throw new Error(`Could not get collection items for ${collectionId}`)
		}

		const modIds = collection.children.map((item) => item.publishedfileid)

		const result: ParseCollectionResult = {
			data: {
				id: collectionId,
				title: collectionDetails.title,
				description: collectionDetails.description,
				imageUrl: collectionDetails.preview_url,
				modCount: modIds.length,
				modIds: modIds
			}
		}

		if (!includeModDetails) {
			return result
		}

		const modsDetails = await getMultiplePublishedFileDetails(modIds)

		const processedMods: ProcessedMod[] = modsDetails.map((mod) => {
			return {
				id: mod.publishedfileid,
				workshopId: mod.publishedfileid,
				name: mod.title,
				description: mod.description,
				author: mod.creator,
				tags: mod.tags?.map((tag) => tag.tag) || [],
				thumbnailUrl: mod.preview_url,
				downloadUrl: mod.file_url,
				isLocal: false,
				isWorkshop: true,
				isEnabled: false,
				isCompatible: true,
				dependencies: [],
				incompatibilities: [],
				loadOrder: 0,
				size: Number.parseInt(mod.file_size, 10) || 0,
				dateCreated: mod.time_created ? new Date(mod.time_created * 1000) : undefined,
				dateUpdated: mod.time_updated ? new Date(mod.time_updated * 1000) : undefined,
				workshopDetails: mod,
				installStatus: "not_installed"
			}
		})

		const totalSize = processedMods.reduce((sum, mod) => sum + (mod.size || 0), 0)

		return {
			...result,
			modsDetails: processedMods,
			totalSize
		}
	} catch (error) {
		logger.system.error(`Error parsing collection ${collectionId}: ${error}`)
		return {
			error: error instanceof Error ? error.message : String(error)
		}
	}
}

/**
 * Gets complete collection data including all mod details
 * @param collectionId ID of the collection
 */
export async function getCompleteCollectionData(
	collectionId: string
): Promise<CompleteCollectionResult> {
	return parseCollection(collectionId, true) as Promise<CompleteCollectionResult>
}

/**
 * Get the path where workshop items are downloaded
 * @param workshopId ID of the workshop item
 * @returns Path to the workshop item directory
 */
export function getWorkshopItemPath(workshopId: string): string {
	const steamCmdPath = getSteamCmdPath()
	return join(steamCmdPath, "steamapps", "workshop", "content", PZ_APP_ID, workshopId)
}

/**
 * Get paths to all mod folders inside a workshop item
 * @param workshopId ID of the workshop item
 * @returns Array of paths to mod folders
 */
export async function getWorkshopItemModPaths(workshopId: string): Promise<string[]> {
	const itemPath = getWorkshopItemPath(workshopId)

	if (!existsSync(itemPath)) {
		logger.system.warn(`Workshop item directory not found: ${itemPath}`)
		return []
	}

	try {
		const modsPath = join(itemPath, "mods")
		if (existsSync(modsPath)) {
			const entries = await fs.readdir(modsPath, { withFileTypes: true })
			return entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => join(modsPath, entry.name))
		}

		const mainDirFiles = await fs.readdir(itemPath)
		if (mainDirFiles.includes("mod.info")) {
			return [itemPath]
		}

		logger.system.warn(`No mod folders found in workshop item ${workshopId}`)
		return []
	} catch (error) {
		logger.system.error(`Error getting mod paths for workshop item ${workshopId}: ${error}`)
		return []
	}
}

/**
 * Gets detailed information about a Workshop item
 * @param workshopId ID of the Workshop item
 * @returns Detailed information about the Workshop item or null if not found
 */
export async function getWorkshopItemDetails(workshopId: string): Promise<ProcessedMod | null> {
	try {
		const itemDetails = await getPublishedFileDetails(workshopId)
		if (!itemDetails) {
			return null
		}

		const processedMod: ProcessedMod = {
			id: itemDetails.publishedfileid,
			workshopId: itemDetails.publishedfileid,
			name: itemDetails.title,
			description: itemDetails.description,
			author: itemDetails.creator,
			tags: itemDetails.tags?.map((tag) => tag.tag) || [],
			thumbnailUrl: itemDetails.preview_url,
			downloadUrl: itemDetails.file_url,
			isLocal: false,
			isWorkshop: true,
			isEnabled: false,
			isCompatible: true,
			dependencies: [],
			incompatibilities: [],
			loadOrder: 0,
			size: Number.parseInt(itemDetails.file_size, 10) || 0,
			dateCreated: itemDetails.time_created ? new Date(itemDetails.time_created * 1000) : undefined,
			dateUpdated: itemDetails.time_updated ? new Date(itemDetails.time_updated * 1000) : undefined,
			workshopDetails: itemDetails,
			installStatus: existsSync(getWorkshopItemPath(workshopId)) ? "installed" : "not_installed"
		}

		return processedMod
	} catch (error) {
		logger.system.error(`Error getting Workshop item details for ${workshopId}: ${error}`)
		return null
	}
}
