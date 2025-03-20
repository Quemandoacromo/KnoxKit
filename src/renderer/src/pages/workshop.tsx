import {
	ArrowDownTrayIcon,
	CubeIcon,
	DocumentTextIcon,
	PuzzlePieceIcon
} from "@heroicons/react/24/outline"
import { useStore } from "@nanostores/react"
import { CreateInstanceDialog } from "@renderer/components/instances/create-instance"
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
import { ImportModDialog } from "@renderer/components/workshop/import-mod-dialog"

import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"

import { ScrollArea } from "@renderer/components/ui/scroll-area"

import { Spinner } from "@renderer/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"

import { useToast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { createInstance } from "@renderer/stores/instances-store"
import { checkSteamCmd, installSteamCmd, steamCmdStore } from "@renderer/stores/steamcmd-store"
import type { GameInstance } from "@shared/types/instances"

import type { CompleteCollectionResult } from "@shared/types/workshop"
import { useEffect, useState } from "react"

export function WorkshopPage() {
	const [collectionUrl, setCollectionUrl] = useState("")
	const [collectionData, setCollectionData] = useState<CompleteCollectionResult | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [isImportModDialogOpen, setIsImportModDialogOpen] = useState(false)

	const steamCmdState = useStore(steamCmdStore)
	const { t } = useTranslation()

	const { toast } = useToast()

	useEffect(() => {
		checkSteamCmd()
	}, [])

	const extractCollectionId = (input: string): string | null => {
		if (/^\d+$/.test(input)) {
			return input
		}

		const urlMatch = input.match(/[?&]id=(\d+)/)
		if (urlMatch?.[1]) {
			return urlMatch[1]
		}

		return null
	}

	const handleCheckSteamCmd = async () => {
		return await checkSteamCmd()
	}

	const handleInstallSteamCmd = async () => {
		const success = await installSteamCmd()

		if (success) {
			toast({
				title: t("pages.workshop.steamCmd.installSuccess.title"),
				description: t("pages.workshop.steamCmd.installSuccess.description")
			})
		} else {
			toast({
				title: t("pages.workshop.steamCmd.installFailed.title"),
				description: t("pages.workshop.steamCmd.installFailed.description"),
				variant: "destructive"
			})
		}

		return success
	}

	const formatSize = (bytes?: number): string => {
		if (bytes === undefined) return t("pages.workshop.collection.size")

		const units = ["B", "KB", "MB", "GB", "TB"]
		let size = bytes
		let unitIndex = 0

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024
			unitIndex++
		}

		return `${size.toFixed(2)} ${units[unitIndex]}`
	}

	const handleImportCollection = async () => {
		const collectionId = extractCollectionId(collectionUrl)
		if (!collectionId) {
			setError(t("pages.workshop.import.invalidUrl"))
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const result = await window.api.steam.getCollectionDetails(collectionId)
			console.log("Collection details:", result)

			if (!result) {
				throw new Error("Failed to fetch collection details")
			}

			if (result.error || !result.data) {
				throw new Error(result.error || "Failed to parse collection")
			}

			const extendedData: CompleteCollectionResult = result

			setCollectionData(extendedData)
		} catch (error) {
			console.error("Failed to import collection:", error)
			const errorMessage = error instanceof Error ? error.message : String(error)
			setError(t("pages.workshop.import.importFailed", { error: errorMessage }))
			toast({
				title: "Import Failed",
				description: t("pages.workshop.import.importFailed", { error: errorMessage }),
				variant: "destructive"
			})
		} finally {
			setIsLoading(false)
		}
	}

	const handleCreateInstanceSuccess = async (
		instance: Omit<GameInstance, "id" | "createdAt" | "lastPlayed" | "playTime">
	): Promise<void> => {
		try {
			const createdInstance = await createInstance(instance)

			if (!createdInstance) {
				throw new Error("Failed to create instance")
			}

			toast({
				title: "Instance Created",
				description: `"${instance.name}" has been created successfully.`
			})

			return Promise.resolve()
		} catch (error) {
			toast({
				title: "Error",
				description: `Failed to create instance: ${error instanceof Error ? error.message : String(error)}`,
				variant: "destructive"
			})
			throw error
		}
	}

	const renderSetupStep = () => {
		switch (steamCmdState.status) {
			case "checking":
				return (
					<Card className="border-blue-500/20">
						<CardHeader>
							<CardTitle>{t("pages.workshop.steamCmd.checking.title")}</CardTitle>
							<CardDescription>{t("pages.workshop.steamCmd.checking.description")}</CardDescription>
						</CardHeader>
						<CardContent className="flex justify-center py-6">
							<Spinner size="lg" />
						</CardContent>
					</Card>
				)

			case "not_available":
				return (
					<Card>
						<CardHeader>
							<CardTitle>{t("pages.workshop.steamCmd.not_available.title")}</CardTitle>
							<CardDescription>
								{t("pages.workshop.steamCmd.not_available.description")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="bg-amber-500/10 rounded-md p-4 text-amber-600 dark:text-amber-400">
								<p>{t("pages.workshop.steamCmd.not_available.info")}</p>
							</div>

							<div className="flex items-center justify-center py-4">
								<Button
									size="lg"
									onClick={handleInstallSteamCmd}
									disabled={steamCmdState.isInstalling}
									className="flex gap-2"
								>
									{steamCmdState.isInstalling ? (
										<Spinner />
									) : (
										<ArrowDownTrayIcon className="h-5 w-5" />
									)}
									{steamCmdState.isInstalling
										? t("pages.workshop.steamCmd.not_available.installing")
										: t("pages.workshop.steamCmd.not_available.install")}
								</Button>
							</div>
						</CardContent>
						<CardFooter className="flex justify-between border-t bg-muted/50 px-6 py-3">
							<span className="text-sm text-muted-foreground">
								{t("pages.workshop.steamCmd.not_available.footer")}
							</span>
							<Button variant="ghost" size="sm" onClick={handleCheckSteamCmd}>
								{t("pages.workshop.steamCmd.not_available.checkAgain")}
							</Button>
						</CardFooter>
					</Card>
				)

			case "installing":
				return (
					<Card className="border-yellow-500/20">
						<CardHeader>
							<CardTitle>{t("pages.workshop.steamCmd.installing.title")}</CardTitle>
							<CardDescription>
								{t("pages.workshop.steamCmd.installing.description")}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex justify-center py-6">
							<Spinner size="lg" />
						</CardContent>
					</Card>
				)

			case "ready":
				return (
					<>
						<Tabs defaultValue="import" className="mt-4">
							<TabsList>
								<TabsTrigger value="import">{t("pages.workshop.tabs.import")}</TabsTrigger>
								<TabsTrigger value="single-mod">{t("pages.workshop.tabs.singleMod")}</TabsTrigger>
							</TabsList>

							<TabsContent value="import" className="space-y-4 pt-4">
								<ScrollArea className="h-[calc(100vh-3.5rem)] pr-4">
									<Card>
										<CardHeader>
											<CardTitle>{t("pages.workshop.import.title")}</CardTitle>
											<CardDescription>{t("pages.workshop.import.description")}</CardDescription>
										</CardHeader>
										<CardContent>
											<div className="space-y-2">
												<Label htmlFor="collection-url">
													{t("pages.workshop.import.collectionUrl")}
												</Label>
												<div className="flex gap-2">
													<Input
														id="collection-url"
														placeholder={t("pages.workshop.import.placeholder")}
														value={collectionUrl}
														onChange={(e) => setCollectionUrl(e.target.value)}
													/>
													<Button
														onClick={handleImportCollection}
														disabled={isLoading || !collectionUrl}
													>
														{isLoading ? <Spinner size="sm" className="mr-2" /> : null}
														{t("pages.workshop.import.import")}
													</Button>
												</div>
												{error && <p className="text-sm text-red-500">{error}</p>}
											</div>
										</CardContent>
									</Card>

									{collectionData && renderCollectionDetails()}
									<div className="h-96" />
								</ScrollArea>
							</TabsContent>

							<TabsContent value="single-mod" className="space-y-4 pt-4">
								<Card>
									<CardHeader>
										<CardTitle>{t("pages.workshop.singleMod.title")}</CardTitle>
										<CardDescription>{t("pages.workshop.singleMod.description")}</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											<p className="text-sm text-muted-foreground">
												{t("pages.workshop.singleMod.instruction")}
											</p>

											<div className="flex justify-center">
												<Button onClick={() => setIsImportModDialogOpen(true)} className="gap-2">
													<ArrowDownTrayIcon className="h-4 w-4" />
													{t("pages.workshop.singleMod.openImporter")}
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</>
				)
		}
	}

	const renderCollectionDetails = () => {
		if (!collectionData) return null

		return (
			<Card className="overflow-hidden border-primary/20 mt-8">
				<CardHeader className="bg-muted/30 pb-4">
					<div className="flex items-center gap-4">
						{collectionData.data.imageUrl ? (
							<div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden border shadow-sm">
								<img
									src={collectionData.data.imageUrl}
									alt=""
									className="w-full h-full object-cover"
								/>
							</div>
						) : (
							<div className="flex items-center justify-center w-16 h-16 bg-muted rounded-md shrink-0">
								<PuzzlePieceIcon className="h-8 w-8 text-muted-foreground/50" />
							</div>
						)}

						<div className="flex-grow">
							<CardTitle className="flex items-center gap-2">
								<CubeIcon className="h-5 w-5 text-primary" />
								{collectionData.data.title}
							</CardTitle>
							<CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
								<span>{t("pages.workshop.collection.workshopCollection")}</span>
								<span className="flex items-center gap-1">
									<PuzzlePieceIcon className="h-3.5 w-3.5" />
									{collectionData.data.modCount} {t("pages.workshop.collection.mods")}
								</span>
							</CardDescription>
						</div>

						<div className="flex flex-wrap gap-2 shrink-0">
							{collectionData.totalSize !== undefined && (
								<Badge variant="outline" className="flex items-center gap-1 px-2">
									<DocumentTextIcon className="h-3.5 w-3.5" />
									{formatSize(collectionData.totalSize)}
								</Badge>
							)}
						</div>
					</div>

					<div className="mt-2 text-xs text-muted-foreground">
						{t("pages.workshop.collection.collectionId")}{" "}
						<span className="font-mono">{collectionData.data.id}</span>
					</div>
				</CardHeader>

				<div className="px-4 pt-4">
					<div className="flex justify-between mb-4">
						<Button variant="outline" onClick={() => setCollectionData(null)}>
							{t("pages.workshop.collection.clear")}
						</Button>
						<Button onClick={() => setIsCreateDialogOpen(true)} className="gap-1.5">
							<ArrowDownTrayIcon className="h-4 w-4" />
							{t("pages.workshop.collection.createInstance")}
						</Button>
					</div>

					<div>
						<h4 className="text-sm font-medium mb-2 flex items-center justify-between">
							<span className="flex items-center gap-1.5">
								<PuzzlePieceIcon className="h-4 w-4 text-muted-foreground" />
								{t("pages.workshop.collection.modsInCollection")}
							</span>
							<Badge variant="outline" className="font-mono">
								{collectionData.data.modCount}
							</Badge>
						</h4>

						{isLoading ? (
							<div className="flex items-center justify-center py-8 bg-muted/30 rounded-md">
								<div className="flex flex-col items-center gap-2">
									<Spinner />
									<p className="text-sm text-muted-foreground">
										{t("pages.workshop.collection.loading")}
									</p>
								</div>
							</div>
						) : collectionData.modsDetails && collectionData.modsDetails.length > 0 ? (
							<div className="border rounded-md overflow-hidden">
								<div className="p-0.5">
									<div className="grid gap-0.5">
										{collectionData.modsDetails.map((mod) => (
											<div
												key={mod.id}
												className="flex items-center gap-3 p-2.5 hover:bg-muted/70 rounded-md transition-colors"
											>
												{mod.thumbnailUrl ? (
													<img
														src={mod.thumbnailUrl}
														alt=""
														className="w-10 h-10 rounded object-cover border shadow-sm bg-background/90"
													/>
												) : (
													<div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
														<PuzzlePieceIcon className="h-5 w-5 text-muted-foreground/50" />
													</div>
												)}
												<div className="flex-grow min-w-0">
													<p className="text-sm font-medium truncate">{mod.name}</p>
													<div className="flex items-center text-xs text-muted-foreground gap-2 mt-0.5">
														{mod.author && (
															<span className="truncate max-w-[150px]">{mod.author}</span>
														)}
														{mod.size && (
															<span className="flex items-center gap-1 shrink-0">
																<DocumentTextIcon className="h-3 w-3" />
																{formatSize(mod.size)}
															</span>
														)}
														{mod.tags && mod.tags.length > 0 && (
															<span className="hidden sm:inline-flex flex-wrap gap-1">
																{mod.tags.slice(0, 2).map((tag) => (
																	<Badge
																		key={tag}
																		variant="secondary"
																		className="text-xs px-1 py-0"
																	>
																		{tag}
																	</Badge>
																))}
															</span>
														)}
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						) : (
							<div className="border rounded-md p-6 text-center text-muted-foreground bg-muted/20">
								<p>
									{t("pages.workshop.collection.noDetails", {
										count: collectionData.data.modCount
									})}
								</p>
								<p className="text-sm mt-1">{t("pages.workshop.collection.noDetailsDesc")}</p>
							</div>
						)}
					</div>
				</div>
			</Card>
		)
	}

	return (
		<div className="container mx-auto space-y-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">{t("pages.workshop.title")}</h1>
				{steamCmdState.status === "ready" && (
					<Button variant="outline" size="sm" onClick={handleCheckSteamCmd}>
						{t("pages.workshop.checkSteamCmd")}
					</Button>
				)}
			</div>

			{renderSetupStep()}

			<CreateInstanceDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onCreate={handleCreateInstanceSuccess}
				collectionData={collectionData ? collectionData : undefined}
				redirectToDownloads={true}
			/>

			<ImportModDialog
				open={isImportModDialogOpen}
				onOpenChange={setIsImportModDialogOpen}
				redirectToDownloads={false}
			/>
		</div>
	)
}
