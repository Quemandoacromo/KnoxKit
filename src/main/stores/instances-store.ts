import { cpSync, existsSync, promises as fsPromises } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { dirname, join } from "node:path"
import { ensureAppDataPath } from "@main/services/game"
import logger from "@main/utils/logger"
import type { GameInstance, InstancesState } from "@shared/types/instances"
import { Conf } from "electron-conf"
import { getAppSettings, updateAppSettings } from "./settings-store"

let instancesStore: Conf<InstancesState> | null = null

const initInstancesStore = async () => {
	const appDataPath = await ensureAppDataPath()
	const settings = getAppSettings()
	const instancesPath = settings.instancesDirectory || path.join(appDataPath, "instances")

	try {
		await fs.mkdir(instancesPath, { recursive: true })
	} catch (err) {
		logger.instances.error(`Failed to create instances directory: ${err}`)
	}

	return new Conf<InstancesState>({
		name: "instances-data",
		defaults: {
			instances: [],
			activeInstance: null,
			instancesDirectory: instancesPath
		}
	})
}

export const initStore = async (): Promise<Conf<InstancesState>> => {
	if (!instancesStore) {
		instancesStore = await initInstancesStore()
	}
	return instancesStore
}

export const getInstancesData = async () => {
	const store = await initStore()
	return store.store
}

export const getInstance = async (id: string): Promise<GameInstance | undefined> => {
	const store = await initStore()
	const { instances } = store.store
	return instances.find((instance) => instance.id === id)
}

export const updateInstancesData = async (data: Partial<InstancesState>) => {
	const store = await initStore()
	store.set(data)
}

export const addInstance = async (instance: Omit<GameInstance, "id" | "createdAt">) => {
	const store = await initStore()
	const { instances } = store.store

	const newInstance: GameInstance = {
		...instance,
		id: Date.now().toString(),
		createdAt: new Date()
	}

	store.set({
		instances: [...instances, newInstance]
	})

	try {
		await createInstanceDirectory(newInstance.id, newInstance.name)
		logger.instances.info(`Created directory for new instance: ${newInstance.name}`)
	} catch (error) {
		logger.instances.error(`Failed to create directory for instance ${newInstance.name}: ${error}`)
	}

	return newInstance
}

/**
 * Update a specific instance's data
 * @param id Instance ID
 * @param updates Updates to apply
 */
export async function updateInstanceData(
	id: string,
	updates: Partial<GameInstance>
): Promise<GameInstance | null> {
	const store = await initStore()
	const { instances } = store.store

	const index = instances.findIndex((instance) => instance.id === id)
	if (index === -1) return null

	const updatedInstance = {
		...instances[index],
		...updates
	}

	if (typeof updates.playTime === "number") {
		updatedInstance.playTime = (instances[index].playTime || 0) + updates.playTime
	}

	instances[index] = updatedInstance
	store.set({ instances })

	return updatedInstance
}

/**
 * Create necessary directories for a game instance
 * @param instanceId ID of the instance
 * @param instanceName Name of the instance
 * @returns Path to the instance directory
 */
export async function createInstanceDirectory(
	instanceId: string,
	instanceName: string
): Promise<string> {
	const { instancesDirectory } = await getInstancesData()

	if (!instancesDirectory) {
		throw new Error("Instances directory is not defined in app settings")
	}

	const sanitizedName = instanceName.replace(/[^\w\s-]/gi, "")
	const instancePath = join(instancesDirectory, `${sanitizedName}-${instanceId}`, "Zomboid")

	try {
		await fsPromises.mkdir(instancePath, { recursive: true })

		const subdirs = ["Mods", "Saves", "Sandbox Presets"]
		for (const dir of subdirs) {
			await fsPromises.mkdir(join(instancePath, dir), { recursive: true })
		}

		return instancePath
	} catch (error) {
		logger.instances.error(`Failed to create instance directory for ${instanceName}: ${error}`)
		throw error
	}
}
/**
 * Get the path to an instance directory
 * This is the single source of truth for instance paths
 */
export async function getInstancePath(instanceOrId: GameInstance | string): Promise<string> {
	const instancesData = await getInstancesData()

	let instance: GameInstance | undefined

	if (typeof instanceOrId === "string") {
		instance = instancesData.instances.find((inst) => inst.id === instanceOrId)
		if (!instance) {
			throw new Error(`Instance with ID ${instanceOrId} not found`)
		}
	} else {
		instance = instanceOrId
	}

	const sanitizedName = instance.name.replace(/[^\w\s-]/gi, "")

	if (!instancesData.instancesDirectory) {
		throw new Error("Instances directory is not defined in app settings")
	}

	return join(instancesData.instancesDirectory, `${sanitizedName}-${instance.id}`)
}

/**
 * Delete an instance directory
 * @param id Instance ID
 * @param name Instance name
 */
export async function deleteInstanceDirectory(id: string): Promise<void> {
	try {
		const instancePath = await getInstancePath(id)

		if (existsSync(instancePath)) {
			await fsPromises.rm(instancePath, { recursive: true, force: true })
			logger.instances.info(`Deleted instance directory: ${instancePath}`)
		}
	} catch (error) {
		logger.instances.error(`Error deleting instance directory for ${id}: ${error}`)
		throw error
	}
}

/**
 * Migrate instances to a new directory
 * @param newPath New instances directory path
 */
