import {
	ArchiveBoxIcon,
	ArrowPathIcon,
	CheckCircleIcon,
	ClockIcon,
	Cog6ToothIcon,
	ExclamationTriangleIcon,
	FolderOpenIcon,
	InformationCircleIcon,
	PlayIcon,
	TrashIcon
} from "@heroicons/react/24/outline"
import { memo } from "react"

import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@renderer/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@renderer/components/ui/dropdown-menu"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import { Separator } from "@renderer/components/ui/separator"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@renderer/components/ui/tooltip"

import { InstanceSettings } from "@renderer/components/instances/instance-settings"
import { LaunchButton } from "@renderer/components/instances/launch-button"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { logger } from "@renderer/lib/utils"
import type { GameInstance } from "@shared/types/instances"

interface InstanceCardProps {
	instance: GameInstance
	onDuplicate: (id: string) => void
	onDelete: (id: string | null) => void
}

export const InstanceCard = memo(
	function InstanceCard({ instance, onDelete }: InstanceCardProps) {
		const { t } = useTranslation()

		const getStatusIcon = (status: string) => {
			switch (status) {
				case "Ready":
					return <CheckCircleIcon className="h-4 w-4 text-primary-foreground" />
				case "Running":
					return <PlayIcon className="h-4 w-4 text-chart-4" />
				case "Updating":
					return <ArrowPathIcon className="h-4 w-4 text-chart-4 animate-spin" />
				case "Error":
					return <ExclamationTriangleIcon className="h-4 w-4 text-destructive-foreground" />
				case "Outdated":
					return <ExclamationTriangleIcon className="h-4 w-4 text-chart-4" />
				default:
					return null
			}
		}

		const getStatusVariant = (
			status: string
		): "default" | "outline" | "secondary" | "destructive" => {
			switch (status) {
				case "Ready":
					return "default"
				case "Running":
					return "secondary"
				case "Updating":
					return "secondary"
				case "Error":
					return "destructive"
				case "Outdated":
					return "outline"
				default:
					return "secondary"
			}
		}

		const getStatusBorderColor = (status: string): string => {
			switch (status) {
				case "Ready":
					return "border-primary/50"
				case "Running":
					return "border-chart-4/50"
				case "Updating":
					return "border-chart-4/50"
				case "Error":
					return "border-destructive/50"
				case "Outdated":
					return "border-chart-5/50"
				default:
					return "border-muted"
			}
		}

		const handleOpenFolder = async () => {
			try {
				await window.api.instances.openDirectory(instance.id)
			} catch (error) {
				logger.error(`Error opening folder for instance ${instance.id}: ${error}`)
			}
		}

		const formatPlaytime = (minutes: number) => {
			if (minutes < 60) return `${minutes} minutes`
			const hours = Math.floor(minutes / 60)
			const mins = minutes % 60
			return `${hours}h ${mins > 0 ? `${mins}m` : ""}`
		}

		const modsCount =
			instance.installedMods?.length ||
			instance.modsCount ||
			(Array.isArray(instance.modIds) ? instance.modIds.length : 0) ||
			0

		return (
			<Card
				className={`
						overflow-hidden flex flex-col
						${getStatusBorderColor(instance.status)}
					`}
			>
				<div
					className={`h-1 w-full bg-gradient-to-r 
						${
							instance.status === "Ready"
								? "from-primary to-primary/30"
								: instance.status === "Running"
									? "from-chart-4 to-chart-4/30"
									: instance.status === "Updating"
										? "from-chart-4 to-chart-2/30"
										: instance.status === "Error"
											? "from-destructive to-destructive/30"
											: "from-chart-5 to-chart-5/30"
						}`}
				/>

				<CardHeader className="pb-2 relative space-y-2">
					<div className="flex flex-col space-y-2">
						<div className="flex justify-between items-center w-full">
							<CardTitle className="text-lg font-bold flex items-center gap-1.5 max-w-[70%]">
								<span className="truncate">{instance.name}</span>
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<InformationCircleIcon className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											<div className="space-y-1">
												<p className="font-semibold">{instance.name}</p>
												<p className="text-sm text-muted-foreground">
													{instance.description || t("instances.components.card.noDescription")}
												</p>
											</div>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</CardTitle>
							<Badge
								variant={getStatusVariant(instance.status)}
								className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
							>
								{getStatusIcon(instance.status)}
								{instance.status}
							</Badge>
						</div>
						{instance.description && (
							<p className="text-muted-foreground text-xs line-clamp-1">{instance.description}</p>
						)}
					</div>
				</CardHeader>

				<CardContent className="pb-2 flex-1">
					<ScrollArea className="h-[100px] pr-4">
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2 text-sm">
								<div className="bg-muted/50 p-1.5 rounded-md">
									<ArchiveBoxIcon className="h-4 w-4 text-muted-foreground" />
								</div>
								<div>
									<span className="font-medium">{modsCount}</span>{" "}
									{modsCount === 1
										? t("instances.components.card.mod")
										: t("instances.components.card.mods")}{" "}
									{t("instances.components.card.installed")}
									{modsCount > 0 && instance.installedMods && instance.installedMods[0] && (
										<div className="text-xs text-muted-foreground truncate max-w-[200px]">
											{t("instances.components.card.including")}{" "}
											{instance.installedMods[0].name || t("instances.components.card.unnamedMod")}
											{instance.installedMods.length > 1
												? ` + ${instance.installedMods.length - 1} ${t("instances.components.card.more")}`
												: ""}
										</div>
									)}
								</div>
							</div>

							<div className="flex items-center gap-2 text-sm">
								<div className="bg-muted/50 p-1.5 rounded-md">
									<ClockIcon className="h-4 w-4 text-muted-foreground" />
								</div>
								<div>
									{instance.playTime && instance.playTime > 0 ? (
										<>
											<span className="font-medium">{formatPlaytime(instance.playTime)}</span>
											<div className="text-xs text-muted-foreground">
												{t("instances.components.card.lastPlayed")}:{" "}
												{t("instances.components.card.recently")}
											</div>
										</>
									) : (
										<>
											<span>{t("instances.components.card.neverPlayed")}</span>
											<div className="text-xs text-muted-foreground">
												{t("instances.components.card.readyToLaunch")}
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</ScrollArea>
				</CardContent>

				<Separator className="opacity-50" />

				<CardFooter className="flex justify-between pt-4">
					<LaunchButton instanceId={instance.id} status={instance.status} />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon">
								<span className="sr-only">{t("instances.components.card.openMenu")}</span>
								<span>⋯</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuLabel>{t("instances.components.card.actions")}</DropdownMenuLabel>
							<DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
								<InstanceSettings instance={instance}>
									<div
										className="flex items-center gap-2 cursor-pointer w-full"
										onClick={(e) => e.stopPropagation()}
										onKeyDown={(e) => e.key === "Enter" && e.stopPropagation}
									>
										<Cog6ToothIcon className="h-4 w-4" /> {t("instances.components.card.settings")}
									</div>
								</InstanceSettings>
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex items-center gap-2 cursor-pointer"
								onClick={handleOpenFolder}
							>
								<FolderOpenIcon className="h-4 w-4" /> {t("instances.components.card.openFolder")}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="flex items-center gap-2 cursor-pointer text-destructive"
								onClick={() => onDelete(instance.id)}
							>
								<TrashIcon className="h-4 w-4" /> {t("instances.components.card.delete")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardFooter>
			</Card>
		)
	},
	(prevProps, nextProps) => {
		// Only re-render if something relevant has changed
		const prevInstance = prevProps.instance
		const nextInstance = nextProps.instance

		const hasChanged =
			prevInstance.status !== nextInstance.status ||
			prevInstance.name !== nextInstance.name ||
			prevInstance.description !== nextInstance.description ||
			prevInstance.playTime !== nextInstance.playTime ||
			(prevInstance.modIds?.length ?? 0) !== (nextInstance.modIds?.length ?? 0) ||
			(prevInstance.installedMods?.length ?? 0) !== (nextInstance.installedMods?.length ?? 0) ||
			(prevInstance.modsCount ?? 0) !== (nextInstance.modsCount ?? 0)

		if (hasChanged) {
			logger.info(
				`InstanceCard will update: ${nextInstance.id} - Status change: ${prevInstance.status} -> ${nextInstance.status}`
			)
		}

		return !hasChanged
	}
)
