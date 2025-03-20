import { join } from "node:path"
import { getAppDataPath } from "@main/services"
import { migrateInstancesPath, updateInstancesData } from "@main/stores/instances-store"
import { getAppSettings, updateAppSettings } from "@main/stores/settings-store"
import logger from "@main/utils/logger"
import { getMainWindow } from "@main/window/main-window"
import { ipcMain } from "electron"

/**
 * Register settings IPC handlers
 * @returns Cleanup function
 */
export function registerSettingsHandlers(): () => void {
	ipcMain.handle("settings:get", () => {
		return getAppSettings()
	})

	ipcMain.handle("settings:set", async (_, settings) => {
		updateAppSettings(settings)

		if (settings.instancesDirectory !== undefined) {
			await updateInstancesData({
				instancesDirectory: settings.instancesDirectory
			})
		}

		broadcastSettings()

		return true
	})

	ipcMain.handle("settings:migrateInstances", async (_, newPath) => {
		try {
			await migrateInstancesPath(newPath)

			broadcastSettings()

			return true
		} catch (error) {
			logger.main.error(`Error during instance migration: ${error}`)
			return false
		}
	})

	ipcMain.handle("settings:getDefaultPath", () => {
		return join(getAppDataPath(), "instances")
	})

	return () => {
		ipcMain.removeHandler("settings:get")
		ipcMain.removeHandler("settings:set")
		ipcMain.removeHandler("settings:migrateInstances")
		ipcMain.removeHandler("settings:getDefaultPath")
	}
}

/**
 * Broadcast settings changes to all windows
 * @param settings Partial settings that were changed
 */
export function broadcastSettings(): void {
	const mainWindow = getMainWindow()
	if (mainWindow) {
		const settings = getAppSettings()
		mainWindow.webContents.send("settings:changed", settings)
	}
}
