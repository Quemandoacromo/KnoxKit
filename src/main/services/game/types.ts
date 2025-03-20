import type { ChildProcess } from "node:child_process"
import type { GameDefinition, GameExitInfo, GameServiceEvents } from "@shared/types/game"

/**
 * Game process information (only used in the main process)
 */
export interface GameProcessInfo {
	process: ChildProcess
	startTime: Date
	instanceId: string
}

export type { GameDefinition, GameExitInfo, GameServiceEvents }
