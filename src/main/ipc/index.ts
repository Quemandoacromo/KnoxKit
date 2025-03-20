import { registerDownloadHandlers } from "@main/ipc/download-handlers"
import { registerModHandlers } from "@main/ipc/mod-handlers"
import { registerProtocolHandlers } from "@main/ipc/protocol-handlers"
import logger from "@main/utils/logger"
import { registerDialogHandlers } from "./dialog-handlers"
import { registerFilesystemHandlers } from "./filesystem-handlers"
import { registerGameHandlers } from "./game-handlers"
import { registerInstanceHandlers } from "./instance-handlers"
import { registerSettingsHandlers } from "./settings-handlers"
import { registerSteamHandlers } from "./steam-handlers"
import { registerSystemHandlers } from "./system-handlers"
import { registerWindowHandlers } from "./window-handlers"

const cleanupFunctions: Array<() => void> = []

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
	cleanupFunctions.push(
		registerWindowHandlers(),
		registerSettingsHandlers(),
		registerGameHandlers(),
		registerInstanceHandlers(),
		registerSystemHandlers(),
		registerDialogHandlers(),
		registerFilesystemHandlers(),
		registerSteamHandlers(),
		registerDownloadHandlers(),
		registerModHandlers(),
		registerProtocolHandlers()
	)

	logger.system.info("All IPC handlers registered")
}
