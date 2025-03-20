/**
 * Format bytes to a human-readable string
 */
export function formatBytes(bytes: number | undefined, decimals = 1): string {
	if (bytes === undefined || bytes === 0) return "0 B"

	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

/**
 * Format a time duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`

	const seconds = Math.floor(ms / 1000)
	if (seconds < 60) return `${seconds}s`

	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60
	if (minutes < 60) return `${minutes}m ${remainingSeconds}s`

	const hours = Math.floor(minutes / 60)
	const remainingMinutes = minutes % 60
	return `${hours}h ${remainingMinutes}m`
}
