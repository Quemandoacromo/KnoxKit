import { useStore } from "@nanostores/react"
import { Button } from "@renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@renderer/components/ui/dialog"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { Slider } from "@renderer/components/ui/slider"
import { Spinner } from "@renderer/components/ui/spinner"
import { Textarea } from "@renderer/components/ui/textarea"
import { toast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { logger } from "@renderer/lib/utils"
import { queueCollectionDownload } from "@renderer/stores/downloads-store"
import { settingsStore } from "@renderer/stores/settings-store"
import type { GameInstance } from "@shared/types/instances"
import type { SystemMemoryInfo } from "@shared/types/system"
import type { CompleteCollectionResult } from "@shared/types/workshop"
import { useEffect, useState } from "react"
import { useLocation } from "wouter"

interface CreateInstanceDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreate?: (
		instance: Omit<GameInstance, "id" | "createdAt" | "lastPlayed" | "playTime">
	) => Promise<void>
	collectionData?: CompleteCollectionResult
	redirectToDownloads?: boolean
}

export function CreateInstanceDialog({
	open,
	onOpenChange,
	onCreate,
	collectionData,
	redirectToDownloads = false
}: CreateInstanceDialogProps) {
	const { t } = useTranslation()
	const [instanceName, setInstanceName] = useState("")
	const [instanceDescription, setInstanceDescription] = useState("")
	const [memoryValue, setMemoryValue] = useState(4096)
	const [memoryInfo, setMemoryInfo] = useState<SystemMemoryInfo | null>(null)
	const [isCreating, setIsCreating] = useState(false)
	const [warningLevel, setWarningLevel] = useState<"safe" | "warning" | "danger">("safe")
	const [sliderMin, setSliderMin] = useState(1024)
	const [sliderMax, setSliderMax] = useState(8192)
	const [sliderStep, setSliderStep] = useState(512)
	const settings = useStore(settingsStore)
	const [, navigate] = useLocation()

	const formatMemory = (mb: number) => {
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(1)} GB`
		}
		return `${mb} MB`
	}

	useEffect(() => {
		if (open) {
			if (collectionData) {
				setInstanceName(collectionData.data?.title || "")
				setInstanceDescription(
					collectionData.data?.title || `Mods from collection ${collectionData.data.id}`
				)
			} else {
				setInstanceName("")
				setInstanceDescription("")
			}
		}
	}, [open, collectionData])

	useEffect(() => {
		if (!open) return

		async function fetchMemoryInfo() {
			try {
				const memInfo = await window.api.system.getMemoryInfo()
				const memOptions = await window.api.system.getMemoryOptions()

				setMemoryInfo(memInfo)

				setSliderMax(memInfo.totalMemoryMB)
				const minMemory = memOptions.length > 0 ? Math.min(memOptions[0], 1024) : 1024
				setSliderMin(minMemory)

				if (memInfo.totalMemoryMB < 4096) {
					setSliderStep(256)
				} else if (memInfo.totalMemoryMB > 16384) {
					setSliderStep(1024)
				} else {
					setSliderStep(512)
				}

				setMemoryValue(memInfo.recommendedGameMemoryMB)
			} catch (error) {
				logger.error(`Failed to fetch system memory info: ${error}`)
			}
		}

		fetchMemoryInfo()
	}, [open])

	useEffect(() => {
		if (!memoryInfo) return

		async function checkWarningLevel() {
			try {
				const level = await window.api.system.getMemoryWarningLevel(memoryValue)
				setWarningLevel(level)
			} catch (error) {
				logger.error(`Failed to get memory warning level: ${error}`)
			}
		}

		checkWarningLevel()
	}, [memoryValue, memoryInfo])

	const handleCreateInstance = async () => {
		if (!instanceName.trim()) {
			toast({
				title: t("instances.components.createDialog.nameRequired.title"),
				description: t("instances.components.createDialog.nameRequired.description"),
				variant: "destructive"
			})
			return
		}

		setIsCreating(true)

		try {
			const instanceData: Omit<GameInstance, "id" | "createdAt" | "lastPlayed" | "playTime"> = {
				name: instanceName,
				description: instanceDescription,
				memoryAllocation: memoryValue,
				gameVersion: "stable" as const,
				path: settings.instancesDirectory || "",
				customOptions: {},
				modsEnabled: true,
				updatedAt: new Date(),
				modIds: [],
				collectionData: collectionData,
				totalModsSize: collectionData?.totalSize || 0,
				modsCount: collectionData?.data?.modCount || 0,

				status: "Downloading"
			}

			let createdInstance: GameInstance | undefined
			if (onCreate) {
				await onCreate(instanceData)

				const instances = await window.api.instances.getAll()
				createdInstance = instances.find(
					(i) =>
						i.name === instanceName && Math.abs(new Date(i.createdAt).getTime() - Date.now()) < 5000
				)

				if (!createdInstance) {
					throw new Error("Failed to find created instance")
				}
			} else {
				throw new Error("onCreate handler is not provided")
			}

			onOpenChange(false)

			if (collectionData && !collectionData.error && createdInstance) {
				try {
					await window.api.instances.update(createdInstance.id, { status: "Downloading" })

					await queueCollectionDownload(collectionData, createdInstance.id)

					toast({
						title: t("instances.components.createDialog.downloadStarted.title"),
						description: t("instances.components.createDialog.downloadStarted.description", {
							count: collectionData.data.modCount
						}),
						variant: "default"
					})

					if (redirectToDownloads && window.api.downloads) {
						setTimeout(() => {
							navigate("/downloads")
						}, 500)
					}
				} catch (error) {
					logger.error(`Failed to queue collection download: ${error}`)
					toast({
						title: t("instances.components.createDialog.downloadError.title"),
						description: t("instances.components.createDialog.downloadError.description"),
						variant: "destructive"
					})
				}
			}
		} catch (error) {
			logger.error(`Error in create instance dialog: ${error}`)
			toast({
				title: t("instances.components.createDialog.error.title"),
				description: t("instances.components.createDialog.error.description", {
					message: error instanceof Error ? error.message : String(error)
				}),
				variant: "destructive"
			})
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{collectionData
							? t("instances.components.createDialog.fromCollection")
							: t("instances.components.createDialog.new")}
					</DialogTitle>
					<DialogDescription>
						{collectionData
							? t("instances.components.createDialog.fromCollectionDesc")
							: t("instances.components.createDialog.newDesc")}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-3">
					<div className="grid gap-2">
						<Label htmlFor="instanceName">{t("instances.components.createDialog.name")}</Label>
						<Input
							id="instanceName"
							value={instanceName}
							onChange={(e) => setInstanceName(e.target.value)}
							placeholder="My PZ Instance"
							disabled={isCreating}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="instanceDescription">
							{t("instances.components.createDialog.description")}
						</Label>
						<Textarea
							id="instanceDescription"
							value={instanceDescription}
							onChange={(e) => setInstanceDescription(e.target.value)}
							placeholder="Description of this instance"
							rows={2}
							disabled={isCreating}
						/>
					</div>

					<div className="grid gap-2">
						<div className="flex justify-between">
							<Label htmlFor="memory">
								{t("instances.components.createDialog.memory.allocation")}
							</Label>
							{memoryValue && (
								<span className="text-sm font-medium">{formatMemory(memoryValue)}</span>
							)}
						</div>

						<div className="pt-2">
							<Slider
								id="memory"
								min={sliderMin}
								max={sliderMax}
								step={sliderStep}
								value={[memoryValue]}
								onValueChange={([value]) => setMemoryValue(value)}
								disabled={!memoryInfo || isCreating}
							/>
							<div className="flex justify-between text-xs text-muted-foreground mt-1">
								<span>{formatMemory(sliderMin)}</span>
								<span>{formatMemory(sliderMax)}</span>
							</div>
						</div>

						{memoryInfo && (
							<div className="text-xs text-muted-foreground mt-1">
								<span>
									{t("instances.components.createDialog.memory.systemRam")}{" "}
									{formatMemory(memoryInfo.totalMemoryMB)}
								</span>
								{memoryInfo.recommendedGameMemoryMB !== memoryValue && (
									<span className="text-blue-500 block mt-1">
										{t("instances.components.createDialog.memory.recommended")}{" "}
										{formatMemory(memoryInfo.recommendedGameMemoryMB)}
									</span>
								)}
							</div>
						)}

						{warningLevel !== "safe" && (
							<p className="text-xs text-amber-500 mt-1">
								{warningLevel === "danger"
									? t("instances.components.createDialog.memory.highWarning")
									: t("instances.components.createDialog.memory.mediumWarning")}
							</p>
						)}
					</div>

					{collectionData && (
						<div className="bg-muted/50 p-2 rounded-lg text-sm">
							<p className="font-medium">
								{t("instances.components.createDialog.collection.info")} {collectionData.data.title}
							</p>
							<p className="text-muted-foreground">
								{t("instances.components.createDialog.collection.modsCount", {
									count: collectionData.data.modCount || collectionData.data.modIds?.length || 0
								})}
							</p>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
						{t("instances.components.createDialog.buttons.cancel")}
					</Button>
					<Button onClick={handleCreateInstance} disabled={isCreating || !instanceName.trim()}>
						{isCreating ? (
							<>
								<Spinner className="mr-2 h-4 w-4" />
								{t("instances.components.createDialog.buttons.creating")}
							</>
						) : (
							t("instances.components.createDialog.buttons.create")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
