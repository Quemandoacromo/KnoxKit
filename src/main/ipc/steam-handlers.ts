import {
	ensureSteamCmdInstalled,
	getCompleteCollectionData,
	isSteamCmdAvailable
} from "@main/services/steam"
import { getWorkshopItemDetails } from "@main/services/steam"
import logger from "@main/utils/logger"
import type { ProcessedMod } from "@shared/types/workshop"
import { ipcMain } from "electron"

/**
 * Register Steam-related IPC handlers
 * @returns Cleanup function
 */
export function registerSteamHandlers(): () => void {
	ipcMain.handle("workshop:check-steamcmd", async () => {
		try {
			const isAvailable = await isSteamCmdAvailable()
			logger.system.info(
				`SteamCMD availability check: ${isAvailable ? "available" : "not available"}`
			)
			return isAvailable
		} catch (error) {
			logger.system.error(`Error checking SteamCMD availability: ${error}`)
			return false
		}
	})

	ipcMain.handle("workshop:install-steamcmd", async () => {
		try {
			logger.system.info("Installing SteamCMD...")
			const result = await ensureSteamCmdInstalled()
			logger.system.info(`SteamCMD installation ${result ? "completed successfully" : "failed"}`)
			return result
		} catch (error) {
			logger.system.error(`Error installing SteamCMD: ${error}`)
			return false
		}
	})

	ipcMain.handle("workshop:get-collection-details", async (_event, collectionId: string) => {
		return await getCompleteCollectionData(collectionId)
	})

	ipcMain.handle(
		"steam:getModDetails",
		async (_event, modId: string): Promise<ProcessedMod | null> => {
			try {
				const result = await getWorkshopItemDetails(modId)
				return result
			} catch (error) {
				logger.system.error(`Error getting mod details: ${error}`)
				return null
			}
		}
	)

	logger.system.info("Steam IPC handlers registered")

	return () => {
		ipcMain.removeHandler("workshop:check-steamcmd")
		ipcMain.removeHandler("workshop:install-steamcmd")
		ipcMain.removeHandler("workshop:get-collection-details")
		ipcMain.removeHandler("steam:getModDetails")
	}
}
