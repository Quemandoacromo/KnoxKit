import { ArrowDownTrayIcon } from "@heroicons/react/24/outline"
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@renderer/components/ui/select"
import { Spinner } from "@renderer/components/ui/spinner"
import { toast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { logger } from "@renderer/lib/utils"
import { queueWorkshopItemDownload } from "@renderer/stores/downloads-store"
import { getInstancesArray, initInstances, isInitialized } from "@renderer/stores/instances-store"
import type { ProcessedMod } from "@shared/types/workshop"
import { useEffect, useState } from "react"
import { useLocation } from "wouter"

interface ImportModDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	redirectToDownloads?: boolean
	initialUrl?: string
	onClose?: () => void
}

export function ImportModDialog({
	open,
	onOpenChange,
	redirectToDownloads = false,
	initialUrl = "",
	onClose
}: ImportModDialogProps) {
	const { t } = useTranslation()
	const [modUrl, setModUrl] = useState("")
	const [selectedInstance, setSelectedInstance] = useState<string>("")
	const [isLoading, setIsLoading] = useState(false)
	const [instances, setInstances] = useState<ReturnType<typeof getInstancesArray>>([])
	const [modDetails, setModDetails] = useState<ProcessedMod | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [, navigate] = useLocation()

	useEffect(() => {
		if (open) {
			loadInstances()
			// Reset the form
			setModUrl(initialUrl || "")
			setSelectedInstance("")
			setModDetails(null)
			setError(null)

			// Auto-fetch if there is an initial URL
			if (initialUrl) {
				handleFetchModDetailsWithUrl(initialUrl)
			}
		}
	}, [open, initialUrl])

	const handleFetchModDetailsWithUrl = async (url: string) => {
		const modId = extractModId(url)
		if (!modId) {
			setError(t("modImport.errors.invalidUrl"))
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const response = await window.api.steam.getModDetails(modId)
			if (!response) {
				throw new Error("Failed to fetch mod details")
			}

			if ("error" in response) {
				throw new Error(String(response.error))
			}

			setModDetails(response as ProcessedMod)
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error))
		} finally {
			setIsLoading(false)
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		onOpenChange(newOpen)
		if (!newOpen && onClose) {
			onClose()
		}
	}

	async function loadInstances() {
		try {
			if (!isInitialized()) {
				await initInstances()
			}
			const instancesArray = getInstancesArray()
			setInstances(
				instancesArray.filter((i) => i.status !== "Downloading" && i.status !== "Running")
			)
		} catch (error) {
			logger.error(`Failed to load instances: ${error}`)
			toast({
				title: t("modImport.errors.loadInstancesFailed"),
				description: String(error),
				variant: "destructive"
			})
		}
	}

	const extractModId = (input: string): string | null => {
		if (/^\d+$/.test(input)) {
			return input
		}

		const urlMatch = input.match(/[?&]id=(\d+)/)
		if (urlMatch?.[1]) {
			return urlMatch[1]
		}

		return null
	}

	const handleFetchModDetails = async () => {
		const modId = extractModId(modUrl)
		if (!modId) {
			setError(t("modImport.errors.invalidUrl"))
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const response = await window.api.steam.getModDetails(modId)
			if (!response) {
				throw new Error("Failed to fetch mod details")
			}

			if ("error" in response) {
				throw new Error(String(response.error))
			}

			setModDetails(response as ProcessedMod)
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error))
		} finally {
			setIsLoading(false)
		}
	}

	const handleImportMod = async () => {
		if (!modDetails || !selectedInstance) {
			setError(t("modImport.errors.missingDetails"))
			return
		}

		setIsLoading(true)

		try {
			await queueWorkshopItemDownload({
				workshopId: modDetails.id,
				name: modDetails.name,
				instanceId: selectedInstance,
				metadata: modDetails
			})

			toast({
				title: t("modImport.success.title"),
				description: t("modImport.success.description", { name: modDetails.name })
			})

			onOpenChange(false)

			if (redirectToDownloads) {
				setTimeout(() => {
					navigate("/downloads")
				}, 300)
			}
		} catch (error) {
			setError(error instanceof Error ? error.message : String(error))
			toast({
				title: t("modImport.errors.importFailed"),
				description: error instanceof Error ? error.message : String(error),
				variant: "destructive"
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("modImport.title")}</DialogTitle>
					<DialogDescription>{t("modImport.description")}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-3">
					<div className="grid gap-2">
						<Label htmlFor="mod-url">{t("modImport.modUrl")}</Label>
						<div className="flex gap-2">
							<Input
								id="mod-url"
								value={modUrl}
								onChange={(e) => setModUrl(e.target.value)}
								placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=2988570183"
								disabled={isLoading || !!modDetails}
							/>
							<Button
								onClick={handleFetchModDetails}
								disabled={isLoading || !modUrl || !!modDetails}
								variant="secondary"
							>
								{isLoading && !modDetails ? <Spinner className="mr-2 h-4 w-4" /> : null}
								{t("modImport.fetch")}
							</Button>
						</div>
						{error && <p className="text-sm text-destructive">{error}</p>}
					</div>

					{modDetails && (
						<div className="bg-muted rounded-md p-3 space-y-2">
							<div className="flex items-center gap-3">
								{modDetails.thumbnailUrl ? (
									<img
										src={modDetails.thumbnailUrl}
										alt=""
										className="w-12 h-12 rounded object-cover"
									/>
								) : (
									<div className="w-12 h-12 bg-background rounded flex items-center justify-center">
										<ArrowDownTrayIcon className="h-6 w-6 text-muted-foreground" />
									</div>
								)}
								<div>
									<h3 className="font-medium text-sm">{modDetails.name}</h3>
									<p className="text-xs text-muted-foreground">
										{modDetails.author ? `${t("modImport.by")} ${modDetails.author}` : ""}
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="text-xs"
								onClick={() => setModDetails(null)}
							>
								{t("modImport.clearSelection")}
							</Button>
						</div>
					)}

					{instances.length > 0 ? (
						<div className="grid gap-2">
							<Label htmlFor="instance">{t("modImport.selectInstance")}</Label>
							<Select
								value={selectedInstance}
								onValueChange={setSelectedInstance}
								disabled={isLoading || !modDetails}
							>
								<SelectTrigger id="instance">
									<SelectValue placeholder={t("modImport.selectInstancePlaceholder")} />
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
					) : (
						<div className="text-center p-4 text-muted-foreground text-sm border rounded-md bg-muted/50">
							{t("modImport.noInstances")}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
						{t("modImport.cancel")}
					</Button>
					<Button
						onClick={handleImportMod}
						disabled={isLoading || !selectedInstance || !modDetails}
					>
						{isLoading ? (
							<>
								<Spinner className="mr-2 h-4 w-4" />
								{t("modImport.importing")}
							</>
						) : (
							t("modImport.import")
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
