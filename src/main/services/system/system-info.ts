import os from "node:os"
import type { MemoryWarningLevel, SystemMemoryInfo } from "@shared/types/system"

/**
 * Get system memory information
 * @returns Object containing memory information in MB
 */
export function getSystemMemory(): SystemMemoryInfo {
	const totalMemoryMB = Math.floor(os.totalmem() / (1024 * 1024))
	const freeMemoryMB = Math.floor(os.freemem() / (1024 * 1024))

	const recommendedGameMemoryMB = Math.min(Math.floor(totalMemoryMB * 0.7), 8192)

	return {
		totalMemoryMB,
		freeMemoryMB,
		recommendedGameMemoryMB
	}
}

/**
 * Get safe memory options for game allocations
 * @returns Array of memory allocation options in MB
 */
export function getSafeMemoryOptions(): number[] {
	const { totalMemoryMB } = getSystemMemory()

	const maxSafeMemory = Math.floor(totalMemoryMB * 0.9)

	const options = [1024, 2048, 3072, 4096, 6144, 8192].filter((option) => option <= maxSafeMemory)

	if (options.length === 0) {
		return [Math.max(1024, Math.floor(totalMemoryMB * 0.8))]
	}

	return options
}

/**
 * Get memory warning level based on requested allocation
 * @param requestedMemoryMB Memory allocation in MB
 * @returns Warning level: 'safe', 'warning', or 'danger'
 */
export function getMemoryWarningLevel(requestedMemoryMB: number): MemoryWarningLevel {
	const { totalMemoryMB } = getSystemMemory()

	const memoryRatio = requestedMemoryMB / totalMemoryMB

	if (memoryRatio <= 0.7) {
		return "safe"
	}
	if (memoryRatio <= 0.85) {
		return "warning"
	}
	return "danger"
}
