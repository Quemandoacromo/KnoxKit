import { gameService } from "@main/services"
import {
	addInstance,
	deleteInstanceDirectory,
	getInstancePath,
	getInstancesData,
	updateInstanceData,
	updateInstancesData
} from "@main/stores/instances-store"
import { getAppSettings } from "@main/stores/settings-store"
import logger from "@main/utils/logger"
import { getMainWindow } from "@main/window/main-window"
import type { GameInstance, LaunchOptions } from "@shared/types/instances"
import { ipcMain, shell } from "electron"

const activeLaunches = new Set<string>()

/**
 * Register instance IPC handlers
 * @returns Cleanup function
 */
export function registerInstanceHandlers(): () => void {
	ipcMain.handle("instances:getAll", async (): Promise<GameInstance[]> => {
		const data = await getInstancesData()

		for (const instance of data.instances) {
			if (gameService.isInstanceRunning(instance.id)) {
				instance.status = "Running"
			}
		}

		return data.instances
	})

	ipcMain.handle(
		"instances:create",
		async (
			_,
			instanceData: Omit<GameInstance, "id" | "createdAt" | "lastPlayed" | "playTime">
		): Promise<GameInstance> => {
			const newInstance = await addInstance({
				...instanceData,
				playTime: 0,
				lastPlayed: new Date(),
				status: instanceData.status || "Ready"
			})

			logger.instances.info(
				`Created new instance: ${newInstance.name} (${newInstance.id}) with status ${newInstance.status}`
			)

			broadcastInstancesChange()

			return newInstance
		}
	)

	ipcMain.handle("instances:update", async (_, id: string, updates: Partial<GameInstance>) => {
		await updateInstanceData(id, updates)

		broadcastInstancesChange()

		return true
	})

	ipcMain.handle("instances:delete", async (_, id: string) => {
		const data = await getInstancesData()

		if (gameService.isInstanceRunning(id)) {
			throw new Error("Cannot delete instance while it's running")
		}

		const instanceToDelete = data.instances.find((instance) => instance.id === id)
		if (!instanceToDelete) {
			throw new Error(`Instance with ID ${id} not found`)
		}

		try {
			await deleteInstanceDirectory(id)

			const newInstances = data.instances.filter((instance) => instance.id !== id)
			await updateInstancesData({ instances: newInstances })

			broadcastInstancesChange()

			return true
		} catch (error) {
			logger.instances.error(
				`Error deleting instance directory for ${instanceToDelete.name}: ${error}`
			)
			throw error
		}
	})

	ipcMain.handle("instances:launch", async (_, id: string, options: LaunchOptions = {}) => {
		if (activeLaunches.has(id) || gameService.isInstanceRunning(id)) {
			logger.instances.info(
				`Instance ${id} is already being launched or running, ignoring duplicate request`
			)
			return false
		}

		activeLaunches.add(id)

		try {
			const data = await getInstancesData()
			const instance = data.instances.find((instance) => instance.id === id)

			if (!instance) {
				throw new Error(`Instance with ID ${id} not found`)
			}

			const settings = getAppSettings()
			if (!settings.gameDirectory) {
				throw new Error("Game directory not set in settings")
			}

			await updateInstanceData(id, { status: "Running" })

			await gameService.launchInstance(instance, options)

			broadcastInstancesChange()

			return true
		} catch (error) {
			logger.instances.error(`Error launching instance ${id}: ${error}`)

			await updateInstanceData(id, { status: "Error" })

			broadcastInstancesChange()

			throw error
		} finally {
			setTimeout(() => {
				activeLaunches.delete(id)
			}, 2000)
		}
	})

	ipcMain.handle("instances:openDirectory", async (_, id: string) => {
		try {
			const instancePath = await getInstancePath(id)
			await shell.openPath(instancePath)
			logger.instances.info(`Opened instance directory: ${instancePath}`)
			return true
		} catch (error) {
			logger.instances.error(`Error opening instance directory for ${id}: ${error}`)
			return false
		}
	})

	ipcMain.on("instances:subscribe", (event) => {
		logger.instances.info("Renderer process subscribed to instance updates")

		getInstancesData().then((data) => {
			for (const instance of data.instances) {
				if (gameService.isInstanceRunning(instance.id)) {
					instance.status = "Running"
				}
			}
			event.sender.send("instances:changed", data.instances)
		})
	})

	gameService.onEvent("game:closed", async ({ instanceId }) => {
		logger.instances.info(`Game closed event for instance ${instanceId}`)

		await updateInstanceData(instanceId, {
			status: "Ready"
		})

		broadcastInstancesChange()
	})

	return () => {
		ipcMain.removeHandler("instances:getAll")
		ipcMain.removeHandler("instances:create")
		ipcMain.removeHandler("instances:update")
		ipcMain.removeHandler("instances:delete")
		ipcMain.removeHandler("instances:launch")
		ipcMain.removeHandler("instances:openDirectory")
		ipcMain.removeAllListeners("instances:subscribe")
	}
}

/**
 * Broadcast instances changes to all windows
 */
export function broadcastInstancesChange(): void {
	const mainWindow = getMainWindow()
	if (mainWindow) {
		getInstancesData().then((data) => {
			let modified = false
			for (const instance of data.instances) {
				const isRunning = gameService.isInstanceRunning(instance.id)
				if (isRunning && instance.status !== "Running") {
					instance.status = "Running"
					modified = true
				} else if (!isRunning && instance.status === "Running") {
					instance.status = "Ready"
					modified = true
				}
			}

			logger.instances.info(`Broadcasting ${data.instances.length} instances to renderer`)

			if (modified) {
				updateInstancesData({ instances: data.instances }).then(() => {
					mainWindow.webContents.send("instances:changed", data.instances)
				})
			} else {
				mainWindow.webContents.send("instances:changed", data.instances)
			}
		})
	}
}
