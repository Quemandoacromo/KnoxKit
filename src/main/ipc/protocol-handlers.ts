import fs from "node:fs"
import path from "node:path"
import logger from "@main/utils/logger"
import { createMainWindow, getMainWindow } from "@main/window/main-window"
import { app, protocol } from "electron/main"

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

		const mainWindow = getMainWindow() || createMainWindow()
		mainWindow.focus()

		mainWindow.webContents.send("deep-link:import-mod", {
			url: modUrl
		})
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

/**
 * Register protocol handlers
 * @returns Cleanup function
 */
export function registerProtocolHandlers(): () => void {
	protocol.handle("knoxmod", (request) => {
		try {
			const url = new URL(request.url)

			let filePath = decodeURIComponent(url.pathname)

			if (filePath.startsWith("/")) {
				filePath = filePath.substring(1)
			}

			logger.main.debug(`Loading file from: ${filePath}`)

			if (!fs.existsSync(filePath)) {
				logger.main.warn(`File does not exist: ${filePath}`)
				return new Response("File not found", { status: 404 })
			}

			const data = fs.readFileSync(filePath)
			const mimeType = path.extname(filePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg"

			return new Response(data, {
				headers: { "Content-Type": mimeType }
			})
		} catch (error) {
			logger.main.error(`Protocol handler error: ${error}`, { error })
			const errorMessage = error instanceof Error ? error.message : String(error)
			return new Response(`Error loading file: ${errorMessage}`, { status: 500 })
		}
	})

	registerDeepLinkProtocol()

	return () => {
		protocol.unhandle("knoxmod")
		logger.system.debug("Protocol handlers unregistered")
	}
}
