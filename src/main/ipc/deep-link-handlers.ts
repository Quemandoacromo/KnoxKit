import logger from "@main/utils/logger"
import { createMainWindow, getMainWindow } from "@main/window/main-window"
import { app } from "electron"

/**
 * Handle knoxkit:// protocol URLs
 */
export function handleDeepLink(url: string): void {
	if (!url.startsWith("knoxkit://")) {
		logger.system.warn(`Invalid deep link protocol: ${url}`)
		return
	}

	logger.system.info(`Handling deep link: ${url}`)

	try {
		const urlObj = new URL(url)
		const command = urlObj.hostname

		switch (command) {
			case "import-mod":
				handleImportMod(urlObj)
				break
			default:
				logger.system.warn(`Unknown deep link command: ${command}`)
		}
	} catch (error) {
		logger.system.error(`Error handling deep link: ${error}`)
	}
}

/**
 * Handle mod import from deep link
 */
function handleImportMod(urlObj: URL): void {
	const encodedUrl = urlObj.searchParams.get("url")

	if (!encodedUrl) {
		logger.system.warn("No URL provided in import-mod deep link")
		return
	}

	try {
		const modUrl = decodeURIComponent(encodedUrl)
		logger.system.info(`Preparing to import mod from: ${modUrl}`)

		const workshopIdMatch = modUrl.match(/\?id=(\d+)/) || modUrl.match(/\/(\d+)/)
		if (!workshopIdMatch || !workshopIdMatch[1]) {
			logger.system.warn(`Could not extract workshop ID from URL: ${modUrl}`)
			return
		}

		const workshopId = workshopIdMatch[1]
		logger.system.info(`Extracted workshop ID: ${workshopId}`)

		const mainWindow = getMainWindow() || createMainWindow()
		mainWindow.focus()

		setTimeout(() => {
			mainWindow.webContents.send("deep-link:import-mod", {
				workshopId,
				url: modUrl
			})
		}, 1000)
	} catch (error) {
		logger.system.error(`Error processing import mod URL: ${error}`)
	}
}

/**
 * Register the app as a handler for the knoxkit:// protocol
 */
export function registerDeepLinkProtocol(): void {
	if (process.defaultApp) {
		if (process.argv.length >= 2) {
			app.setAsDefaultProtocolClient("knoxkit", process.execPath, [process.argv[1]])
		}
	} else {
		app.setAsDefaultProtocolClient("knoxkit")
	}

	logger.system.info("Deep link protocol handler registered for knoxkit://")
}
