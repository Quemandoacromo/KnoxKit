import type { GameServiceEvents } from "@shared/types/game"
import type { GameInstance, LaunchOptions } from "@shared/types/instances"
import { launchGameInstance } from "./launcher"
import { detectGamePath, findSteamGameLocation, validateGamePath } from "./path-resolver"
import { gameProcessEvents, getRunningInstances, isInstanceRunning } from "./process-monitor"

/**
 * Servicio centralizado para gestión del juego
 * Implementa el patrón Fachada para ofrecer una API unificada
 */
export class GameService {
	private _cachedGamePath: string | null = null

	/**
	 * Obtiene la ruta al ejecutable del juego
	 */
	async getGamePath(forceDetect = false): Promise<string> {
		if (!this._cachedGamePath || forceDetect) {
			this._cachedGamePath = await detectGamePath()
		}
		return this._cachedGamePath
	}

	/**
	 * Lanza una instancia del juego
	 */
	async launchInstance(instance: GameInstance, options: LaunchOptions = {}): Promise<boolean> {
		const gamePath = await this.getGamePath()
		return launchGameInstance(gamePath, instance, options)
	}

	/**
	 * Verifica si una ruta contiene una instalación válida del juego
	 */
	async validatePath(path: string): Promise<boolean> {
		return validateGamePath(path)
	}

	/**
	 * Encuentra la ruta de un juego por su ID de Steam
	 */
	async findGame(appId: string, gameKey?: string): Promise<string> {
		return findSteamGameLocation(appId, gameKey)
	}

	/**
	 * Registra un oyente para eventos del juego
	 */
	onEvent<K extends keyof GameServiceEvents>(event: K, callback: GameServiceEvents[K]): void {
		gameProcessEvents.on(event, callback)
	}

	/**
	 * Verifica si una instancia está en ejecución
	 */
	isInstanceRunning(instanceId: string): boolean {
		return isInstanceRunning(instanceId)
	}

	/**
	 * Obtiene todas las instancias en ejecución
	 */
	getRunningInstances(): string[] {
		return getRunningInstances()
	}
}
