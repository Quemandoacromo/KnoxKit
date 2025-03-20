export interface WindowState {
	windowBounds: {
		width: number
		height: number
		x?: number
		y?: number
	}
	isMaximized: boolean
}
