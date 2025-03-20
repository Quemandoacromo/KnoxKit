import path from "node:path"
import { getAppDataPath } from "@main/services"
import type { AppSettings } from "@shared/types/settings"
import { Conf } from "electron-conf"

const appDataPath = getAppDataPath()
const defaultInstancesDir = path.join(appDataPath, "instances")

const appStore = new Conf<AppSettings>({
	name: "settingss",
	defaults: {
		theme: "dark",
		gameDirectory: "",
		notifications: true,
		autoUpdate: true,
		minimizeToTray: true,
		language: "en",
		steamcmdPath: "",
		lastSyncDate: null,
		setupComplete: false,
		instancesDirectory: defaultInstancesDir
	}
})

export const getAppSettings = () => appStore.store
export const updateAppSettings = (settings: Partial<AppSettings>) => appStore.set(settings)

export default appStore
