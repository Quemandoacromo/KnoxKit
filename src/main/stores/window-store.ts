import { Conf } from "electron-conf"
import type { WindowState } from "@shared/types/window"

const windowStore = new Conf<WindowState>({
	name: "window-state",
	defaults: {
		windowBounds: { width: 1024, height: 768 },
		isMaximized: false
	}
})

export const getWindowBounds = () => windowStore.get("windowBounds")
export const getIsMaximized = () => windowStore.get("isMaximized")
export const saveWindowBounds = (bounds: Electron.Rectangle) =>
	windowStore.set("windowBounds", bounds)
export const saveIsMaximized = (isMaximized: boolean) => windowStore.set("isMaximized", isMaximized)

export default windowStore
