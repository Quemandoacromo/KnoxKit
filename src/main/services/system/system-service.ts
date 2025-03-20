import os from "node:os"
import type { CpuInfo, MemoryWarningLevel, OsInfo, SystemMemoryInfo } from "@shared/types/system"
import { getMemoryWarningLevel, getSafeMemoryOptions, getSystemMemory } from "./system-info"

/**
 * Servicio para acceder a información del sistema
 */
export class SystemService {
	/**
	 * Obtiene información de la memoria del sistema
	 */
	getMemoryInfo(): SystemMemoryInfo {
		return getSystemMemory()
	}

	/**
	 * Obtiene opciones seguras de memoria para el juego
	 */
	getMemoryOptions(): number[] {
		return getSafeMemoryOptions()
	}

	/**
	 * Evalúa si una asignación de memoria es segura
	 */
	evaluateMemoryAllocation(memoryMB: number): MemoryWarningLevel {
		return getMemoryWarningLevel(memoryMB)
	}

	/**
	 * Obtiene información del sistema operativo
	 */
	getOsInfo(): OsInfo {
		return {
			platform: process.platform,
			arch: process.arch,
			release: os.release(),
			version: os.version(),
			cpuCores: os.cpus().length,
			hostname: os.hostname()
		}
	}

	/**
	 * Obtiene información del CPU
	 */
	getCpuInfo(): CpuInfo {
		const cpus = os.cpus()
		return {
			model: cpus[0].model,
			speed: cpus[0].speed,
			cores: cpus.length
		}
	}
}
