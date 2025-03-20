import { logger } from "@renderer/lib/utils"
import { atom } from "nanostores"

export const isMaximizedStore = atom<boolean>(false)

export function initWindowState(): void {
	logger.info("Initializing window state")

	const isElectron =
		typeof window !== "undefined" && "electron" in window && window.electron !== null

	if (isElectron) {
		try {
			window.electron.ipcRenderer.on("window-state-change", (_, maximized: boolean) => {
				logger.info(`Received window-state-change: ${maximized}`)
				isMaximizedStore.set(maximized)
			})

			window.electron.ipcRenderer
				.invoke("window:getState")
				.then((maximized: boolean) => {
					logger.info(`Initial window state: ${maximized}`)
					isMaximizedStore.set(maximized)
				})
				.catch((err) => {
					logger.error(`Error getting window state: ${err}`)
				})
		} catch (error) {
			logger.error(`Error accessing Electron APIs: ${error}`)
			logger.info("Falling back to simulated window state")
		}
	} else {
		logger.info("Not running in Electron environment, window state will be simulated")
	}
}

export function minimizeWindow(): void {
	if (typeof window !== "undefined" && "api" in window && window.api?.window) {
		try {
			window.api.window.minimize()
		} catch (err) {
			logger.error(`Error minimizing window: ${err}`)
		}
	}
}

export function maximizeWindow(): void {
	if (typeof window !== "undefined" && "api" in window && window.api?.window) {
		try {
			window.api.window.maximize()
		} catch (err) {
			logger.error(`Error maximizing window: ${err}`)
			isMaximizedStore.set(!isMaximizedStore.get())
		}
	} else {
		isMaximizedStore.set(!isMaximizedStore.get())
	}
}

export function closeWindow(): void {
	if (typeof window !== "undefined" && "api" in window && window.api?.window) {
		try {
			window.api.window.close()
		} catch (err) {
			logger.error(`Error closing window: ${err}`)
		}
	}
}
