import { gameService } from "@main/services"
import { ipcMain } from "electron"

/**
 * Register game-related IPC handlers
 * @returns Cleanup function
 */
export function registerGameHandlers(): () => void {
	ipcMain.handle("game:detectPath", async () => {
		return gameService.getGamePath(true)
	})

	ipcMain.handle("game:verifyPath", async (_, path: string) => {
		return gameService.validatePath(path)
	})

	ipcMain.handle("game:getRunningInstances", () => {
		return gameService.getRunningInstances()
	})

	ipcMain.handle("game:isInstanceRunning", (_, instanceId: string) => {
		return gameService.isInstanceRunning(instanceId)
	})

	return () => {
		ipcMain.removeHandler("game:detectPath")
		ipcMain.removeHandler("game:verifyPath")
		ipcMain.removeHandler("game:getRunningInstances")
		ipcMain.removeHandler("game:isInstanceRunning")
	}
}
