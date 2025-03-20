import { getMainWindow } from "@main/window/main-window"
import { ipcMain } from "electron"

/**
 * Register window control IPC handlers
 * @returns void
 */
export function registerWindowHandlers(): () => void {
	ipcMain.on("window:minimize", () => {
		const win = getMainWindow()
		if (win) win.minimize()
	})

	ipcMain.on("window:maximize", () => {
		const win = getMainWindow()
		if (win) {
			if (win.isMaximized()) {
				win.restore()
			} else {
				win.maximize()
			}
		}
	})

	ipcMain.on("window:close", () => {
		const win = getMainWindow()
		if (win) win.close()
	})

	ipcMain.handle("window:getState", () => {
		const win = getMainWindow()
		return win ? win.isMaximized() : false
	})

	return () => {
		ipcMain.removeAllListeners("window:minimize")
		ipcMain.removeAllListeners("window:maximize")
		ipcMain.removeAllListeners("window:close")
		ipcMain.removeHandler("window:getState")
	}
}
