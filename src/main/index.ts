import { electronApp, optimizer } from "@electron-toolkit/utils"
import { registerIpcHandlers } from "@main/ipc/index"
import { getRunningInstances } from "@main/services"
import logger from "@main/utils/logger"
import { createMainWindow } from "@main/window/main-window"
import { destroyTray, initTray } from "@main/window/tray-manager"
import { BrowserWindow, app } from "electron"
import { handleDeepLink } from "./ipc/protocol-handlers"

let deeplinkingUrl: string | null = null

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
	app.quit()
} else {
	app.on("second-instance", (_, commandLine) => {
		const mainWindow = BrowserWindow.getAllWindows()[0]
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore()
			mainWindow.focus()
		}

		const deepLink = commandLine.find((arg) => arg.startsWith("knoxkit://"))
		if (deepLink) {
			handleDeepLink(deepLink)
		}
	})
}

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		const deepLink = process.argv.find((arg) => arg.startsWith("knoxkit://"))
		if (deepLink) {
			deeplinkingUrl = deepLink
		}
	}
}

app.whenReady().then(() => {
	electronApp.setAppUserModelId("com.knoxkit.app")

	logger.main.info("Application starting up...")

	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window)
	})

	registerIpcHandlers()
	createMainWindow()
	initTray()

	if (deeplinkingUrl) {
		handleDeepLink(deeplinkingUrl)
		deeplinkingUrl = null
	}

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
	})
})

app.on("open-url", (event, url) => {
	event.preventDefault()
	handleDeepLink(url)
})

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		try {
			if (getRunningInstances().length > 0) {
				return
			}
			app.quit()
		} catch (error) {
			logger.main.error(`Error checking game instances:${error}`)
			app.quit()
		}
	}
})

app.on("quit", () => {
	destroyTray()
})
