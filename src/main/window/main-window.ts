import { join } from "node:path"
import { is } from "@electron-toolkit/utils"
import {
	getIsMaximized,
	getWindowBounds,
	saveIsMaximized,
	saveWindowBounds
} from "@main/stores/window-store"
import { BrowserWindow, shell } from "electron"
import icon from "../../../resources/icons/32x32.png?asset"

let mainWindow: BrowserWindow | null = null

/**
 * Creates the main application window
 */
export function createMainWindow(): BrowserWindow {
	const { width, height, x, y } = getWindowBounds()
	const isMaximized = getIsMaximized()

	mainWindow = new BrowserWindow({
		width,
		height,
		x: x || undefined,
		y: y || undefined,
		minWidth: 1024,
		minHeight: 540,
		show: false,
		title: "KnoxKit - Project Zomboid Mod Manager",
		frame: false,
		titleBarStyle: process.platform === "linux" ? "default" : "hidden",
		trafficLightPosition: { x: 16, y: 16 },
		backgroundColor: "#1a1b23",
		icon,
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			sandbox: false,
			contextIsolation: true,
			webSecurity: true,
			webviewTag: false
		}
	})

	const saveWindowState = () => {
		if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
			saveWindowBounds(mainWindow.getBounds())
		}
		if (mainWindow) saveIsMaximized(mainWindow.isMaximized())
	}

	mainWindow.on("resize", saveWindowState)
	mainWindow.on("move", saveWindowState)
	mainWindow.on("close", saveWindowState)

	mainWindow.on("maximize", () => {
		if (mainWindow) mainWindow.webContents.send("window-state-change", true)
	})

	mainWindow.on("unmaximize", () => {
		if (mainWindow) mainWindow.webContents.send("window-state-change", false)
	})

	if (isMaximized) {
		mainWindow.maximize()
	}

	mainWindow.on("ready-to-show", () => {
		mainWindow?.show()
	})

	mainWindow.webContents.setWindowOpenHandler((details) => {
		shell.openExternal(details.url)
		return { action: "deny" }
	})

	if (is.dev && process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
		mainWindow.webContents.openDevTools()
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
	}

	return mainWindow
}

/**
 * Get the main window instance
 * @returns BrowserWindow | null
 */
export function getMainWindow(): BrowserWindow | null {
	return mainWindow
}
