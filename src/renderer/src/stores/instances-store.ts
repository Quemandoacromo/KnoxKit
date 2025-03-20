import { logger } from "@renderer/lib/utils"
import type { GameInstance, LaunchOptions } from "@shared/types/instances"
import type { IpcRendererEvent } from "electron"
import { atom, map } from "nanostores"

export const instancesStore = map<Record<string, GameInstance>>({})
export const activeInstanceIdStore = atom<string | null>(null)

let initialized = false

/**
 * Gets an array with all instances
 */
export function getInstancesArray(): GameInstance[] {
	return Object.values(instancesStore.get())
}

/**
 * Gets a specific instance by ID
 */
export function getInstance(id: string): GameInstance | undefined {
	return instancesStore.get()[id]
}

/**
 * Checks if instances have been initialized
 */
export function isInitialized(): boolean {
	return initialized
}

/**
 * Initializes instances from the main process
 */
export async function initInstances(): Promise<void> {
	try {
		if (initialized) return

		const instances = await window.api.instances.getAll()

		const instancesObj: Record<string, GameInstance> = {}
		for (const instance of instances) {
			instancesObj[instance.id] = instance
		}

		instancesStore.set(instancesObj)
		initialized = true

		if (window.api.instances.subscribeToUpdates) {
			window.api.instances.subscribeToUpdates()
		}

		logger.info(`Instances initialized: ${instances.length}`)
	} catch (error) {
		logger.error(`Error initializing instances: ${error}`)
		throw error
	}
}

/**
 * Updates an instance both in the local store and in the backend
 */
export async function updateInstance(
	id: string,
	updates: Partial<GameInstance>
): Promise<GameInstance | null> {
	try {
		const currentInstance = instancesStore.get()[id]

		if (currentInstance) {
			instancesStore.setKey(id, {
				...currentInstance,
				...updates
			})

			const success = await window.api.instances.update(id, updates)

			if (!success) {
				logger.error("Error updating instance in backend, reverting UI changes")

				const refreshedInstances = await window.api.instances.getAll()
				const originalInstance = refreshedInstances.find((i) => i.id === id)

				if (originalInstance) {
					instancesStore.setKey(id, originalInstance)
				}

				return null
			}

			return instancesStore.get()[id]
		}

		return null
	} catch (error) {
		logger.error(`Error updating instance ${id}: ${error}`)
		return null
	}
}

/**
 * Creates a new instance
 */
export async function createInstance(
	instanceData: Omit<GameInstance, "id" | "createdAt" | "lastPlayed" | "playTime">
): Promise<GameInstance | null> {
	try {
		const instance = await window.api.instances.create({
			...instanceData,
			modIds: instanceData.modIds || []
		})

		instancesStore.setKey(instance.id, instance)

		return instance
	} catch (error) {
		logger.error(`Error creating instance: ${error}`)
		return null
	}
}

/**
 * Deletes an instance
 */
export async function deleteInstance(id: string): Promise<boolean> {
	try {
		const success = await window.api.instances.delete(id)

		if (success) {
			const current = { ...instancesStore.get() }
			delete current[id]
			instancesStore.set(current)

			if (activeInstanceIdStore.get() === id) {
				activeInstanceIdStore.set(null)
			}
		}

		return success
	} catch (error) {
		logger.error(`Error deleting instance ${id}: ${error}`)
		return false
	}
}

/**
 * Launches a game instance
 */
export async function launchInstance(id: string, options: LaunchOptions = {}): Promise<boolean> {
	try {
		const current = instancesStore.get()[id]
		if (current) {
			instancesStore.setKey(id, {
				...current,
				status: "Running",
				lastPlayed: new Date()
			})

			activeInstanceIdStore.set(id)
		}

		const success = await window.api.instances.launch(id, options)

		if (!success && current) {
			instancesStore.setKey(id, {
				...current,
				status: "Ready"
			})
		}

		return success
	} catch (error) {
		logger.error(`Error launching instance ${id}: ${error}`)

		const current = instancesStore.get()[id]
		if (current) {
			instancesStore.setKey(id, {
				...current,
				status: "Ready"
			})
		}

		return false
	}
}

/**
 * Sets the active instance
 */
export function setActiveInstance(id: string | null): void {
	activeInstanceIdStore.set(id)
}

/**
 * Listens for instance changes from the main process
 */
export function listenToInstancesChanges(): () => void {
	if (typeof window === "undefined" || !window.electron) {
		return () => {}
	}

	if (window.api.instances.onInstancesChanged) {
		const handleInstancesChanged = (_event: IpcRendererEvent, instances: GameInstance[]) => {
			logger.info(`Instances updated from main process: ${instances.length}`)

			const instancesObj: Record<string, GameInstance> = {}
			for (const instance of instances) {
				instancesObj[instance.id] = instance
			}

			instancesStore.set(instancesObj)

			if (!initialized) {
				initialized = true
			}
		}

		window.api.instances.onInstancesChanged(handleInstancesChanged)

		if (window.api.instances.subscribeToUpdates) {
			window.api.instances.subscribeToUpdates()
		}

		return () => {
			if (window.api.instances.offInstancesChanged) {
				window.api.instances.offInstancesChanged(handleInstancesChanged)
			}
		}
	}

	const unsubscribe = window.electron.ipcRenderer.on(
		"instances:changed",
		(_, instances: GameInstance[]) => {
			logger.info(`Instances updated from main process: ${instances.length}`)

			const instancesObj: Record<string, GameInstance> = {}
			for (const instance of instances) {
				instancesObj[instance.id] = instance
			}

			instancesStore.set(instancesObj)

			if (!initialized) {
				initialized = true
			}
		}
	)

	return unsubscribe
}

const unsubscribeFunction = listenToInstancesChanges()
export const cleanup = unsubscribeFunction
