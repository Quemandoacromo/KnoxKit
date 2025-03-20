import type { ChildProcess } from "node:child_process"
import { EventEmitter } from "node:events"
import { updateInstanceData } from "@main/stores/instances-store"
import logger from "@main/utils/logger"
import { restoreMainWindow } from "@main/window/tray-manager"
import type { GameServiceEvents } from "@shared/types/game"
import type { GameProcessInfo } from "./types"

const activeProcesses = new Map<string, GameProcessInfo>()

export const gameProcessEvents = new EventEmitter() as EventEmitter & {
	on: <K extends keyof GameServiceEvents>(event: K, listener: GameServiceEvents[K]) => EventEmitter
	emit: <K extends keyof GameServiceEvents>(
		event: K,
		...args: Parameters<GameServiceEvents[K]>
	) => boolean
}

/**
 * Register a game process to monitor
 */
export function registerGameProcess(instanceId: string, process: ChildProcess): void {
	const startTime = new Date()

	activeProcesses.set(instanceId, {
		process,
		startTime,
		instanceId
	})

	gameProcessEvents.emit("game:started", { instanceId, startTime })

	process.on("exit", () => handleGameExit(instanceId))
	process.on("error", () => handleGameExit(instanceId))

	checkProcessStatus(instanceId)
}

/**
 * Handle game process exit
 */
async function handleGameExit(instanceId: string): Promise<void> {
	const processInfo = activeProcesses.get(instanceId)
	if (!processInfo) return

	const endTime = new Date()
	const playTimeMinutes = Math.round((endTime.getTime() - processInfo.startTime.getTime()) / 60000)

	logger.game.info(`Game instance ${instanceId} closed after ${playTimeMinutes} minutes`)

	await updateInstancePlayTime(instanceId, playTimeMinutes)

	activeProcesses.delete(instanceId)

	gameProcessEvents.emit("game:closed", {
		instanceId,
		playTime: playTimeMinutes,
		endTime
	})

	restoreMainWindow()
}

/**
 * Update instance data with play time
 */
async function updateInstancePlayTime(instanceId: string, playTimeMinutes: number): Promise<void> {
	try {
		await updateInstanceData(instanceId, {
			lastPlayed: new Date(),
			playTime: playTimeMinutes
		})
	} catch (error) {
		logger.game.error(`Error updating play time for instance ${instanceId}: ${error}`)
	}
}

/**
 * Check if the game process is still running
 */
function checkProcessStatus(instanceId: string): void {
	const CHECK_INTERVAL = 30000 // 30 seconds

	const intervalId = setInterval(() => {
		const processInfo = activeProcesses.get(instanceId)
		if (!processInfo) {
			clearInterval(intervalId)
			return
		}

		try {
			const exitCode = processInfo.process.exitCode
			if (exitCode !== null) {
				clearInterval(intervalId)
				handleGameExit(instanceId)
			}
		} catch (_error) {
			clearInterval(intervalId)
			handleGameExit(instanceId)
		}
	}, CHECK_INTERVAL)
}

/**
 * Check if an instance is currently running
 */
export function isInstanceRunning(instanceId: string): boolean {
	return activeProcesses.has(instanceId)
}

/**
 * Get all running instances
 */
export function getRunningInstances(): string[] {
	return Array.from(activeProcesses.keys())
}
