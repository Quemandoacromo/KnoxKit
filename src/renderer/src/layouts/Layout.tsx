import {
	ArrowDownTrayIcon,
	XMarkIcon as Close,
	ArrowsPointingOutIcon as Maximize,
	Bars3Icon as Menu,
	MinusIcon as Minimize,
	ArrowsPointingInIcon as Restore
} from "@heroicons/react/24/outline"
import { useStore } from "@nanostores/react"
import { Button } from "@renderer/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@renderer/components/ui/sheet"
import { Toaster } from "@renderer/components/ui/toaster"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { activeDownloads } from "@renderer/stores/downloads-store"
import { navigationStore, setCurrentPath } from "@renderer/stores/navigation-store"
import { steamCmdStore } from "@renderer/stores/steamcmd-store"
import {
	closeWindow,
	initWindowState,
	isMaximizedStore,
	maximizeWindow,
	minimizeWindow
} from "@renderer/stores/window-store"
import { atom } from "nanostores"
import { useEffect } from "react"
import { Link, useLocation } from "wouter"

// Mobile navigation drawer state
const isNavOpenStore = atom<boolean>(false)

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
	const [location] = useLocation()
	const isMaximized = useStore(isMaximizedStore)
	const isNavOpen = useStore(isNavOpenStore)
	const navigation = useStore(navigationStore)
	const steamCmdState = useStore(steamCmdStore)
	const activeDownloadItems = useStore(activeDownloads)
	const { t } = useTranslation()

	const setNavOpen = (open: boolean) => isNavOpenStore.set(open)

	useEffect(() => {
		initWindowState()
	}, [])

	useEffect(() => {
		setCurrentPath(location)
	}, [location])

	const renderSteamCmdStatus = () => {
		switch (steamCmdState.status) {
			case "checking":
				return (
					<div className="flex items-center gap-1">
						<span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
						<span className="text-xs">{t("layout.statusBar.steamCmd.checking")}</span>
					</div>
				)
			case "not_available":
				return (
					<div className="flex items-center gap-1">
						<span className="w-2 h-2 bg-red-500 rounded-full" />
						<span className="text-xs">{t("layout.statusBar.steamCmd.notAvailable")}</span>
					</div>
				)
			case "installing":
				return (
					<div className="flex items-center gap-1">
						<span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
						<span className="text-xs">{t("layout.statusBar.steamCmd.installing")}</span>
					</div>
				)
			case "ready":
				return (
					<div className="flex items-center gap-1">
						<span className="w-2 h-2 bg-green-500 rounded-full" />
						<span className="text-xs">{t("layout.statusBar.steamCmd.ready")}</span>
					</div>
				)
			default:
				return null
		}
	}

	const renderDownloadButton = (isMobile = false) => {
		const hasActiveDownloads = activeDownloadItems.length > 0

		return (
			<Button
				variant={location === "/downloads" ? "secondary" : "ghost"}
				size="sm"
				className={`w-full justify-start transition-all relative ${
					location === "/downloads" ? "bg-primary/10 font-medium shadow-sm" : "hover:bg-accent/50"
				}`}
				asChild
			>
				<Link href="/downloads">
					<div className="flex items-center">
						<div className="relative">
							<ArrowDownTrayIcon
								className={`h-4 w-4 mr-2 ${location === "/downloads" ? "text-primary" : ""} 
								${hasActiveDownloads ? "animate-bounce" : ""}`}
							/>
							{hasActiveDownloads && (
								<div className="absolute -top-1.5 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
									{activeDownloadItems.length}
								</div>
							)}
						</div>
						<span>{t("layout.downloads")}</span>
						{hasActiveDownloads && !isMobile && (
							<div className="ml-2 text-xs text-primary font-medium">
								({activeDownloadItems.length} {t("layout.active")})
							</div>
						)}
					</div>
				</Link>
			</Button>
		)
	}

	return (
		<div className="flex flex-col h-screen overflow-hidden bg-background select-none antialiased">
			{/* Titlebar - Electron specific */}
			<div className="h-10 flex items-center justify-between border-b bg-card pr-0 pl-4 drag">
				<div className="flex items-center space-x-2 no-drag">
					<div className="h-3 w-3 rounded-full bg-red-500" />
					<div className="h-3 w-3 rounded-full bg-yellow-500" />
					<div className="h-3 w-3 rounded-full bg-green-500" />
				</div>
				<span className="text-sm font-medium select-none">{t("layout.title")}</span>
				<div className="flex items-center no-drag h-full">
					<Button
						variant="ghost"
						size="icon"
						className="hover:bg-accent h-full w-10 rounded-none"
						onClick={(e) => {
							e.preventDefault()
							minimizeWindow()
						}}
					>
						<Minimize className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="hover:bg-accent h-full w-10 rounded-none"
						onClick={(e) => {
							e.preventDefault()
							maximizeWindow()
						}}
					>
						{isMaximized ? <Restore className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="hover:bg-destructive hover:text-destructive-foreground h-full w-10 rounded-none"
						onClick={(e) => {
							e.preventDefault()
							closeWindow()
						}}
					>
						<Close className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="flex flex-1 overflow-hidden">
				{/* Mobile Navigation */}
				<Sheet open={isNavOpen} onOpenChange={setNavOpen}>
					<SheetTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="md:hidden absolute top-14 left-4 z-50 shadow-md hover:bg-primary hover:text-primary-foreground"
						>
							<Menu className="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-64 pt-6 border-r bg-card">
						<div className="py-2 flex flex-col h-full">
							<div className="px-3 py-2 mb-4">
								<h2 className="text-xl font-bold tracking-tight">KnoxKit</h2>
								<p className="text-xs text-muted-foreground mt-1">{t("layout.subTitle")}</p>
							</div>
							<nav className="space-y-1 flex-1 px-2 py-2">
								{navigation.items.map((item) => {
									const Icon = item.icon
									return (
										<Link href={item.href} key={item.nameKey}>
											<div
												className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
													location === item.href
														? "bg-primary text-primary-foreground"
														: "text-foreground hover:bg-accent hover:text-accent-foreground"
												}`}
												onClick={() => {
													setNavOpen(false)
													setCurrentPath(item.href)
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														setNavOpen(false)
														setCurrentPath(item.href)
													}
												}}
											>
												<Icon className="mr-3 h-5 w-5" />
												<div>
													<div>{t(item.nameKey)}</div>
													<div className="text-xs opacity-70">{t(item.descriptionKey)}</div>
												</div>
											</div>
										</Link>
									)
								})}
							</nav>

							<div className="border-t border-border p-3">
								<Link href="/downloads">{renderDownloadButton(true)}</Link>
							</div>
						</div>
					</SheetContent>
				</Sheet>

				{/* Desktop Sidebar */}
				<div className="hidden md:flex md:w-52 md:flex-col md:border-r bg-card">
					<div className="flex flex-col flex-1">
						<div className="px-4 py-5 border-b border-border/40">
							<h2 className="text-xl font-bold tracking-tight">KnoxKit</h2>
							<p className="text-xs text-muted-foreground mt-1">{t("layout.subTitle")}</p>
						</div>
						<nav className="flex-1 px-2 py-4 space-y-2">
							{navigation.items.map((item) => {
								const Icon = item.icon
								return (
									<Link href={item.href} key={item.nameKey}>
										<div
											className={`flex flex-col px-3 py-2.5 rounded-md text-sm transition-all ${
												location === item.href
													? "bg-primary text-primary-foreground shadow-sm"
													: "text-foreground hover:bg-accent hover:text-accent-foreground"
											}`}
											onClick={() => setCurrentPath(item.href)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													setCurrentPath(item.href)
												}
											}}
										>
											<div className="flex items-center">
												<Icon className="mr-3 h-5 w-5" />
												<span>{t(item.nameKey)}</span>
											</div>
											<span className="text-xs mt-0.5 opacity-70 pl-8">
												{t(item.descriptionKey)}
											</span>
										</div>
									</Link>
								)
							})}
						</nav>
						<div className="border-t border-border p-3">{renderDownloadButton()}</div>
					</div>
				</div>

				{/* Main Content */}
				<main className="flex-1 flex flex-col ">
					<div className="max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-hidden">{children}</div>
						<Toaster />
					</div>
				</main>
			</div>

			{/* Status bar */}
			<div className="h-6 z-40 border-t bg-card/50 text-xs text-muted-foreground px-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span>{t("layout.statusBar.ready")}</span>
					{renderSteamCmdStatus()}
					{activeDownloadItems.length > 0 && (
						<div className="flex items-center gap-1">
							<span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
							<span>
								{activeDownloadItems.length}{" "}
								{t(
									activeDownloadItems.length > 1
										? "layout.statusBar.downloads.inProgressPlural"
										: "layout.statusBar.downloads.inProgress"
								)}
							</span>
						</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					<span>v1.0.0</span>
					<span className="w-2 h-2 bg-green-500 rounded-full" />
				</div>
			</div>
		</div>
	)
}
