import {
	ArrowPathIcon,
	LinkIcon,
	MagnifyingGlassIcon,
	PuzzlePieceIcon,
	TagIcon,
	TrashIcon
} from "@heroicons/react/24/outline"
import { useStore } from "@nanostores/react"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from "@renderer/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@renderer/components/ui/dialog"
import { Input } from "@renderer/components/ui/input"
import { ModImage } from "@renderer/components/ui/mod-image"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@renderer/components/ui/select"
import { Switch } from "@renderer/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@renderer/components/ui/tooltip"
import { useToast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"

import { getInstance, getInstancesArray } from "@renderer/stores/instances-store"
import { navigationStore, setActiveInstance } from "@renderer/stores/navigation-store"
import type { GameInstance } from "@shared/types/instances"
import type { ProcessedMod } from "@shared/types/workshop"
import Fuse from "fuse.js"
import { useEffect, useMemo, useState } from "react"

const useFuzzySearch = (items: ProcessedMod[], searchTerm: string) => {
	const fuse = useMemo(() => {
		return new Fuse(items, {
			keys: ["name", "description", "author", "tags"],
			threshold: 0.4,
			includeScore: true
		})
	}, [items])

	return useMemo(() => {
		if (!searchTerm) return items
		return fuse.search(searchTerm).map((result) => result.item)
	}, [fuse, searchTerm, items])
}

export default function ModsPage() {
	const { t } = useTranslation()
	const { toast } = useToast()
	const [instances, setInstances] = useState<GameInstance[]>([])
	const [selectedInstanceId, setSelectedInstanceId] = useState<string>("")
	const [loading, setLoading] = useState(false)
	const [mods, setMods] = useState<ProcessedMod[]>([])
	const [searchTerm, setSearchTerm] = useState("")
	const [modToDelete, setModToDelete] = useState<ProcessedMod | null>(null)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const navState = useStore(navigationStore)

	const filteredMods = useFuzzySearch(mods, searchTerm)

	useEffect(() => {
		const loadedInstances = getInstancesArray()
		setInstances(loadedInstances)

		if (navState.activeInstance && getInstance(navState.activeInstance)) {
			setSelectedInstanceId(navState.activeInstance)
		} else if (loadedInstances.length > 0) {
			setSelectedInstanceId(loadedInstances[0].id)
			setActiveInstance(loadedInstances[0].id)
		}
	}, [navState.activeInstance])

	useEffect(() => {
		if (!selectedInstanceId) return

		const loadModsForInstance = async () => {
			setLoading(true)
			try {
				const instanceMods = await window.api.mods.getForInstance(selectedInstanceId)
				setMods(instanceMods)
			} catch (error) {
				console.error("Failed to load mods:", error)
				setMods([])
			} finally {
				setLoading(false)
			}
		}

		loadModsForInstance()
	}, [selectedInstanceId])

	const handleInstanceChange = (value: string) => {
		setSelectedInstanceId(value)
		setActiveInstance(value)
	}

	const toggleMod = async (modId: string, enabled: boolean) => {
		try {
			const success = await window.api.mods.toggleMod(selectedInstanceId, modId, enabled)
			if (success) {
				setMods(mods.map((mod) => (mod.id === modId ? { ...mod, isEnabled: enabled } : mod)))
				toast({
					title: enabled ? t("mods.enabledToast") : t("mods.disabledToast"),
					description: enabled ? t("mods.modEnabled") : t("mods.modDisabled")
				})
			}
		} catch (error) {
			console.error(`Failed to toggle mod ${modId}:`, error)
			toast({
				title: t("mods.error"),
				description: t("mods.toggleError"),
				variant: "destructive"
			})
		}
	}

	const openWorkshopPage = async (workshopId: string) => {
		if (!workshopId) return
		try {
			await window.api.mods.openWorkshopPage(workshopId)
		} catch (error) {
			console.error(`Failed to open workshop page for ${workshopId}:`, error)
			toast({
				title: t("mods.error"),
				description: t("mods.workshopError"),
				variant: "destructive"
			})
		}
	}

	const confirmDeleteMod = (mod: ProcessedMod) => {
		setModToDelete(mod)
		setIsDeleteDialogOpen(true)
	}

	const deleteMod = async () => {
		if (!modToDelete) return

		try {
			setIsDeleteDialogOpen(false)
			const success = await window.api.mods.uninstallMod(selectedInstanceId, modToDelete.id)

			if (success) {
				setMods(mods.filter((mod) => mod.id !== modToDelete.id))
				toast({
					title: t("mods.uninstalledToast"),
					description: t("mods.modUninstalled")
				})
			}
		} catch (error) {
			console.error(`Failed to uninstall mod ${modToDelete.id}:`, error)
			toast({
				title: t("mods.error"),
				description: t("mods.uninstallError"),
				variant: "destructive"
			})
		} finally {
			setModToDelete(null)
		}
	}

	return (
		<div className="container mx-auto p-4">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
				<div className="flex flex-col">
					<h1 className="text-3xl font-bold flex items-center">{t("mods.title")}</h1>
					<p className="text-muted-foreground mt-1">{t("mods.description")}</p>
				</div>

				<div className="w-full md:w-64">
					<Select value={selectedInstanceId} onValueChange={handleInstanceChange}>
						<SelectTrigger className="gap-1">
							<SelectValue placeholder={t("mods.selectInstance")} />
						</SelectTrigger>
						<SelectContent>
							{instances.map((instance) => (
								<SelectItem key={instance.id} value={instance.id}>
									{instance.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<Tabs defaultValue="installed" className="w-full">
				<div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
					<TabsList>
						<TabsTrigger value="installed" defaultChecked>
							{t("mods.tabs.installed")}
						</TabsTrigger>
					</TabsList>

					<div className="relative w-full sm:w-80">
						<MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={t("mods.search")}
							className="pl-8"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
				</div>

				<TabsContent value="installed">
					{loading ? (
						<div className="flex justify-center items-center h-60">
							<ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
						</div>
					) : filteredMods.length > 0 ? (
						<ScrollArea className="h-[calc(100vh-220px)] pr-4">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{filteredMods.map((mod) => (
									<Card key={mod.id} className="overflow-hidden flex flex-col">
										<CardHeader className="pb-2">
											<div className="flex justify-between items-start gap-2">
												<div className="flex-1 min-w-0">
													<CardTitle className="text-lg truncate">{mod.name}</CardTitle>
													<CardDescription className="truncate">
														{mod.version || "No version"}
														{mod.author && ` • ${mod.author}`}
													</CardDescription>
												</div>
												<Switch
													checked={mod.isEnabled}
													onCheckedChange={(checked) => toggleMod(mod.id, checked)}
													className="mt-1"
												/>
											</div>
										</CardHeader>
										<CardContent className="pb-2 flex-1">
											<div className="mb-3">
												<ModImage
													src={mod.thumbnailUrl}
													alt={`${mod.name} thumbnail`}
													size="full"
													className="rounded-md"
												/>
											</div>
											<p className="text-sm line-clamp-3">
												{mod.description || "No description provided"}
											</p>

											{mod.tags && mod.tags.length > 0 && (
												<div className="flex flex-wrap gap-1.5 mt-3">
													{mod.tags.slice(0, 3).map((tag) => (
														<Badge variant="outline" key={`${mod.id}-${tag}`} className="text-xs">
															<TagIcon className="h-3 w-3 mr-1 inline" />
															{tag}
														</Badge>
													))}
													{mod.tags.length > 3 && (
														<Badge variant="outline" className="text-xs">
															+{mod.tags.length - 3}
														</Badge>
													)}
												</div>
											)}
										</CardContent>
										<CardFooter className="pt-2 flex gap-2 justify-between">
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="outline"
															size="icon"
															className="h-9 w-9"
															disabled={!mod.workshopId}
															onClick={() => mod.workshopId && openWorkshopPage(mod.workshopId)}
														>
															<LinkIcon className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>{t("mods.openWorkshop")}</TooltipContent>
												</Tooltip>
											</TooltipProvider>

											<Button
												variant="secondary"
												size="sm"
												className="flex-1"
												onClick={() => mod.workshopId && openWorkshopPage(mod.workshopId)}
											>
												{t("mods.details")}
											</Button>

											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="destructive"
															size="icon"
															className="h-9 w-9"
															onClick={() => confirmDeleteMod(mod)}
														>
															<TrashIcon className="h-4 w-4" />
														</Button>
													</TooltipTrigger>
													<TooltipContent>{t("mods.uninstall")}</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</CardFooter>
									</Card>
								))}
							</div>
							<div className="h-16" />
						</ScrollArea>
					) : (
						<div className="text-center p-10 border rounded-lg bg-card flex flex-col items-center">
							{searchTerm ? (
								<>
									<MagnifyingGlassIcon className="h-10 w-10 text-muted-foreground" />
									<h3 className="mt-4 text-lg font-medium">{t("mods.noSearchResults")}</h3>
									<p className="mt-2 text-muted-foreground max-w-md mx-auto">
										{t("mods.tryDifferentSearch")}
									</p>
									<Button className="mt-6" variant="outline" onClick={() => setSearchTerm("")}>
										{t("mods.clearSearch")}
									</Button>
								</>
							) : (
								<>
									<PuzzlePieceIcon className="h-10 w-10 text-muted-foreground" />
									<h3 className="mt-4 text-lg font-medium">{t("mods.noModsTitle")}</h3>
									<p className="mt-2 text-muted-foreground max-w-md mx-auto">
										{t("mods.noModsDescription")}
									</p>
									<Button className="mt-6">{t("mods.browseMods")}</Button>
								</>
							)}
						</div>
					)}
				</TabsContent>
			</Tabs>

			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("mods.confirmUninstall")}</DialogTitle>
						<DialogDescription>
							{modToDelete && (
								<span>{t("mods.uninstallDescription", { name: modToDelete.name })}</span>
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
							{t("mods.cancelButton")}
						</Button>
						<Button variant="destructive" onClick={deleteMod}>
							{t("mods.confirmUninstallButton")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
