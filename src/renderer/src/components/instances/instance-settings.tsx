import { Cog6ToothIcon } from "@heroicons/react/24/outline"
import {
	CheckCircleIcon,
	ExclamationCircleIcon,
	ExclamationTriangleIcon
} from "@heroicons/react/24/outline"
import { Alert, AlertDescription } from "@renderer/components/ui/alert"
import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from "@renderer/components/ui/dialog"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { Slider } from "@renderer/components/ui/slider"
import { Spinner } from "@renderer/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { logger } from "@renderer/lib/utils"
import { updateInstance } from "@renderer/stores/instances-store"
import type { GameInstance } from "@shared/types/instances"
import type { SystemMemoryInfo as MemoryInfo } from "@shared/types/system"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

interface InstanceSettingsProps {
	instance: GameInstance
	children?: ReactNode
}

export function InstanceSettings({ instance, children }: InstanceSettingsProps) {
	const { t } = useTranslation()
	const [open, setOpen] = useState(false)
	const [memory, setMemory] = useState(instance.memoryAllocation || 3072)
	const [, setMemoryOptions] = useState<number[]>([1024, 2048, 3072, 4096, 6144, 8192])
	const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null)
	const [warningLevel, setWarningLevel] = useState<"safe" | "warning" | "danger">("safe")
	const [description, setDescription] = useState(instance.description || "")
	const [launchArgs, setLaunchArgs] = useState<string>(
		Array.isArray(instance.customOptions?.launchArgs)
			? (instance.customOptions.launchArgs as string[]).join(" ")
			: ""
	)
	const [sliderMin, setSliderMin] = useState(1024)
	const [sliderMax, setSliderMax] = useState(8192)
	const [sliderStep, setSliderStep] = useState(512)
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		if (!open) return

		async function fetchMemoryInfo() {
			setIsLoading(true)

			try {
				setMemory(instance.memoryAllocation || 3072)
				setDescription(instance.description || "")
				setLaunchArgs(
					Array.isArray(instance.customOptions?.launchArgs)
						? (instance.customOptions.launchArgs as string[]).join(" ")
						: ""
				)

				const memInfo = await window.api.system.getMemoryInfo()
				const memOptions = await window.api.system.getMemoryOptions()

				setMemoryInfo(memInfo)
				setMemoryOptions(memOptions)

				const maxMemory = Math.max(memInfo.totalMemoryMB, 2048)
				setSliderMax(maxMemory)

				const minMemory = memOptions.length > 0 ? Math.min(memOptions[0], 1024) : 1024
				setSliderMin(minMemory)

				if (maxMemory < 4096) {
					setSliderStep(256)
				} else if (maxMemory > 16384) {
					setSliderStep(1024)
				} else {
					setSliderStep(512)
				}

				if (
					(instance.memoryAllocation && instance.memoryAllocation > maxMemory) ||
					(instance.memoryAllocation && instance.memoryAllocation < minMemory)
				) {
					setMemory(memInfo.recommendedGameMemoryMB)
				} else {
					setMemory(instance.memoryAllocation || memInfo.recommendedGameMemoryMB)
				}

				const level = await window.api.system.getMemoryWarningLevel(
					instance.memoryAllocation || memInfo.recommendedGameMemoryMB
				)
				setWarningLevel(level)
			} catch (error) {
				logger.error(`Failed to fetch system memory info:${error}`)
			} finally {
				setIsLoading(false)
			}
		}

		fetchMemoryInfo()
	}, [open, instance])

	useEffect(() => {
		if (!memoryInfo || !open || isLoading) return

		async function checkWarningLevel() {
			try {
				const level = await window.api.system.getMemoryWarningLevel(memory)
				setWarningLevel(level)
			} catch (error) {
				logger.error(`Failed to get memory warning level: ${error}`)
			}
		}

		checkWarningLevel()
	}, [memory, memoryInfo, open, isLoading])

	const handleSave = () => {
		// Parse launch arguments from space-separated string to array
		const launchArgsArray = launchArgs
			.split(" ")
			.filter(Boolean)
			.map((arg) => arg.trim())

		updateInstance(instance.id, {
			memoryAllocation: memory,
			description,
			customOptions: {
				...instance.customOptions,
				launchArgs: launchArgsArray.length > 0 ? launchArgsArray : undefined
			}
		})
		setOpen(false)
	}

	const formatMemory = (mb: number) => {
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(1)} GB`
		}
		return `${mb} MB`
	}

	const loadingContent = (
		<div className="py-12 flex flex-col items-center justify-center">
			<Spinner className="h-8 w-8 mb-4" />
			<p className="text-sm text-muted-foreground">{t("instances.components.settings.loading")}</p>
		</div>
	)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
				{children || (
					<Button variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
						<Cog6ToothIcon className="h-4 w-4" />
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t("instances.components.settings.title")}</DialogTitle>
					<DialogDescription>
						{t("instances.components.settings.configureFor", { name: instance.name })}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					loadingContent
				) : (
					<>
						<Tabs defaultValue="general">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="general">
									{t("instances.components.settings.tabs.general")}
								</TabsTrigger>
								<TabsTrigger value="advanced">
									{t("instances.components.settings.tabs.advanced")}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="general" className="space-y-4 py-4">
								<div className="space-y-2">
									<div className="flex justify-between">
										<Label htmlFor="memory">
											{t("instances.components.settings.memory.allocation")}
										</Label>
										<Badge variant="outline" className="text-xs">
											{formatMemory(memory)}
										</Badge>
									</div>

									<div className="pt-2">
										<Slider
											id="memory"
											min={sliderMin}
											max={sliderMax}
											step={sliderStep}
											value={[memory]}
											onValueChange={([value]) => setMemory(value)}
										/>
										<div className="flex justify-between text-xs text-muted-foreground mt-1">
											<span>{formatMemory(sliderMin)}</span>
											<span>{formatMemory(sliderMax)}</span>
										</div>
									</div>

									{memoryInfo && (
										<div className="text-xs text-muted-foreground mt-1 flex flex-col">
											<span>
												{t("instances.components.settings.memory.systemRam")}{" "}
												{formatMemory(memoryInfo.totalMemoryMB)}
											</span>
											{memoryInfo.recommendedGameMemoryMB !== memory && (
												<span className="text-blue-500">
													{t("instances.components.settings.memory.recommended")}{" "}
													{formatMemory(memoryInfo.recommendedGameMemoryMB)}
												</span>
											)}
										</div>
									)}

									{warningLevel !== "safe" && (
										<Alert
											variant={warningLevel === "danger" ? "destructive" : "default"}
											className="mt-2"
										>
											{warningLevel === "danger" ? (
												<ExclamationCircleIcon className="h-4 w-4" />
											) : (
												<ExclamationTriangleIcon className="h-4 w-4" />
											)}
											<AlertDescription>
												{warningLevel === "danger"
													? t("instances.components.settings.memory.warnings.high")
													: t("instances.components.settings.memory.warnings.medium")}
											</AlertDescription>
										</Alert>
									)}

									{warningLevel === "safe" && memoryInfo && (
										<div className="flex items-center gap-2 text-xs text-green-500 mt-2">
											<CheckCircleIcon className="h-4 w-4" />
											<span>{t("instances.components.settings.memory.warnings.safe")}</span>
										</div>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="description">
										{t("instances.components.settings.description")}
									</Label>
									<Input
										id="description"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
									/>
								</div>
							</TabsContent>

							<TabsContent value="advanced" className="space-y-4 py-4">
								<div className="space-y-2">
									<Label>{t("instances.components.settings.launchArgs.label")}</Label>
									<Input
										placeholder="-debug -safemode"
										value={launchArgs}
										onChange={(e) => setLaunchArgs(e.target.value)}
									/>
									<p className="text-sm text-muted-foreground">
										{t("instances.components.settings.launchArgs.description")}
									</p>
								</div>
							</TabsContent>
						</Tabs>

						<DialogFooter>
							<Button variant="outline" onClick={() => setOpen(false)}>
								{t("instances.components.settings.buttons.cancel")}
							</Button>
							<Button onClick={handleSave}>
								{t("instances.components.settings.buttons.save")}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
