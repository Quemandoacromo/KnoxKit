import { exec } from "node:child_process"
import { promises as fs, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { promisify } from "node:util"
import logger from "@main/utils/logger"
import type { GameDefinition } from "@shared/types/game"

const execAsync = promisify(exec)

/**
 * Platform-specific paths to check for Project Zomboid
 */
const defaultPaths = {
	win32: [
		join(
			process.env.ProgramFiles || "C:\\Program Files",
			"Steam",
			"steamapps",
			"common",
			"ProjectZomboid"
		),
		join(
			process.env.ProgramFiles || "C:\\Program Files (x86)",
			"Steam",
			"steamapps",
			"common",
			"ProjectZomboid"
		)
	],
	darwin: [
		join(
			process.env.HOME || "",
			"Library",
			"Application Support",
			"Steam",
			"steamapps",
			"common",
			"ProjectZomboid"
		)
	],
	linux: [
		join(process.env.HOME || "", ".steam", "steam", "steamapps", "common", "ProjectZomboid"),
		join(
			process.env.HOME || "",
			".local",
			"share",
			"Steam",
			"steamapps",
			"common",
			"ProjectZomboid"
		)
	]
}

// Game definition mapping
const knownGames: Record<string, GameDefinition> = {
	ProjectZomboid: {
		appId: "108600",
		folderName: "ProjectZomboid",
		validationFiles: {
			win32: ["ProjectZomboid.exe", "ProjectZomboid32.exe", "ProjectZomboid64.exe"],
			darwin: ["ProjectZomboid64.sh", "ProjectZomboid32.sh"],
			linux: ["ProjectZomboid64.sh", "ProjectZomboid32.sh"]
		},
		commonDirs: ["media", "lua"]
	}
}

/**
 * Validate that a path contains a specific game installation
 */
export async function validateGamePath(
	gamePath: string,
	gameKey = "ProjectZomboid"
): Promise<boolean> {
	try {
		const dirPath = resolve(gamePath)
		const gameInfo = knownGames[gameKey]

		if (!gameInfo || !existsSync(dirPath)) {
			return false
		}

		const platform = process.platform as "win32" | "darwin" | "linux"
		const requiredItems = gameInfo.validationFiles[platform] || []
		const hasExecutable = requiredItems.some((item) => existsSync(join(dirPath, item)))
		const commonDirs = gameInfo.commonDirs || []
		const hasCommonDirs = commonDirs.some((dir) => existsSync(join(dirPath, dir)))

		return hasExecutable || hasCommonDirs
	} catch (error) {
		logger.system.error(`Error validating game path:${error}`)
		return false
	}
}

/**
 * Find the Steam installation path
 */
async function findSteamPath(): Promise<string> {
	if (process.platform === "win32") {
		try {
			const { stdout } = await execAsync(
				'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v "InstallPath"'
			).catch(() => ({ stdout: "" }))

			if (stdout) {
				const matches = stdout.match(/InstallPath\s+REG_SZ\s+(.*)/)
				if (matches?.[1]) {
					return matches[1].trim()
				}
			}

			const { stdout: stdout2 } = await execAsync(
				'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Valve\\Steam" /v "InstallPath"'
			)

			const matches2 = stdout2.match(/InstallPath\s+REG_SZ\s+(.*)/)
			if (matches2?.[1]) {
				return matches2[1].trim()
			}

			throw new Error("Steam installation not found in registry")
		} catch (error) {
			logger.system.error(`Error finding Steam path from registry:${error}`)
			throw error
		}
	} else if (process.platform === "darwin") {
		return join(process.env.HOME || "", "Library", "Application Support", "Steam")
	} else {
		// Linux
		return join(process.env.HOME || "", ".steam", "steam")
	}
}

/**
 * Find additional Steam library folders
 */
async function findSteamLibraryFolders(steamPath: string): Promise<string[]> {
	const libraryFoldersPath = join(steamPath, "steamapps", "libraryfolders.vdf")
	const paths: string[] = []

	try {
		if (!existsSync(libraryFoldersPath)) {
			return []
		}

		const content = await fs.readFile(libraryFoldersPath, "utf8")
		const pathRegex = /"path"\s+"([^"]+)"/g
		let match: RegExpExecArray | null

		match = pathRegex.exec(content)
		while (match !== null) {
			paths.push(match[1].replace(/\\\\/g, "\\"))
			match = pathRegex.exec(content)
		}

		return paths
	} catch (error) {
		logger.system.error(`Error parsing Steam library folders: ${error}`)
		return []
	}
}

