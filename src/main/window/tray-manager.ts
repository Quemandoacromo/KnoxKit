import { Menu, Tray, app } from "electron"
import icon from "../../../resources/icons/32x32.png?asset"
import { getMainWindow } from "./main-window"

let trayInstance: Tray | null = null

/**
 * Initialize the system tray
 */
export function initTray(): void {
	if (trayInstance) return

	trayInstance = new Tray(icon)

	trayInstance.setToolTip("KnoxKit")
	updateTrayMenu()

	trayInstance.on("click", restoreMainWindow)
}

/**
 * Update the tray context menu
 */
export function updateTrayMenu(instanceRunning = false): void {
	if (!trayInstance) return

	const contextMenu = Menu.buildFromTemplate([
		{
			label: instanceRunning ? "Game is running" : "KnoxKit",
			enabled: false
		},
		{ type: "separator" },
		{
			label: "Show",
			click: restoreMainWindow
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => app.quit()
		}
	])

	trayInstance.setContextMenu(contextMenu)
}

/**
 * Show the main window and focus it
 */
export function restoreMainWindow(): void {
	const mainWindow = getMainWindow()
	if (mainWindow) {
		if (mainWindow.isMinimized()) mainWindow.restore()
		mainWindow.show()
		mainWindow.focus()
	}
}

/**
 * Minimize the main window to tray
 */
export function minimizeToTray(): void {
	const mainWindow = getMainWindow()
	if (mainWindow) {
		mainWindow.hide()
		updateTrayMenu(true)
	}
}

/**
 * Cleanup the tray instance
 */
export function destroyTray(): void {
	if (trayInstance) {
		trayInstance.destroy()
		trayInstance = null
	}
}
