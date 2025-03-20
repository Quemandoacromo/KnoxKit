import { atom } from "nanostores"

export type SteamCmdStatus = "checking" | "not_available" | "installing" | "ready"

interface SteamCmdState {
	status: SteamCmdStatus
	isChecking: boolean
	isInstalling: boolean
}

export const steamCmdStore = atom<SteamCmdState>({
	status: "checking",
	isChecking: true,
	isInstalling: false
})

export const setSteamCmdStatus = (status: SteamCmdStatus) => {
	steamCmdStore.set({
		...steamCmdStore.get(),
		status,
		isChecking: status === "checking",
		isInstalling: status === "installing"
	})
}

export const checkSteamCmd = async (): Promise<boolean> => {
	setSteamCmdStatus("checking")

	try {
		const isAvailable = await window.api.steam.isAvailable()
		setSteamCmdStatus(isAvailable ? "ready" : "not_available")
		return isAvailable
	} catch (error) {
		console.error("Error checking SteamCMD:", error)
		setSteamCmdStatus("not_available")
		return false
	}
}

export const installSteamCmd = async (): Promise<boolean> => {
	setSteamCmdStatus("installing")

	try {
		const success = await window.api.steam.install()
		setSteamCmdStatus(success ? "ready" : "not_available")
		return success
	} catch (error) {
		console.error("Error installing SteamCMD:", error)
		setSteamCmdStatus("not_available")
		return false
	}
}

// Initialize the store automatically
checkSteamCmd().catch((error) => {
	console.error("Failed to initialize SteamCMD status:", error)
})
