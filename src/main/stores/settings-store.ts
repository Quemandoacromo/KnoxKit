import { Conf } from "electron-conf"
import type { AppSettings } from "@shared/types/settings"
import { getAppDataPath } from "@main/services"
import path from "node:path"

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
		language: "es",
		steamcmdPath: "",
		lastSyncDate: null,
		setupComplete: false,
		instancesDirectory: defaultInstancesDir
	}
})

export const getAppSettings = () => appStore.store
export const updateAppSettings = (settings: Partial<AppSettings>) => appStore.set(settings)

export default appStore
