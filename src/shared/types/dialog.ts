export interface OpenDialogOptions {
	title?: string
	defaultPath?: string
	buttonLabel?: string
	filters?: { name: string; extensions: string[] }[]
	properties?: string[]
}

export interface FileDialogResult {
	canceled: boolean
	filePaths: string[]
}
