interface FormatDistanceOptions {
	addSuffix?: boolean
	includeSeconds?: boolean
}

/**
 * Returns the distance between the given dates in words.
 * @param date - the date
 * @param baseDate - the date to compare with
 * @param options - the options object
 * @returns the distance in words
 */
export function formatDistance(
	date: Date,
	baseDate: Date,
	options: FormatDistanceOptions = {}
): string {
	const milliseconds = Math.abs(date.getTime() - baseDate.getTime())
	const seconds = Math.floor(milliseconds / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	// Determine if past or future
	const isPast = date < baseDate
	const suffix = options.addSuffix ? (isPast ? " ago" : " from now") : ""

	if (seconds < 5) {
		return "just now"
	}
	if (seconds < 60) {
		return `${seconds} second${seconds === 1 ? "" : "s"}${suffix}`
	}
	if (minutes < 60) {
		return `${minutes} minute${minutes === 1 ? "" : "s"}${suffix}`
	}
	if (hours < 24) {
		return `${hours} hour${hours === 1 ? "" : "s"}${suffix}`
	}
	if (days < 7) {
		return `${days} day${days === 1 ? "" : "s"}${suffix}`
	}
	if (days < 30) {
		const weeks = Math.floor(days / 7)
		return `${weeks} week${weeks === 1 ? "" : "s"}${suffix}`
	}
	if (days < 365) {
		const months = Math.floor(days / 30)
		return `${months} month${months === 1 ? "" : "s"}${suffix}`
	}
	const years = Math.floor(days / 365)
	return `${years} year${years === 1 ? "" : "s"}${suffix}`
}

/**
 * Formats the date
 * @param date - the date to format
 * @param format - the format to use
 * @returns the formatted date
 */
export function formatDate(date: Date, format = "MMM d, yyyy"): string {
	const options: Intl.DateTimeFormatOptions = {
		year: format.includes("yyyy") ? "numeric" : undefined,
		month: format.includes("MMM") ? "short" : format.includes("MM") ? "2-digit" : undefined,
		day: format.includes("d") ? "numeric" : undefined,
		hour: format.includes("h") || format.includes("H") ? "2-digit" : undefined,
		minute: format.includes("m") ? "2-digit" : undefined,
		second: format.includes("s") ? "2-digit" : undefined,
		hour12: format.includes("h")
	}

	return new Intl.DateTimeFormat("en-US", options).format(date)
}
