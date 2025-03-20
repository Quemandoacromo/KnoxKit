import { systemService } from "@main/services"
import { ipcMain } from "electron"

/**
 * Register system-related IPC handlers
 * @returns Cleanup function
 */
export function registerSystemHandlers(): () => void {
	ipcMain.handle("system:getMemoryInfo", () => {
		return systemService.getMemoryInfo()
	})

	ipcMain.handle("system:getMemoryOptions", () => {
		return systemService.getMemoryOptions()
	})

	ipcMain.handle("system:getMemoryWarningLevel", (_, requestedMemoryMB: number) => {
		return systemService.evaluateMemoryAllocation(requestedMemoryMB)
	})

	ipcMain.handle("system:getOsInfo", () => {
		return systemService.getOsInfo()
	})

	ipcMain.handle("system:getCpuInfo", () => {
		return systemService.getCpuInfo()
	})

	return () => {
		ipcMain.removeHandler("system:getMemoryInfo")
		ipcMain.removeHandler("system:getMemoryOptions")
		ipcMain.removeHandler("system:getMemoryWarningLevel")
		ipcMain.removeHandler("system:getOsInfo")
		ipcMain.removeHandler("system:getCpuInfo")
	}
}
