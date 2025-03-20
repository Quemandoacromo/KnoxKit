import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { generateInstanceConfig, getInstancePath } from "@main/stores/instances-store"
import logger from "@main/utils/logger"
import { minimizeToTray } from "@main/window/tray-manager"
import type { GameInstance, LaunchOptions } from "@shared/types/instances"
import { registerGameProcess } from "./process-monitor"

/**
 * Launch Project Zomboid with a specific instance configuration
 */
export async function launchGameInstance(
	gameDirectory: string,
	instance: GameInstance,
	options: LaunchOptions = {}
): Promise<boolean> {
	try {
		const gamePath = resolve(gameDirectory)
		if (!existsSync(gamePath)) {
			throw new Error(`Game directory not found: ${gamePath}`)
		}

		const executable = getGameExecutable(gamePath)
		if (!existsSync(executable)) {
			throw new Error(`Game executable not found: ${executable}`)
		}

		const configFile = await generateInstanceConfig(gamePath, instance)

		// Build launch arguments
		const args = [
			"-pzexeconfig",
			configFile,
			"-pzexelog",
			join(await getInstancePath(instance), "launcher.log")
		]

		if (options.debug) args.push("-debug")
		if (options.safeMode) args.push("-safemode")
		if (options.noSteam) args.push("-nosteam")

		if (instance.modsEnabled) {
			args.push("-modfolders", "mods")
		}

		if (options.additionalArgs && options.additionalArgs.length > 0) {
			args.push(...options.additionalArgs)
		}

		if (instance.customOptions?.launchArgs && Array.isArray(instance.customOptions.launchArgs)) {
			args.push(...(instance.customOptions.launchArgs as string[]))
		}

		logger.game.info(`Launching game with config: ${configFile}`)
		logger.game.info(`Arguments: ${JSON.stringify(args)}`)

		const gameProcess = spawn(executable, args, {
			cwd: gamePath,
			detached: true,
			stdio: "ignore",
			windowsHide: false
		})

		registerGameProcess(instance.id, gameProcess)

		if (options.minimizeToTray !== false) {
			minimizeToTray()
		}

		gameProcess.unref()

		return true
	} catch (error) {
		logger.game.error(`Failed to launch game: ${error}`)
		throw error
	}
}

/**
 * Get the appropriate game executable based on platform
 */
function getGameExecutable(gameDir: string): string {
	switch (process.platform) {
		case "win32": {
			const exe64 = join(gameDir, "ProjectZomboid64.exe")
			const exe32 = join(gameDir, "ProjectZomboid32.exe")
			const exeGeneric = join(gameDir, "ProjectZomboid.exe")

			if (existsSync(exe64)) return exe64
			if (existsSync(exe32)) return exe32
			if (existsSync(exeGeneric)) return exeGeneric
			return exe64
		}

		case "darwin":
		case "linux":
			return join(gameDir, "ProjectZomboid64.sh")

		default:
			throw new Error(`Unsupported platform: ${process.platform}`)
	}
}