export async function migrateInstancesPath(newPath: string): Promise<void> {
	logger.instances.info(`Starting migration to new path: ${newPath}`)

	await fsPromises.mkdir(newPath, { recursive: true })

	const instancesData = await getInstancesData()
	const oldInstancesDirectory = instancesData.instancesDirectory

	if (oldInstancesDirectory === newPath) {
		logger.instances.info("New path is same as old path, nothing to do")
		return
	}

	logger.instances.info(`Migrating instances from ${oldInstancesDirectory} to ${newPath}`)

	const instances = instancesData.instances

	let successCount = 0
	for (const instance of instances) {
		const oldInstancePath = await getInstancePath(instance)
		await updateInstancesData({ instancesDirectory: newPath })
		const newInstancePath = await getInstancePath(instance)

		logger.instances.info(
			`Moving instance ${instance.name} from ${oldInstancePath} to ${newInstancePath}`
		)

		if (existsSync(oldInstancePath)) {
			await fsPromises.mkdir(dirname(newInstancePath), { recursive: true })

			try {
				cpSync(oldInstancePath, newInstancePath, { recursive: true, force: true })
				await fsPromises.rm(oldInstancePath, { recursive: true, force: true })
				logger.instances.info(`Successfully moved: ${instance.name}`)
				successCount++
			} catch (error) {
				logger.instances.error(`Failed to move instance ${instance.name}: ${error}`)
				throw error
			}
		} else {
			logger.instances.warn(`Instance directory doesn't exist: ${oldInstancePath}`)
		}
	}

	updateAppSettings({ instancesDirectory: newPath })
	await updateInstancesData({ instancesDirectory: newPath })

	logger.instances.info(`Migration completed: ${successCount} instances moved to ${newPath}`)
}

interface PZConfig {
	mainClass: string
	classpath: string[]
	vmArgs: string[]
	windows?: Record<string, { vmArgs: string[] }>
}

/**
 * Generate custom configuration file for a Project Zomboid instance
 * @param gameDir Directory where the game is installed
 * @param instance The game instance
 * @returns Path to the generated config file
 */
export async function generateInstanceConfig(
	gameDir: string,
	instance: GameInstance
): Promise<string> {
	const instanceDir = await getInstancePath(instance)

	if (!existsSync(instanceDir)) {
		await fsPromises.mkdir(instanceDir, { recursive: true })
		logger.instances.info(`Created instance directory: ${instanceDir}`)
	}

	const configPath = join(instanceDir, `${instance.id}.json`)

	const templatePath = join(gameDir, "ProjectZomboid64.json")
	const templateConfig = await loadConfigTemplate(templatePath)

	const customConfig: PZConfig = {
		...templateConfig,
		vmArgs: [
			...templateConfig.vmArgs.filter(
				(arg) =>
					!arg.startsWith("-Xmx") &&
					!arg.startsWith("-Duser.home") &&
					!arg.startsWith("-Dzomboid.znetlog")
			),
			`-Xmx${instance.memoryAllocation || 3072}m`,
			`-Duser.home=${instanceDir}`,
			"-Dzomboid.znetlog=1"
		]
	}

	if (customConfig.windows) {
		for (const version in customConfig.windows) {
			if (customConfig.windows[version].vmArgs) {
				customConfig.windows[version].vmArgs = customConfig.windows[version].vmArgs
					.filter((arg) => !arg.includes("UseZGC"))
					.concat(["-XX:+UseG1GC"])
			}
		}
	}

	await fsPromises.writeFile(configPath, JSON.stringify(customConfig, null, 2), "utf8")
	logger.instances.info(`Generated config at: ${configPath}`)

	return configPath
}

/**
 * Load the configuration template from the game files
 */
async function loadConfigTemplate(templatePath: string): Promise<PZConfig> {
	try {
		const fileData = await fsPromises.readFile(templatePath, "utf8")
		return JSON.parse(fileData)
	} catch (error) {
		logger.instances.error(`Error loading config template from ${templatePath}: ${error}`)

		return {
			mainClass: "zombie/gameStates/MainScreenState",
			classpath: [
				".",
				"commons-compress-1.18.jar",
				"istack-commons-runtime.jar",
				"jassimp.jar",
				"javacord-2.0.17-shaded.jar",
				"javax.activation-api.jar",
				"jaxb-api.jar",
				"jaxb-runtime.jar",
				"lwjgl.jar",
				"lwjgl-natives-windows.jar",
				"lwjgl-glfw.jar",
				"lwjgl-glfw-natives-windows.jar",
				"lwjgl-jemalloc.jar",
				"lwjgl-jemalloc-natives-windows.jar",
				"lwjgl-opengl.jar",
				"lwjgl-opengl-natives-windows.jar",
				"lwjgl_util.jar",
				"sqlite-jdbc-3.27.2.1.jar",
				"trove-3.0.3.jar",
				"uncommons-maths-1.2.3.jar"
			],
			vmArgs: [
				"-Djava.awt.headless=true",
				"-Xmx3072m",
				"-Dzomboid.steam=1",
				"-Dzomboid.znetlog=1",
				"-Djava.library.path=win64/;.",
				"-XX:-CreateCoredumpOnCrash",
				"-XX:-OmitStackTraceInFastThrow",
				"-XX:+UseG1GC"
			]
		}
	}
}