/**
 * Find a Steam game by its App ID
 */
export async function findSteamGameLocation(appId: string, gameKey?: string): Promise<string> {
	const platform = process.platform as "win32" | "darwin" | "linux"
	const game =
		Object.values(knownGames).find((g) => g.appId === appId) || (gameKey && knownGames[gameKey])

	if (!game) {
		throw new Error(`Unknown game with App ID: ${appId}`)
	}

	if (gameKey) {
		const defaultGamePaths = defaultPaths[platform].map((p) =>
			p.includes(game.folderName) ? p : join(p, "..", game.folderName)
		)

		for (const path of defaultGamePaths) {
			if (existsSync(path) && (await validateGamePath(path, gameKey))) {
				return path
			}
		}
	}

	try {
		const steamPath = await findSteamPath()
		const defaultLocation = join(steamPath, "steamapps", "common", game.folderName)

		if (existsSync(defaultLocation) && (await validateGamePath(defaultLocation, gameKey))) {
			return defaultLocation
		}

		const manifestFile = join(steamPath, "steamapps", `appmanifest_${appId}.acf`)
		if (existsSync(manifestFile)) {
			const content = await fs.readFile(manifestFile, "utf8")
			const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/)

			if (installDirMatch?.[1]) {
				const gamePath = join(steamPath, "steamapps", "common", installDirMatch[1])
				if (existsSync(gamePath) && (await validateGamePath(gamePath, gameKey))) {
					return gamePath
				}
			}
		}

		const libraryPaths = await findSteamLibraryFolders(steamPath)
		for (const libPath of libraryPaths) {
			const gamePath = join(libPath, "steamapps", "common", game.folderName)
			if (existsSync(gamePath) && (await validateGamePath(gamePath, gameKey))) {
				return gamePath
			}

			const manifestFile = join(libPath, "steamapps", `appmanifest_${appId}.acf`)
			if (existsSync(manifestFile)) {
				const content = await fs.readFile(manifestFile, "utf8")
				const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/)

				if (installDirMatch?.[1]) {
					const manifestGamePath = join(libPath, "steamapps", "common", installDirMatch[1])
					if (existsSync(manifestGamePath) && (await validateGamePath(manifestGamePath, gameKey))) {
						return manifestGamePath
					}
				}
			}
		}

		throw new Error(`Game with App ID ${appId} not found in Steam libraries`)
	} catch (error) {
		logger.system.error(`Error detecting game path:${error}`)
		throw new Error(`Could not detect game with App ID ${appId}`)
	}
}

/**
 * Auto-detect Project Zomboid installation
 */
export async function detectGamePath(): Promise<string> {
	return findSteamGameLocation("108600", "ProjectZomboid")
}

/**
 * Get the path to store game instances and data
 */
export function getAppDataPath(): string {
	let basePath: string

	switch (process.platform) {
		case "win32":
			basePath = process.env.LOCALAPPDATA || join(process.env.USERPROFILE || "", "AppData", "Local")
			return join(basePath, "knoxkit")

		case "darwin":
			basePath = process.env.HOME || ""
			return join(basePath, "Library", "Application Support", "knoxkit")

		case "linux":
			basePath = process.env.HOME || ""
			return join(basePath, ".local", "share", "knoxkit")

		default:
			throw new Error(`Unsupported platform: ${process.platform}`)
	}
}

/**
 * Ensure the app data directory exists
 */
export async function ensureAppDataPath(): Promise<string> {
	const dataPath = getAppDataPath()
	try {
		await fs.mkdir(dataPath, { recursive: true })
		return dataPath
	} catch (error) {
		logger.system.error(`Error creating app data directory: ${error}`)
		throw error
	}
}
