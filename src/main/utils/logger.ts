import { Logger } from "electron-winston/main"

const commonOptions = {
	maxsize: 5242880,
	maxFiles: 5,
	fileLogLevel: "info" as const,
	consoleLogLevel: "debug" as const,
	handleExceptions: true,
	handleRejections: true
}

/**
 * Format message with arguments, similar to console.log
 * @param args Arguments to format, first argument can contain format specifiers
 * @returns Formatted string
 */
function formatMessage(...args: unknown[]): string {
	if (args.length === 0) return ""

	if (args.length === 1) {
		return String(args[0])
	}

	const firstArg = args[0]
	if (typeof firstArg === "object") {
		return args
			.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
			.join(" ")
	}

	const formatStr = String(firstArg)
	const formatArgs = args.slice(1)

	try {
		return formatStr.replace(/%([sdjifoO%])/g, (match, format) => {
			if (format === "%") return "%"
			if (formatArgs.length === 0) return match

			const value = formatArgs.shift()
			switch (format) {
				case "s":
					return String(value)
				case "d":
					return Number(value).toString()
				case "j":
				case "o":
				case "O":
					return JSON.stringify(value)
				case "i":
					return Number.parseInt(String(value)).toString()
				case "f":
					return Number.parseFloat(String(value)).toString()
				default:
					return String(value)
			}
		})
	} catch (error) {
		return args
			.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
			.join(" ")
	}
}

/**
 * Wrapper for the original logger that adds component name as prefix
 */
class EnhancedLogger {
	private originalLogger: Logger
	private componentName: string
	private isRenderer: boolean

	constructor(logger: Logger, componentName: string, isRenderer = false) {
		this.originalLogger = logger
		this.componentName = componentName
		this.isRenderer = isRenderer
	}

	info(...args: unknown[]): void {
		const prefix = this.isRenderer ? "" : "main:"
		this.originalLogger.info(`[${prefix}${this.componentName}] ${formatMessage(...args)}`)
	}

	error(...args: unknown[]): void {
		const prefix = this.isRenderer ? "" : "main:"
		this.originalLogger.error(`[${prefix}${this.componentName}] ${formatMessage(...args)}`)
	}

	warn(...args: unknown[]): void {
		const prefix = this.isRenderer ? "" : "main:"
		this.originalLogger.warn(`[${prefix}${this.componentName}] ${formatMessage(...args)}`)
	}

	debug(...args: unknown[]): void {
		const prefix = this.isRenderer ? "" : "main:"
		this.originalLogger.info(`[${prefix}${this.componentName}] ${formatMessage(...args)}`)
	}
}

const originalLoggers = {
	main: new Logger({ ...commonOptions }),
	system: new Logger({ ...commonOptions }),
	game: new Logger({ ...commonOptions }),
	instances: new Logger({ ...commonOptions }),
	steam: new Logger({ ...commonOptions }),
	downloads: new Logger({ ...commonOptions }),
	window: new Logger({ ...commonOptions }),
	stores: new Logger({ ...commonOptions }),
	root: new Logger({ ...commonOptions })
}

const logger = Object.fromEntries(
	Object.entries(originalLoggers).map(([key, originalLogger]) => [
		key,
		new EnhancedLogger(originalLogger, key, key === "root")
	])
) as Record<keyof typeof originalLoggers, EnhancedLogger>

originalLoggers.root.registerRendererListener()

export default logger
