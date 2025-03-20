import { electronAPI } from "@electron-toolkit/preload"
import { contextBridge, ipcRenderer } from "electron"
import { exposeLogger } from "electron-winston/preload"

exposeLogger()

// Custom APIs for renderer
const api = {
	on: (channel: string, callback: (...args: any[]) => void) => {
		const validChannels = ["deep-link:import-mod"]
		if (validChannels.includes(channel)) {
			ipcRenderer.on(channel, callback)
		}
	},
	off: (channel: string, callback: (...args: any[]) => void) => {
		const validChannels = ["deep-link:import-mod"]
		if (validChannels.includes(channel)) {
			ipcRenderer.removeListener(channel, callback)
		}
	},

	dialog: {
		openDirectory: (options) => ipcRenderer.invoke("dialog:openDirectory", options),
		selectDirectory: (options) => ipcRenderer.invoke("dialog:selectDirectory", options)
	},
	downloads: {
		cancel: (id) => ipcRenderer.invoke("downloads:cancel", id),
		cleanup: (maxAgeMs) => ipcRenderer.invoke("downloads:cleanup", maxAgeMs),
		clearFinished: () => ipcRenderer.invoke("downloads:clearFinished"),
		getAll: () => ipcRenderer.invoke("downloads:getAll"),
		getStats: () => ipcRenderer.invoke("downloads:getStats"),
		pause: (id) => ipcRenderer.invoke("downloads:pause", id),
		resume: (id) => ipcRenderer.invoke("downloads:resume", id),
		retry: (id) => ipcRenderer.invoke("downloads:retry", id),
		queueWorkshopItem: (options) => ipcRenderer.invoke("downloads:queueWorkshopItem", options),
		queueCollection: (collection, instanceId) =>
			ipcRenderer.invoke("downloads:queueCollection", collection, instanceId),

		onUpdated: (callback) => ipcRenderer.on("download:updated", callback),
		onAdded: (callback) => ipcRenderer.on("download:added", callback),
		offUpdated: (callback) => ipcRenderer.removeListener("download:updated", callback),
		offAdded: (callback) => ipcRenderer.removeListener("download:added", callback)
	},
	filesystem: {
		isDirectoryWritable: (path) => ipcRenderer.invoke("filesystem:isDirectoryWritable", path)
	},
	game: {
		detectPath: () => ipcRenderer.invoke("game:detectPath"),
		verifyPath: (path) => ipcRenderer.invoke("game:verifyPath", path),
		getRunningInstances: () => ipcRenderer.invoke("game:getRunningInstances"),
		isInstanceRunning: (instanceId) => ipcRenderer.invoke("game:isInstanceRunning", instanceId)
	},
	instances: {
		create: (instanceData) => ipcRenderer.invoke("instances:create", instanceData),
		delete: (id) => ipcRenderer.invoke("instances:delete", id),
		getAll: () => ipcRenderer.invoke("instances:getAll"),
		launch: (id, options) => ipcRenderer.invoke("instances:launch", id, options),
		update: (id, updates) => ipcRenderer.invoke("instances:update", id, updates),
		openDirectory: (id) => ipcRenderer.invoke("instances:openDirectory", id),

		subscribeToUpdates: () => ipcRenderer.send("instances:subscribe"),
		onInstancesChanged: (callback) => ipcRenderer.on("instances:changed", callback),
		offInstancesChanged: (callback) => ipcRenderer.removeListener("instances:changed", callback)
	},

	settings: {
		get: () => ipcRenderer.invoke("settings:get"),
		getDefaultPath: () => ipcRenderer.invoke("settings:getDefaultPath"),
		migrateInstances: (newPath) => ipcRenderer.invoke("settings:migrateInstances", newPath),
		set: (settings) => ipcRenderer.invoke("settings:set", settings)
	},
	steam: {
		isAvailable: () => ipcRenderer.invoke("workshop:check-steamcmd"),
		install: () => ipcRenderer.invoke("workshop:install-steamcmd"),
		getCollectionDetails: (collectionId) =>
			ipcRenderer.invoke("workshop:get-collection-details", collectionId),
		getModDetails: (modId: string) => ipcRenderer.invoke("steam:getModDetails", modId)
	},
	system: {
		getMemoryInfo: () => ipcRenderer.invoke("system:getMemoryInfo"),
		getMemoryOptions: () => ipcRenderer.invoke("system:getMemoryOptions"),
		getMemoryWarningLevel: (requestedMemoryMB) =>
			ipcRenderer.invoke("system:getMemoryWarningLevel", requestedMemoryMB),
		getOsInfo: () => ipcRenderer.invoke("system:getOsInfo"),
		getCpuInfo: () => ipcRenderer.invoke("system:getCpuInfo")
	},
	window: {
		close: () => ipcRenderer.send("window:close"),
		getState: () => ipcRenderer.invoke("window:getState"),
		maximize: () => ipcRenderer.send("window:maximize"),
		minimize: () => ipcRenderer.send("window:minimize")
	},
	mods: {
		getForInstance: (instanceId: string) => ipcRenderer.invoke("mods:getForInstance", instanceId),
		toggleMod: (instanceId: string, modId: string, enabled: boolean) =>
			ipcRenderer.invoke("mods:toggleMod", instanceId, modId, enabled),
		uninstallMod: (instanceId: string, modId: string) =>
			ipcRenderer.invoke("mods:uninstallMod", instanceId, modId),
		openWorkshopPage: (workshopId: string) =>
			ipcRenderer.invoke("mods:openWorkshopPage", workshopId)
	},
	convertFilePath: (filePath) => {
		if (!filePath) return filePath

		if (filePath.startsWith("file://")) {
			try {
				let path = filePath.replace(/^file:\/\//, "")

				if (path.match(/^\/[A-Za-z]:/)) {
					path = path.substring(1)
				}

				return `knoxmod:///${encodeURIComponent(path)}`
			} catch (error) {
				console.error("Error converting file path:", error, filePath)
				return filePath
			}
		}
		return filePath
	}
}

// Use `contextBridge` APIs to expose Electron APIs to renderer only if context isolation is enabled
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld("electron", electronAPI)
		contextBridge.exposeInMainWorld("api", api)
	} catch (error) {
		console.error(error)
	}
} else {
	// @ts-ignore (define in dts)
	window.electron = electronAPI
	// @ts-ignore (define in dts)
	window.api = {
		api
	}
}
