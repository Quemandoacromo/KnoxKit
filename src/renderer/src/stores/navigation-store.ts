import {
	Cog6ToothIcon,
	PuzzlePieceIcon,
	ServerIcon,
	WrenchScrewdriverIcon
} from "@heroicons/react/24/outline"
import { logger } from "@renderer/lib/utils"
import { map } from "nanostores"

export interface NavItem {
	nameKey: string
	href: string
	icon: React.FC<React.SVGProps<SVGSVGElement>>
	descriptionKey: string
	requiresAuth?: boolean
	badge?: string
}

export const navigationItems: NavItem[] = [
	{
		nameKey: "navigation.items.instances.name",
		href: "/",
		icon: ServerIcon,
		descriptionKey: "navigation.items.instances.description"
	},
	{
		nameKey: "navigation.items.mods.name",
		href: "/mods",
		icon: PuzzlePieceIcon,
		descriptionKey: "navigation.items.mods.description"
	},
	{
		nameKey: "navigation.items.workshop.name",
		href: "/workshop",
		icon: WrenchScrewdriverIcon,
		descriptionKey: "navigation.items.workshop.description"
	},
	{
		nameKey: "navigation.items.settings.name",
		href: "/settings",
		icon: Cog6ToothIcon,
		descriptionKey: "navigation.items.settings.description"
	}
]

export type NavigationState = {
	items: NavItem[]
	currentPath: string
	history: string[]
	isNavigating: boolean
	activeInstance?: string
}

export const navigationStore = map<NavigationState>({
	items: navigationItems,
	currentPath: "/",
	history: ["/"],
	isNavigating: false,
	activeInstance: undefined
})

export function setCurrentPath(path: string): void {
	if (path === navigationStore.get().currentPath) return

	navigationStore.set({
		...navigationStore.get(),
		currentPath: path,
		history: [...navigationStore.get().history, path].slice(-10),
		isNavigating: true
	})

	setTimeout(() => {
		navigationStore.setKey("isNavigating", false)
	}, 100)

	persistNavigationState()
}

export function setActiveInstance(instanceId: string | undefined): void {
	navigationStore.setKey("activeInstance", instanceId)
	persistNavigationState()
}

function persistNavigationState(): void {
	try {
		localStorage.setItem(
			"knoxkit-navigation",
			JSON.stringify({
				currentPath: navigationStore.get().currentPath,
				history: navigationStore.get().history,
				activeInstance: navigationStore.get().activeInstance
			})
		)
	} catch (err) {
		logger.error(`Error saving navigation state: ${err}`)
	}
}

export function initNavigation(): void {
	try {
		const savedNav = localStorage.getItem("knoxkit-navigation")
		if (savedNav) {
			const { currentPath, history, activeInstance } = JSON.parse(savedNav)
			navigationStore.setKey("currentPath", currentPath)
			navigationStore.setKey("history", history)
			navigationStore.setKey("activeInstance", activeInstance)
		}
	} catch (err) {
		logger.error(`Error loading navigation state: ${err}`)
	}
}

export function goBack(): void {
	const { history } = navigationStore.get()
	if (history.length > 1) {
		const newHistory = [...history]
		newHistory.pop()
		const previousPath = newHistory[newHistory.length - 1]

		navigationStore.set({
			...navigationStore.get(),
			currentPath: previousPath,
			history: newHistory,
			isNavigating: true
		})

		setTimeout(() => {
			navigationStore.setKey("isNavigating", false)
		}, 100)

		persistNavigationState()
	}
}
