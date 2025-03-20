import { exec } from "node:child_process"
import { promises as fs, existsSync } from "node:fs"
import { createWriteStream } from "node:fs"
import { get } from "node:https"
import { join } from "node:path"
import { promisify } from "node:util"
import logger from "@main/utils/logger"
import { STEAMCMD_URLS } from "@shared/constants/steam"
import { app } from "electron"
import extract from "extract-zip"

const execAsync = promisify(exec)

/**
 * Get the SteamCMD install path
 */
export function getSteamCmdPath(): string {
	const appPath = app.getPath("userData")
	return join(appPath, "steamcmd")
}

/**
 * Check if SteamCMD is installed
 */
export async function isSteamCmdInstalled(): Promise<boolean> {
	const steamCmdPath = getSteamCmdPath()
	const executableName = process.platform === "win32" ? "steamcmd.exe" : "steamcmd.sh"

	return existsSync(join(steamCmdPath, executableName))
}

/**
 * Download and install SteamCMD
 */
export async function installSteamCmd(): Promise<boolean> {
	const platform = process.platform as "win32" | "darwin" | "linux"
	const steamCmdUrl = STEAMCMD_URLS[platform]

	if (!steamCmdUrl) {
		throw new Error(`Unsupported platform: ${platform}`)
	}

	const steamCmdPath = getSteamCmdPath()
	const archivePath = join(steamCmdPath, platform === "win32" ? "steamcmd.zip" : "steamcmd.tar.gz")

	await fs.mkdir(steamCmdPath, { recursive: true })

	try {
		await downloadFile(steamCmdUrl, archivePath)

		if (platform === "win32") {
			await extract(archivePath, { dir: steamCmdPath })
		} else {
			await execAsync(`tar -xzf "${archivePath}" -C "${steamCmdPath}"`)
		}

		if (platform !== "win32") {
			await execAsync(`chmod +x "${join(steamCmdPath, "steamcmd.sh")}"`)
		}

		try {
			await runSteamCmdUpdate()
		} catch (error) {
			logger.system.error(`SteamCMD update error, checking if executable is available:${error}`)
			const executablePath = join(
				steamCmdPath,
				platform === "win32" ? "steamcmd.exe" : "steamcmd.sh"
			)
			if (!existsSync(executablePath)) {
				throw new Error("SteamCMD executable not found after installation")
			}
		}

		return true
	} catch (error) {
		logger.system.error(`Failed to install SteamCMD:${error}`)
		return false
	}
}

/**
 * Run SteamCMD to update itself
 */
async function runSteamCmdUpdate(): Promise<void> {
	const steamCmdPath = getSteamCmdPath()
	const executablePath = join(
		steamCmdPath,
		process.platform === "win32" ? "steamcmd.exe" : "steamcmd.sh"
	)

	try {
		await execAsync(`"${executablePath}" +quit`)
	} catch (error) {
		logger.system.warn(`SteamCMD update warning:${error}`)
		const exists = existsSync(executablePath)
		if (!exists) {
			throw error
		}
	}
}

/**
 * Download file from URL
 */
function downloadFile(url: string, destination: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const file = createWriteStream(destination)

		get(url, (response) => {
			if (response.statusCode !== 200) {
				reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`))
				return
			}

			response.pipe(file)
			file.on("finish", () => {
				file.close()
				resolve()
			})
		}).on("error", (err) => {
			fs.unlink(destination).catch(() => {})
			reject(err)
		})
	})
}

/**
 * Get the path where workshop items are stored by SteamCMD
 * @param appId The Steam app ID
 * @returns Path to the workshop content directory
 */
export function getWorkshopContentPath(appId: string): string {
	const steamCmdPath = getSteamCmdPath()
	return join(steamCmdPath, "steamapps", "workshop", "content", appId)
}

/**
 * Check if a workshop item has been downloaded
 * @param appId The Steam app ID
 * @param workshopId The workshop item ID
 * @returns True if the workshop item exists
 */
export function isWorkshopItemDownloaded(appId: string, workshopId: string): boolean {
	const itemPath = join(getWorkshopContentPath(appId), workshopId)
	return existsSync(itemPath)
}
