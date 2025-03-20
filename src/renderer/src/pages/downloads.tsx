import {
	ArrowPathIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ClockIcon,
	PauseIcon,
	PlayIcon,
	StopIcon,
	TagIcon,
	TrashIcon,
	UserIcon,
	XMarkIcon
} from "@heroicons/react/24/outline"
import { useStore } from "@nanostores/react"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from "@renderer/components/ui/collapsible"
import { Progress } from "@renderer/components/ui/progress"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import { toast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { formatDistance } from "@renderer/lib/date-utils"
import { formatBytes } from "@renderer/lib/format-utils"
import {
	activeDownloads,
	cancelDownload,
	clearFinishedDownloads,
	completedDownloads,
	downloadsStore,
	loadDownloads,
	pauseDownload,
	refreshStats,
	resumeDownload,
	retryDownload
} from "@renderer/stores/downloads-store"
import type {
	DownloadItem,
	DownloadModDetails,
	WorkshopCollectionMetadata,
	WorkshopItemMetadata
} from "@shared/types/downloads"
import { useEffect, useState } from "react"

export function DownloadsPage() {
	const { t } = useTranslation()
	const [activeTab, setActiveTab] = useState<"active" | "completed" | "all">("active")
	const storeState = useStore(downloadsStore)
	const active = useStore(activeDownloads)
	const completed = useStore(completedDownloads)
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

	useEffect(() => {
		loadDownloads()

		const interval = setInterval(() => {
			if (active.length > 0) {
				refreshStats()
			}
		}, 2000)

		return () => clearInterval(interval)
	}, [active.length])

	const toggleExpandItem = (id: string) => {
		setExpandedItems((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(id)) {
				newSet.delete(id)
			} else {
				newSet.add(id)
			}
			return newSet
		})
	}

	const getFilteredDownloads = () => {
		switch (activeTab) {
			case "active":
				return active
			case "completed":
				return completed
			default:
				return storeState.items
		}
	}

	const handleRefresh = async () => {
		await loadDownloads()
		toast({
			title: t("pages.downloads.toast.refreshed.title"),
			description: t("pages.downloads.toast.refreshed.description")
		})
	}

	const handleClearFinished = async () => {
		const count = await clearFinishedDownloads()
		toast({
			title: t("pages.downloads.toast.cleared.title"),
			description: t("pages.downloads.toast.cleared.description", { count })
		})
	}

	const renderStatus = (download: DownloadItem) => {
		switch (download.status) {
			case "downloading":
				return (
					<Badge variant="default" className="bg-blue-500">
						{t("pages.downloads.tabs.active")}
					</Badge>
				)
			case "paused":
				return <Badge variant="outline">{t("pages.downloads.status.paused")}</Badge>
			case "complete":
				return (
					<Badge variant="default" className="bg-green-500">
						{t("pages.downloads.tabs.completed")}
					</Badge>
				)
			case "failed":
				return <Badge variant="destructive">{t("pages.downloads.status.failed")}</Badge>
			case "cancelled":
				return (
					<Badge variant="outline" className="border-red-500 text-red-500">
						{t("pages.downloads.status.canceled")}
					</Badge>
				)
			case "pending":
				return <Badge variant="secondary">{t("pages.downloads.status.pending")}</Badge>
			case "error":
				return <Badge variant="destructive">{t("pages.downloads.status.error")}</Badge>
			default:
				return null
		}
	}

	const renderActions = (download: DownloadItem) => {
		if (download.status === "downloading") {
			return (
				<div className="flex gap-1">
					<Button size="icon" variant="outline" onClick={() => pauseDownload(download.id)}>
						<PauseIcon className="h-4 w-4" />
					</Button>
					<Button size="icon" variant="outline" onClick={() => cancelDownload(download.id)}>
						<StopIcon className="h-4 w-4" />
					</Button>
				</div>
			)
		}

		if (download.status === "paused") {
			return (
				<div className="flex gap-1">
					<Button size="icon" variant="outline" onClick={() => resumeDownload(download.id)}>
						<PlayIcon className="h-4 w-4" />
					</Button>
					<Button size="icon" variant="outline" onClick={() => cancelDownload(download.id)}>
						<XMarkIcon className="h-4 w-4" />
					</Button>
				</div>
			)
		}

		if (download.status === "error" || download.status === "failed") {
			return (
				<div className="flex gap-1">
					<Button size="icon" variant="outline" onClick={() => retryDownload(download.id)}>
						<ArrowPathIcon className="h-4 w-4" />
					</Button>
					<Button size="icon" variant="outline" onClick={() => cancelDownload(download.id)}>
						<XMarkIcon className="h-4 w-4" />
					</Button>
				</div>
			)
		}

		return null
	}

	const getModDetails = (download: DownloadItem): DownloadModDetails | null => {
		if (!download.metadata) return null

		const hasModsDetails = (
			metadata: Record<string, unknown>
		): metadata is WorkshopCollectionMetadata => {
			return (
				Array.isArray((metadata as WorkshopCollectionMetadata).modsDetails) &&
				(metadata as WorkshopCollectionMetadata).modsDetails!.length > 0
			)
		}

		if (download.type === "workshop_item") {
			const metadata = download.metadata as WorkshopItemMetadata
			return {
				id: metadata.workshopId || download.url || "",
				name: metadata.title || download.name,
				author: metadata.author,
				description: metadata.description,
				tags: Array.isArray(metadata.tags) ? metadata.tags : [],
				thumbnailUrl: metadata.thumbnailUrl || metadata.imageUrl,
				size: download.size,
				dateUpdated: metadata.dateUpdated,
				instanceId: download.targetId
			}
		}

		if (hasModsDetails(download.metadata)) {
			const firstMod = download.metadata.modsDetails![0]
			return {
				id: firstMod.id,
				name: firstMod.name,
				author: firstMod.author,
				description: firstMod.description,
				tags: Array.isArray(firstMod.tags) ? firstMod.tags : [],
				thumbnailUrl: firstMod.thumbnailUrl,
				instanceId: download.targetId
			}
		}

		const metadata = download.metadata
		return {
			id: (metadata.workshopId as string) || download.url || "",
			name: (metadata.title as string) || download.name,
			author: metadata.author as string,
			description: metadata.description as string,
			tags: Array.isArray(metadata.tags) ? (metadata.tags as string[]) : [],
			thumbnailUrl: (metadata.thumbnailUrl as string) || (metadata.imageUrl as string),
			size: download.size,
			instanceId: download.targetId
		}
	}

	const renderCollectionMods = (download: DownloadItem) => {
		if (download.type !== "workshop_collection" || !download.metadata) return null

		const collectionData = download.metadata as WorkshopCollectionMetadata

		const modsDetails = Array.isArray(collectionData.modsDetails) ? collectionData.modsDetails : []

		const isExpanded = expandedItems.has(download.id)

		if (
			modsDetails.length === 0 &&
			(!Array.isArray(collectionData.modIds) || collectionData.modIds.length === 0)
		) {
			return null
		}

		const modCount = Number(
			modsDetails.length ||
				(Array.isArray(collectionData.modIds) ? collectionData.modIds.length : 0) ||
				collectionData.modCount ||
				0
		)

		const renderCollectionStats = () => {
			return (
				<div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
					{collectionData.primaryTags && collectionData.primaryTags.length > 0 && (
						<div className="flex items-center gap-0.5">
							<TagIcon className="h-3 w-3" />
							<span className="truncate max-w-[150px]">
								{collectionData.primaryTags.slice(0, 3).join(", ")}
							</span>
						</div>
					)}
					{collectionData.totalSize && (
						<div className="flex items-center gap-0.5">
							<span>{formatBytes(collectionData.totalSize)}</span>
						</div>
					)}
				</div>
			)
		}

		return (
			<div className="w-full mt-2">
				{!isExpanded && renderCollectionStats()}

				<Collapsible
					open={isExpanded}
					onOpenChange={() => toggleExpandItem(download.id)}
					className="w-full border-t mt-1 pt-1"
				>
					<CollapsibleTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="flex items-center justify-between w-full px-2 py-0 h-6"
						>
							<span className="flex items-center gap-1">
								{isExpanded ? (
									<ChevronDownIcon className="h-3.5 w-3.5" />
								) : (
									<ChevronRightIcon className="h-3.5 w-3.5" />
								)}
								<span className="text-xs">
									{modCount} {t("pages.downloads.downloadInfo.mods")}
									{download.targetId && (
										<span className="ml-1">• Instance: {download.targetId.substring(0, 8)}</span>
									)}
								</span>
							</span>
						</Button>
					</CollapsibleTrigger>

					<CollapsibleContent className="px-2 pt-1">
						{isExpanded && renderCollectionStats()}
						<div className="space-y-1 max-h-48 overflow-y-auto pr-2">
							{modsDetails.slice(0, 5).map((mod) => (
								<div key={mod.id} className="flex gap-2 p-1.5 border rounded-md bg-muted/30">
									{mod.thumbnailUrl && (
										<img
											src={mod.thumbnailUrl}
											alt=""
											className="w-8 h-8 object-cover rounded-sm flex-shrink-0"
										/>
									)}
									<div className="flex-grow min-w-0">
										<p className="text-xs font-medium truncate">{mod.name}</p>
										{mod.author && (
											<span className="text-xs text-muted-foreground flex items-center gap-0.5">
												<UserIcon className="h-2.5 w-2.5" />
												{mod.author}
											</span>
										)}
									</div>
								</div>
							))}
							{modsDetails.length === 0 &&
								Array.isArray(collectionData.modIds) &&
								collectionData.modIds.length > 0 && (
									<div className="p-1.5 border rounded-md bg-muted/30">
										<p className="text-xs text-center">
											{collectionData.modIds.length} {t("pages.downloads.downloadInfo.mods")}
										</p>
									</div>
								)}
							{modsDetails.length > 5 && (
								<p className="text-xs text-muted-foreground text-center">
									+{modsDetails.length - 5} {t("pages.downloads.collectionMods.showMore")}
								</p>
							)}
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		)
	}

	const renderThumbnail = (download: DownloadItem, modDetails?: DownloadModDetails | null) => {
		const thumbnailUrl =
			modDetails?.thumbnailUrl ||
			(download.metadata?.thumbnailUrl as string) ||
			(download.metadata?.imageUrl as string)

		if (thumbnailUrl) {
			return (
				<img
					src={thumbnailUrl}
					alt={modDetails?.name || download.name}
					className="w-12 h-12 object-cover rounded-sm border flex-shrink-0"
					onError={(e) => {
						e.currentTarget.style.display = "none"
						if (e.currentTarget.nextElementSibling instanceof HTMLElement) {
							e.currentTarget.nextElementSibling.style.display = "flex"
						}
					}}
				/>
			)
		}

		return (
			<div className="w-12 h-12 bg-muted rounded-sm flex items-center justify-center flex-shrink-0">
				<div className="w-6 h-6 rounded-full bg-muted-foreground/20" />
			</div>
		)
	}

	const renderDownloadsList = (items: DownloadItem[]) => {
		if (items.length === 0) {
			return (
				<div className="rounded-lg border border-dashed p-6 text-center">
					<h3 className="text-lg font-semibold">{t("pages.downloads.emptyState.noDownloads")}</h3>
					<p className="text-sm text-muted-foreground mt-2">
						{activeTab === "active"
							? t("pages.downloads.emptyState.noActive")
							: activeTab === "completed"
								? t("pages.downloads.emptyState.noCompleted")
								: t("pages.downloads.emptyState.noDownloads")}
					</p>
				</div>
			)
		}

		return (
			<ScrollArea className="h-[calc(100vh-280px)] min-h-[300px] pr-4">
				<div className="space-y-2 pb-2">
					{items.map((download) => {
						const modDetails = getModDetails(download)

						return (
							<div
								key={download.id}
								className="border rounded-md p-3 hover:bg-muted/40 transition-colors"
							>
								<div className="flex items-start gap-3">
									{renderThumbnail(download, modDetails)}

									<div className="flex-1 min-w-0">
										<div className="flex justify-between items-start">
											<div className="space-y-0.5">
												<h4 className="font-medium truncate" title={download.name}>
													{download.name}
												</h4>

												<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
													<Badge variant="outline" className="capitalize text-xs h-5">
														{download.type}
													</Badge>
													{renderStatus(download)}
													{download.targetId && (
														<Badge
															variant="outline"
															className="text-xs h-5 bg-blue-500/10 text-blue-500 border-blue-500/20"
														>
															Instance: {download.targetId.substring(0, 8)}
														</Badge>
													)}
													{download.startTime && (
														<span className="flex items-center gap-0.5">
															<ClockIcon className="h-3 w-3" />
															{formatDistance(download.startTime, new Date(), { addSuffix: true })}
														</span>
													)}
												</div>
											</div>

											<div>{renderActions(download)}</div>
										</div>

										<div className="mt-2">
											<div className="flex justify-between text-xs text-muted-foreground mb-1">
												<div>
													{download.progress}% •{" "}
													{download.speed
														? `${formatBytes(download.speed)}/s`
														: `0 ${t("pages.downloads.units.bytesPerSec")}`}
												</div>
												<div>
													{download.downloaded !== undefined && download.size
														? `${formatBytes(download.downloaded)} / ${formatBytes(download.size)}`
														: formatBytes(download.size)}
												</div>
											</div>
											<Progress
												value={download.progress}
												className="h-1.5"
												indicatorClassName={
													download.status === "failed" || download.status === "error"
														? "bg-red-500"
														: download.status === "complete"
															? "bg-green-500"
															: undefined
												}
											/>
										</div>

										{download.type === "workshop_collection" && renderCollectionMods(download)}
									</div>
								</div>
							</div>
						)
					})}
				</div>
			</ScrollArea>
		)
	}

	const stats = storeState.stats || {
		active: 0,
		paused: 0,
		completed: 0,
		cancelled: 0,
		failed: 0,
		total: 0,
		avgSpeed: 0
	}

	return (
		<div className="space-y-4 container py-4 pb-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-bold tracking-tight md:text-2xl">
					{t("pages.downloads.title")}
				</h1>

				<div className="flex items-center gap-3 text-sm">
					<div className="text-xs text-muted-foreground">
						{stats.avgSpeed > 0 && <span>@ {formatBytes(stats.avgSpeed)}/s</span>}
					</div>
					<div className="hidden sm:flex items-center gap-1.5">
						<Badge
							variant="outline"
							className="bg-[hsl(var(--chart-1)_/_0.1)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)_/_0.2)]"
						>
							<PlayIcon className="h-3 w-3 mr-1" />
							{stats.active} {t("pages.downloads.stats.active")}
						</Badge>
						<Badge
							variant="outline"
							className="bg-[hsl(var(--chart-2)_/_0.1)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)_/_0.2)]"
						>
							<CheckIcon className="h-3 w-3 mr-1" />
							{stats.completed} {t("pages.downloads.stats.completed")}
						</Badge>
						<Badge
							variant="outline"
							className="bg-[hsl(var(--chart-3)_/_0.1)] text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3)_/_0.2)]"
						>
							<XMarkIcon className="h-3 w-3 mr-1" />
							{stats.failed} {t("pages.downloads.stats.failed")}
						</Badge>
					</div>
				</div>
			</div>

			<Tabs
				defaultValue="active"
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as "active" | "completed" | "all")}
				className="w-full"
			>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<TabsList className="mb-2 sm:mb-0">
						<TabsTrigger value="active">
							{t("pages.downloads.tabs.active")} ({active.length})
						</TabsTrigger>
						<TabsTrigger value="completed">
							{t("pages.downloads.tabs.completed")} ({completed.length})
						</TabsTrigger>
						<TabsTrigger value="all">
							{t("pages.downloads.tabs.all")} ({storeState.items.length})
						</TabsTrigger>
					</TabsList>

					<div className="flex space-x-2">
						{activeTab === "completed" && completed.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								className="h-8 px-2 flex items-center gap-1"
								onClick={handleClearFinished}
							>
								<TrashIcon className="h-3.5 w-3.5" />
								<span>{t("pages.downloads.buttons.clear")}</span>
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							className="h-8 px-2 flex items-center gap-1"
							onClick={handleRefresh}
						>
							<ArrowPathIcon className="h-3.5 w-3.5" />
							<span>{t("pages.downloads.buttons.refresh")}</span>
						</Button>
					</div>
				</div>

				<TabsContent value="active" className="mt-3">
					{renderDownloadsList(getFilteredDownloads())}
				</TabsContent>
				<TabsContent value="completed" className="mt-3">
					{renderDownloadsList(getFilteredDownloads())}
				</TabsContent>
				<TabsContent value="all" className="mt-3">
					{renderDownloadsList(getFilteredDownloads())}
				</TabsContent>
			</Tabs>
		</div>
	)
}
