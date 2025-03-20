import { promises as fs } from "node:fs"
import { join } from "node:path"
import logger from "@main/utils/logger"
import { ipcMain } from "electron"

/**
 * Register filesystem IPC handlers
 * @returns Cleanup function
 */
export function registerFilesystemHandlers(): () => void {
	ipcMain.handle("filesystem:isDirectoryWritable", async (_, dirPath: string) => {
		try {
			const testFilePath = join(dirPath, ".write-test")
			await fs.writeFile(testFilePath, "test")
			await fs.unlink(testFilePath)
			return true
		} catch (error) {
			logger.system.error(`Directory is not writable: ${error}`)
			return false
		}
	})

	return () => {
		ipcMain.removeHandler("filesystem:isDirectoryWritable")
	}
}
