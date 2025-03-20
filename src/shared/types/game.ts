/**
 * Información sobre la salida del juego
 */
export interface GameExitInfo {
	instanceId: string
	playTime: number
	endTime: Date
}

/**
 * Definición de un juego compatible
 */
export interface GameDefinition {
	appId: string
	folderName: string
	validationFiles: {
		win32: string[]
		darwin: string[]
		linux: string[]
	}
	commonDirs: string[]
}

/**
 * Eventos del servicio de juego que pueden ser escuchados por el renderer
 */
export interface GameServiceEvents {
	"game:started": (info: { instanceId: string; startTime: Date }) => void
	"game:closed": (info: GameExitInfo) => void
}

/**
 * Estado del servicio de juego
 */
export interface GameServiceState {
	gamePath?: string
	runningInstances: string[]
	isDetecting: boolean
}
