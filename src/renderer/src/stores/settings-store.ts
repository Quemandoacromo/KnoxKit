import { logger } from "@renderer/lib/utils"
import type { AppSettings } from "@shared/types/settings"
import { atom } from "nanostores"

const defaultSettings: AppSettings = {
	theme: "dark",
	gameDirectory: "",
	notifications: true,
	autoUpdate: true,
	language: "es",
	steamcmdPath: "",
	lastSyncDate: null,
	setupComplete: false,
	instancesDirectory: null,
	minimizeToTray: true
}

export const settingsStore = atom<AppSettings>(defaultSettings)

let initialized = false

export async function initSettings(): Promise<void> {
	if (initialized) return

	try {
		if (window.api?.settings) {
			const settings = await window.api.settings.get()
			settingsStore.set(settings)
			logger.info(`Settings initialized from main process: ${settings}`)
			initialized = true
		}
	} catch (error) {
		logger.error(`Failed to initialize settings: ${error}`)
	}
}

export async function updateSetting<K extends keyof AppSettings>(
	key: K,
	value: AppSettings[K]
): Promise<void> {
	try {
		settingsStore.set({
			...settingsStore.get(),
			[key]: value
		})

		if (window.api?.settings) {
			await window.api.settings.set({ [key]: value })
			logger.info(`Setting updated: ${String(key)} = ${value}`)
		}
	} catch (error) {
		logger.error(`Failed to update setting ${String(key)}: ${error}`)
	}
}

export function listenToSettingsChanges(): () => void {
	if (typeof window !== "undefined" && window.electron?.ipcRenderer) {
		const removeListener = window.electron.ipcRenderer.on(
			"settings:changed",
			(_, updatedSettings: AppSettings) => {
				logger.info(`Received settings update from main process: ${updatedSettings}`)
				settingsStore.set(updatedSettings)
			}
		)

		return () => {
			if (removeListener) removeListener()
		}
	}
	return () => {
		// No cleanup needed in this case
	}
}
