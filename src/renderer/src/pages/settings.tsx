import { ExclamationTriangleIcon, FolderOpenIcon } from "@heroicons/react/24/outline"
import { useStore } from "@nanostores/react"
import LanguageSwitcher from "@renderer/components/language-switch"
import { Button } from "@renderer/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from "@renderer/components/ui/card"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import { Separator } from "@renderer/components/ui/separator"
import { Switch } from "@renderer/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@renderer/components/ui/tabs"
import { toast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { logger } from "@renderer/lib/utils"
import { settingsStore, updateSetting } from "@renderer/stores/settings-store"
import { useEffect, useState } from "react"

export default function SettingsPage(): JSX.Element {
	const settings = useStore(settingsStore)
	const { t } = useTranslation()
	const [defaultPath, setDefaultPath] = useState<string>("")

	useEffect(() => {
		const fetchDefaultPath = async () => {
			try {
				const path = await window.api.settings.getDefaultPath()
				logger.info(`Default path:${path}`)
				setDefaultPath(path)
			} catch (error) {
				logger.error(`Failed to get default path: ${error}`)
			}
		}

		fetchDefaultPath()
	}, [])

	const handleBrowseInstancesDirectory = async () => {
		try {
			const result = await window.api.dialog.selectDirectory({
				title: "Select Instances Directory",
				buttonLabel: "Select Folder",
				properties: ["openDirectory", "createDirectory"]
			})

			if (!result.canceled && result.filePaths.length > 0) {
				const isWritable = await window.api.filesystem.isDirectoryWritable(result.filePaths[0])

				if (isWritable) {
					const instances = await window.api.instances.getAll()

					if (instances.length > 0) {
						if (
							window.confirm(
								"Existing instances will be moved to the new location. This may take some time. Continue?"
							)
						) {
							toast({
								title: "Moving instances",
								description: "Please wait while instances are being moved...",
								duration: 5000
							})

							const success = await window.api.settings.migrateInstances(result.filePaths[0])

							if (success) {
								toast({
									title: "Success",
									description: "Instances have been moved to the new location",
									duration: 3000
								})

								await updateSetting("instancesDirectory", result.filePaths[0])
							} else {
								toast({
									title: "Error",
									description: "Failed to move instances. Check logs for details.",
									variant: "destructive"
								})
								return
							}
						} else {
							return
						}
					} else {
						await updateSetting("instancesDirectory", result.filePaths[0])

						toast({
							title: "Path updated",
							description: "New instances will be stored in the selected location",
							duration: 3000
						})
					}
				} else {
					toast({
						title: "Error",
						description: "Selected directory is not writable",
						variant: "destructive"
					})
				}
			}
		} catch (error) {
			logger.error(`Failed to select directory: ${error}`)
			toast({
				title: "Error",
				description: "Failed to select directory",
				variant: "destructive"
			})
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t("pages.settings.title")}</h1>
				<p className="text-muted-foreground mt-2">{t("pages.settings.description")}</p>
			</div>

			<Tabs defaultValue="general">
				<TabsList className="mb-4">
					<TabsTrigger value="general">{t("pages.settings.tabs.general")}</TabsTrigger>
					<TabsTrigger value="paths">{t("pages.settings.tabs.paths")}</TabsTrigger>
					<TabsTrigger value="advanced">{t("pages.settings.tabs.advanced")}</TabsTrigger>
				</TabsList>

				<ScrollArea className="pr-4 pb-10" style={{ height: "calc(100vh - 220px)" }}>
					<TabsContent value="general" className="space-y-4 mt-4">
						<Card>
							<CardHeader>
								<CardTitle>{t("pages.settings.general.title")}</CardTitle>
								<CardDescription>{t("pages.settings.general.description")}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="auto-updates">
											{t("pages.settings.general.autoUpdates.label")}
										</Label>
										<p className="text-sm text-muted-foreground">
											{t("pages.settings.general.autoUpdates.description")}
										</p>
									</div>
									<Switch
										id="auto-updates"
										checked={settings.autoUpdate}
										onCheckedChange={(value) => updateSetting("autoUpdate", value)}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="notifications">
											{t("pages.settings.general.notifications.label")}
										</Label>
										<p className="text-sm text-muted-foreground">
											{t("pages.settings.general.notifications.description")}
										</p>
									</div>
									<Switch
										id="notifications"
										checked={settings.notifications}
										onCheckedChange={(value) => updateSetting("notifications", value)}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label htmlFor="minimize-to-tray">
											{t("pages.settings.general.minimizeToTray.label")}
										</Label>
										<p className="text-sm text-muted-foreground">
											{t("pages.settings.general.minimizeToTray.description")}
										</p>
									</div>
									<Switch
										id="minimize-to-tray"
										checked={settings.minimizeToTray}
										onCheckedChange={(value) => updateSetting("minimizeToTray", value)}
									/>
								</div>

								<div className="space-y-2">
									<Label>{t("pages.settings.general.theme.label")}</Label>
									<div className="flex gap-2">
										<Button
											variant={settings.theme === "light" ? "default" : "outline"}
											onClick={() => updateSetting("theme", "light")}
										>
											{t("pages.settings.general.theme.light")}
										</Button>
										<Button
											variant={settings.theme === "dark" ? "default" : "outline"}
											onClick={() => updateSetting("theme", "dark")}
										>
											{t("pages.settings.general.theme.dark")}
										</Button>
										<Button
											variant={settings.theme === "system" ? "default" : "outline"}
											onClick={() => updateSetting("theme", "system")}
										>
											{t("pages.settings.general.theme.system")}
										</Button>
									</div>
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label htmlFor="language-select">
												{t("pages.settings.general.language.label")}
											</Label>
											<p className="text-sm text-muted-foreground">
												{t("pages.settings.general.language.description")}
											</p>
										</div>
										<LanguageSwitcher />
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="paths" className="space-y-4 mt-4">
						<Card>
							<CardHeader>
								<CardTitle>{t("pages.settings.paths.gameDirectory.title")}</CardTitle>
								<CardDescription>
									{t("pages.settings.paths.gameDirectory.description")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center space-x-2">
									<Input
										value={settings.gameDirectory}
										onChange={(e) => updateSetting("gameDirectory", e.target.value)}
									/>
									<Button variant="secondary">
										{t("pages.settings.paths.gameDirectory.browse")}
									</Button>
								</div>
							</CardContent>
							<CardFooter>
								<Button>{t("pages.settings.paths.gameDirectory.save")}</Button>
							</CardFooter>
						</Card>
					</TabsContent>

					<TabsContent value="advanced" className="space-y-4 mt-4">
						<Card>
							<CardHeader>
								<CardTitle>{t("pages.settings.advanced.title")}</CardTitle>
								<CardDescription>{t("pages.settings.advanced.description")}</CardDescription>
							</CardHeader>
							<Separator className="my-2" />
							<CardContent>
								<div className="space-y-6">
									<div className="space-y-4">
										<div className="space-y-0.5 mb-2">
											<Label>{t("pages.settings.advanced.instancesDirectory.label")}</Label>
											<p className="text-sm text-muted-foreground">
												{t("pages.settings.advanced.instancesDirectory.description")}
											</p>
										</div>

										<div className="flex items-center space-x-2">
											<Input
												value={settings.instancesDirectory || ""}
												readOnly
												placeholder={settings.instancesDirectory || defaultPath}
												className="flex-1"
											/>
											<Button variant="outline" onClick={handleBrowseInstancesDirectory}>
												<FolderOpenIcon className="h-4 w-4 mr-2" />
												{t("pages.settings.advanced.instancesDirectory.selectDirectory")}
											</Button>
										</div>

										{settings.instancesDirectory && (
											<div className="mt-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => updateSetting("instancesDirectory", defaultPath)}
												>
													{t("pages.settings.advanced.instancesDirectory.revertToDefault")}
												</Button>
												<p className="text-xs text-muted-foreground mt-1">
													{t("pages.settings.advanced.instancesDirectory.currentPath")}{" "}
													{settings.instancesDirectory}
												</p>
											</div>
										)}

										<div className="bg-muted/50 border border-border rounded-md p-3 mt-2">
											<div className="flex items-start">
												<ExclamationTriangleIcon className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
												<div className="text-sm text-foreground/80">
													<strong>
														{t("pages.settings.advanced.instancesDirectory.warning.important")}
													</strong>{" "}
													{t("pages.settings.advanced.instancesDirectory.warning.description")}
													<ul className="list-disc ml-5 mt-1 space-y-1">
														<li>{t("pages.settings.advanced.instancesDirectory.warning.time")}</li>
														<li>{t("pages.settings.advanced.instancesDirectory.warning.space")}</li>
														<li>
															{t("pages.settings.advanced.instancesDirectory.warning.interrupt")}
														</li>
													</ul>
												</div>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
							<Separator className="my-2" />
							<CardFooter className="sticky bottom-0 bg-card z-10 ">
								<p className="text-xs text-muted-foreground">
									{t("pages.settings.advanced.footer.autoSave")}
								</p>
								<Button
									className="ml-auto"
									onClick={() => {
										updateSetting("instancesDirectory", settings.instancesDirectory)
									}}
								>
									{t("pages.settings.advanced.footer.applyAll")}
								</Button>
							</CardFooter>
						</Card>
					</TabsContent>

					<div className="h-6" />
				</ScrollArea>
			</Tabs>
		</div>
	)
}
