import { useStore } from "@nanostores/react"
import { logger } from "@renderer/lib/utils"
import {
	initSettings,
	listenToSettingsChanges,
	settingsStore,
	updateSetting
} from "@renderer/stores/settings-store"
import type { ThemeType } from "@shared/types/settings"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type ThemeProviderProps = {
	children: React.ReactNode
	defaultTheme?: ThemeType
}

type ThemeProviderState = {
	theme: ThemeType
	setTheme: (theme: ThemeType) => void
}

const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({ children, defaultTheme = "dark", ...props }: ThemeProviderProps) {
	const settings = useStore(settingsStore)
	const [isInitialized, setIsInitialized] = useState(false)

	useEffect(() => {
		const initialize = async () => {
			await initSettings()
			setIsInitialized(true)
		}

		initialize()

		const unsubscribe = listenToSettingsChanges()

		return () => {
			unsubscribe()
		}
	}, [])

	const applyTheme = (theme: ThemeType) => {
		const isDark =
			theme === "dark" ||
			(theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

		logger.info(`Applying theme: ${theme}, isDark: ${isDark}`)
		document.documentElement.classList.toggle("dark", isDark)
	}

	useEffect(() => {
		if (!isInitialized && !settings.theme) return

		const themeToApply = settings.theme || defaultTheme
		applyTheme(themeToApply)

		if (themeToApply === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
			const handleChange = (e: MediaQueryListEvent) => {
				document.documentElement.classList.toggle("dark", e.matches)
			}

			mediaQuery.addEventListener("change", handleChange)
			return () => mediaQuery.removeEventListener("change", handleChange)
		}

		return undefined
	}, [settings.theme, isInitialized])

	const value = {
		theme: settings.theme || defaultTheme,
		setTheme: (theme: ThemeType) => updateSetting("theme", theme)
	}

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	)
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext)

	if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

	return context
}
