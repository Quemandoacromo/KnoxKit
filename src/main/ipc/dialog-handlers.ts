import { getMainWindow } from "@main/window/main-window"
import { dialog, ipcMain } from "electron"

/**
 * Register dialog IPC handlers
 * @returns Cleanup function
 */
export function registerDialogHandlers(): () => void {
	ipcMain.handle("dialog:openDirectory", async (_, options = {}) => {
		const window = getMainWindow()
		if (!window) {
			return { canceled: true, filePaths: [] }
		}

		return dialog.showOpenDialog(window, {
			properties: ["openDirectory"],
			...options
		})
	})

	ipcMain.handle("dialog:selectDirectory", async (_, options = {}) => {
		const window = getMainWindow()
		if (!window) {
			return { canceled: true, filePaths: [] }
		}

		return dialog.showOpenDialog(window, {
			properties: ["openDirectory", "createDirectory"],
			...options
		})
	})

	return () => {
		ipcMain.removeHandler("dialog:openDirectory")
		ipcMain.removeHandler("dialog:selectDirectory")
	}
}
