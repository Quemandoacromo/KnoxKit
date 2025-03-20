export interface SystemMemoryInfo {
	totalMemoryMB: number
	freeMemoryMB: number
	recommendedGameMemoryMB: number
}

export type MemoryWarningLevel = "safe" | "warning" | "danger"

export interface OsInfo {
	platform: string
	arch: string
	release: string
	version: string
	cpuCores: number
	hostname: string
}

export interface CpuInfo {
	model: string
	speed: number
	cores: number
}
