import {
	ArrowDownTrayIcon,
	XMarkIcon as Close,
	ArrowsPointingOutIcon as Maximize,
	MinusIcon as Minimize,
	ArrowsPointingInIcon as Restore,
	RocketLaunchIcon
} from "@heroicons/react/24/outline"
import { useStore } from "@nanostores/react"
import { LaunchButton } from "@renderer/components/instances/launch-button"
import { Button } from "@renderer/components/ui/button"
import { Toaster } from "@renderer/components/ui/toaster"
import { useTranslation } from "@renderer/hooks/useTranslation"

import { activeDownloads } from "@renderer/stores/downloads-store"
import { getInstancesArray, initInstances, isInitialized } from "@renderer/stores/instances-store"
import { navigationStore, setCurrentPath } from "@renderer/stores/navigation-store"
import { steamCmdStore } from "@renderer/stores/steamcmd-store"
import {
	closeWindow,
	initWindowState,
	isMaximizedStore,
	maximizeWindow,
	minimizeWindow
} from "@renderer/stores/window-store"
import type { GameInstance } from "@shared/types/instances"
import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
	const [location] = useLocation()
	const isMaximized = useStore(isMaximizedStore)
	const navigation = useStore(navigationStore)
	const steamCmdState = useStore(steamCmdStore)
	const activeDownloadItems = useStore(activeDownloads)
	const { t } = useTranslation()
	const [recentInstances, setRecentInstances] = useState<GameInstance[]>([])
	const [showQuickLaunch, setShowQuickLaunch] = useState(true)

	useEffect(() => {
		const checkHeight = () => {
			setShowQuickLaunch(window.innerHeight > 600)
		}

		checkHeight()
		window.addEventListener("resize", checkHeight)
		return () => window.removeEventListener("resize", checkHeight)
	}, [])

	useEffect(() => {
		initWindowState()
	}, [])

	useEffect(() => {
		setCurrentPath(location)
	}, [location])

	useEffect(() => {
		const loadInstances = async () => {
			if (!isInitialized()) {
				await initInstances()
			}

			const instances = getInstancesArray()
				.sort((a, b) => {
					const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
					const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
					return bTime - aTime
				})
				.slice(0, 3)

			setRecentInstances(instances)
		}

		loadInstances()

		const intervalId = setInterval(() => {
			loadInstances()
		}, 5000)

		return () => clearInterval(intervalId)
	}, [])

	const renderSteamCmdStatus = () => {
		switch (steamCmdState.status) {
			case "checking":
				return (
					<div className="flex items-center gap-1.5">
						<span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
						<span className="text-xs font-medium">{t("layout.statusBar.steamCmd.checking")}</span>
					</div>
				)
			case "not_available":
				return (
					<div className="flex items-center gap-1.5">
						<span className="w-2 h-2 bg-red-500 rounded-full" />
						<span className="text-xs font-medium">
							{t("layout.statusBar.steamCmd.notAvailable")}
						</span>
					</div>
				)
			case "installing":
				return (
					<div className="flex items-center gap-1.5">
						<span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
						<span className="text-xs font-medium">{t("layout.statusBar.steamCmd.installing")}</span>
					</div>
				)
			case "ready":
				return (
					<div className="flex items-center gap-1.5">
						<span className="w-2 h-2 bg-green-500 rounded-full" />
						<span className="text-xs font-medium">{t("layout.statusBar.steamCmd.ready")}</span>
					</div>
				)
			default:
				return null
		}
	}

	const renderDownloadButton = () => {
		const hasActiveDownloads = activeDownloadItems.length > 0

		return (
			<Link href="/downloads">
				<div
					className={`flex items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
						location === "/downloads"
							? "bg-primary/10 text-primary border border-primary/20"
							: "text-foreground hover:bg-accent hover:text-accent-foreground"
					}`}
					onClick={() => setCurrentPath("/downloads")}
					onKeyUp={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							setCurrentPath("/downloads")
						}
					}}
				>
					<div
						className={`relative flex items-center justify-center w-7 h-7 rounded-md ${location === "/downloads" ? "bg-primary/15" : "bg-muted"}`}
					>
						<ArrowDownTrayIcon
							className={`h-4 w-4 ${location === "/downloads" ? "text-primary" : ""} ${hasActiveDownloads ? "animate-pulse" : ""}`}
						/>
						{hasActiveDownloads && (
							<div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
								{activeDownloadItems.length}
							</div>
						)}
					</div>
					<div className="ml-3 flex-1 overflow-hidden">
						<div className="flex items-center">
							<span className={`font-medium ${location === "/downloads" ? "text-primary" : ""}`}>
								{t("layout.downloads")}
							</span>
							{hasActiveDownloads && (
								<span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
									{activeDownloadItems.length}
								</span>
							)}
						</div>
						<span
							className={`text-xs ${location === "/downloads" ? "text-primary/80" : "text-muted-foreground"}`}
						>
							{hasActiveDownloads
								? t("layout.activeDownloadsCount", { count: activeDownloadItems.length })
								: t("layout.manageDownloads")}
						</span>
					</div>
				</div>
			</Link>
		)
	}

	return (
		<div className="flex flex-col h-screen overflow-hidden bg-background select-none antialiased">
			<div className="h-12 flex items-center justify-between border-b bg-card pr-0 pl-4 drag shadow-sm">
				<div className="flex items-center space-x-2 no-drag">
					<div className="h-3 w-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
					<div className="h-3 w-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors" />
					<div className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors" />
				</div>
				<span className="text-sm font-semibold select-none">{t("layout.title")}</span>
				<div className="flex items-center no-drag h-full">
					<Button
						variant="ghost"
						size="icon"
						className="hover:bg-accent h-full w-12 rounded-none transition-colors"
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
						className="hover:bg-accent h-full w-12 rounded-none transition-colors"
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
						className="hover:bg-destructive hover:text-destructive-foreground h-full w-12 rounded-none transition-colors"
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
				<div className="flex w-72 flex-col bg-card border-r border-border shadow-sm relative">
					<div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#9ca3af_1px,transparent_1px)] [background-size:16px_16px]" />

					<div className="flex flex-col flex-1 relative z-10">
						<div className="px-4 pt-4 pb-3 border-b border-border/30">
							<h2 className="text-xl font-display font-semibold text-foreground">KnoxKit</h2>
							<p className="text-xs font-sans text-muted-foreground mt-1">{t("layout.subTitle")}</p>
						</div>

						<div className="px-3 py-3 border-b border-border/40">
							<nav className="space-y-1">
								{navigation.items.map((item) => {
									const Icon = item.icon
									const isActive = location === item.href

									return (
										<Link href={item.href} key={item.nameKey}>
											<div
												className={`flex items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
													isActive
														? "bg-accent text-accent-foreground"
														: "text-foreground hover:bg-accent/50 hover:text-accent-foreground"
												}`}
												onClick={() => setCurrentPath(item.href)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														setCurrentPath(item.href)
													}
												}}
											>
												<div
													className={`flex items-center justify-center w-7 h-7 rounded-md ${isActive ? "bg-accent/30" : "bg-muted"}`}
												>
													<Icon className="h-4 w-4" />
												</div>
												<div className="ml-3 flex-1 overflow-hidden">
													<span className="font-medium block">{t(item.nameKey)}</span>
													<span className="text-xs text-muted-foreground">
														{t(item.descriptionKey)}
													</span>
												</div>
											</div>
										</Link>
									)
								})}
							</nav>
						</div>

						{showQuickLaunch && (
							<div className="px-4 py-3 flex-1 overflow-y-auto">
								<h3 className="text-sm font-medium px-1 mb-3 flex items-center">
									<RocketLaunchIcon className="h-4 w-4 mr-2 text-muted-foreground" />
									{t("layout.recentInstances")}
								</h3>

								{recentInstances.length > 0 ? (
									<div className="space-y-2">
										{recentInstances.map((instance) => (
											<div
												key={instance.id}
												className="p-2 rounded-md bg-muted/20 hover:bg-accent/30 transition-colors border border-border/40"
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center overflow-hidden">
														<div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mr-2 border border-primary/20">
															<span className="text-xs font-bold text-primary">
																{instance.name.substring(0, 2).toUpperCase()}
															</span>
														</div>
														<div className="overflow-hidden">
															<div className="text-sm font-medium truncate max-w-[100px]">
																{instance.name}
															</div>
															<div className="flex items-center text-xs text-muted-foreground">
																<span className="truncate max-w-[100px]">
																	{instance.createdAt
																		? new Date(instance.createdAt).toLocaleDateString(undefined, {
																				month: "short",
																				day: "numeric"
																			})
																		: t("layout.unknown")}
																</span>
															</div>
														</div>
													</div>
													<LaunchButton
														instanceId={instance.id}
														status={instance.status}
														className="h-8 min-w-0 w-auto px-2"
													/>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-4">
										<div className="bg-muted/30 rounded-md p-4 border border-border/30">
											<RocketLaunchIcon className="h-6 w-6 mx-auto text-muted-foreground/60 mb-2" />
											<p className="text-xs text-muted-foreground">
												{t("layout.noRecentInstances")}
											</p>
											<Button variant="outline" size="sm" className="mt-2" asChild>
												<Link href="/">{t("layout.createInstance")}</Link>
											</Button>
										</div>
									</div>
								)}
							</div>
						)}

						<div className="mt-auto border-t border-border p-3 bg-card">
							<h3 className="text-xs font-medium px-1 mb-2 text-muted-foreground">
								{t("layout.utilities")}
							</h3>
							{renderDownloadButton()}

							{activeDownloadItems.length > 0 && (
								<div className="mt-2 mx-1 px-3 py-2 rounded-md bg-primary/5 border border-primary/10">
									<div className="flex items-center justify-between mb-1">
										<span className="text-xs font-medium text-primary">
											{t("layout.activeDownloads")}
										</span>
										<span className="text-xs text-muted-foreground">
											{activeDownloadItems.length}
										</span>
									</div>
									<div className="h-1.5 bg-muted rounded-full overflow-hidden">
										<div
											className="h-full bg-primary rounded-full animate-pulse"
											style={{ width: "35%" }}
										/>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<main className="flex-1 flex flex-col bg-background">
					<div className="max-w-7xl w-full mx-auto p-6 flex flex-col flex-1 overflow-hidden">
						<div className="flex-1 overflow-hidden rounded-lg">{children}</div>
						<Toaster />
					</div>
				</main>
			</div>

			<div className="h-8 z-40 border-t border-border bg-card text-xs flex items-center justify-between">
				<div className="flex items-center h-full divide-x divide-border/40">
					<div className="px-4 flex items-center gap-1.5 h-full border-r border-border/40">
						<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
						<span className="font-medium">{t("layout.statusBar.ready")}</span>
					</div>

					<div className="px-4 flex items-center h-full">{renderSteamCmdStatus()}</div>

					{activeDownloadItems.length > 0 && (
						<div className="px-4 flex items-center h-full border-l border-border/40">
							<div className="flex items-center gap-2">
								<div className="relative">
									<ArrowDownTrayIcon className="h-4 w-4" />
									<span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full flex items-center justify-center text-[8px] font-bold">
										{activeDownloadItems.length}
									</span>
								</div>
								<span className="font-medium">
									{t(
										activeDownloadItems.length > 1
											? "layout.statusBar.downloads.inProgressPlural"
											: "layout.statusBar.downloads.inProgress"
									)}
								</span>
							</div>
						</div>
					)}
				</div>

				<div className="flex items-center h-full">
					<div className="px-4 h-full flex items-center gap-3 text-muted-foreground border-l border-border/40">
						<span className="font-medium">1.0.0</span>
					</div>
				</div>
			</div>
		</div>
	)
}
