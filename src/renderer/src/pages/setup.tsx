import { CheckCircleIcon, ExclamationCircleIcon, FolderOpenIcon } from "@heroicons/react/24/outline"
import { useStore } from "@nanostores/react"
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
import { Progress } from "@renderer/components/ui/progress"
import { toast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { logger } from "@renderer/lib/utils"
import { settingsStore, updateSetting } from "@renderer/stores/settings-store"
import { useEffect, useRef, useState } from "react"

export default function SetupPage(): JSX.Element {
	const { t } = useTranslation()
	const settings = useStore(settingsStore)
	const [isDetecting, setIsDetecting] = useState(false)
	const [setupProgress, setSetupProgress] = useState(0)
	const [statusText, setStatusText] = useState(t("pages.setup.statusTexts.init"))
	const [detectedPath, setDetectedPath] = useState<string | null>(null)
	const [manualPath, setManualPath] = useState("")
	const [isValidPath, setIsValidPath] = useState<boolean | null>(null)
	const [showManualInput, setShowManualInput] = useState(false)
	const detectionAttemptedRef = useRef(false)

	const detectGamePath = async () => {
		if (isDetecting) return

		setIsDetecting(true)
		setStatusText(t("pages.setup.statusTexts.detecting"))
		setSetupProgress(25)

		try {
			setSetupProgress(50)
			const path = await window.api.game.detectPath()
			setSetupProgress(75)
			setDetectedPath(path)
			setIsValidPath(true)
			setStatusText(t("pages.setup.statusTexts.found", { path }))
			setSetupProgress(100)

			toast({
				title: t("pages.setup.toast.detected.title"),
				description: t("pages.setup.toast.detected.description", { path })
			})
		} catch (error) {
			logger.error(`Failed to detect game path: ${error}`)
			setDetectedPath(null)
			setIsValidPath(false)
			setStatusText(t("pages.setup.statusTexts.notFound"))
			setSetupProgress(100)
			setShowManualInput(true)

			toast({
				title: t("pages.setup.toast.failedDetection.title"),
				description: t("pages.setup.toast.failedDetection.description"),
				variant: "destructive"
			})
		} finally {
			setIsDetecting(false)
			detectionAttemptedRef.current = true
		}
	}

	const browseForGameDirectory = async () => {
		try {
			const result = await window.api.dialog.openDirectory({
				title: "Select Project Zomboid Installation Directory",
				defaultPath: settings.gameDirectory || undefined
			})

			if (result && !result.canceled && result.filePaths.length > 0) {
				const selectedPath = result.filePaths[0]
				setManualPath(selectedPath)
				setStatusText(t("pages.setup.statusTexts.verifying", { path: selectedPath }))

				const isValid = await window.api.game.verifyPath(selectedPath)
				setIsValidPath(isValid)
				setStatusText(
					isValid
						? t("pages.setup.statusTexts.validPath", { path: selectedPath })
						: t("pages.setup.statusTexts.invalidPath")
				)
			}
		} catch (error) {
			logger.error(`Error selecting directory: ${error}`)
			setStatusText(t("pages.setup.statusTexts.selectError"))
		}
	}

	const completeSetup = async () => {
		const finalPath = detectedPath || manualPath

		if (!finalPath || !isValidPath) {
			toast({
				title: t("pages.setup.toast.invalidPath.title"),
				description: t("pages.setup.toast.invalidPath.description"),
				variant: "destructive"
			})
			return
		}

		setStatusText(t("pages.setup.statusTexts.saving"))
		setSetupProgress(75)

		try {
			await updateSetting("gameDirectory", finalPath)
			await updateSetting("setupComplete", true)
			setSetupProgress(100)
			setStatusText(t("pages.setup.statusTexts.complete"))

			toast({
				title: t("pages.setup.toast.setupComplete.title"),
				description: t("pages.setup.toast.setupComplete.description")
			})
		} catch (error) {
			logger.error(`Error saving setup: ${error}`)
			setStatusText(t("pages.setup.statusTexts.failed"))

			toast({
				title: t("pages.setup.toast.setupFailed.title"),
				description: t("pages.setup.toast.setupFailed.description"),
				variant: "destructive"
			})
		}
	}

	useEffect(() => {
		if (settings.gameDirectory) {
			setDetectedPath(settings.gameDirectory)
			setIsValidPath(true)
			setStatusText(t("pages.setup.statusTexts.existing", { path: settings.gameDirectory }))
			setSetupProgress(100)
			return
		}

		if (!detectionAttemptedRef.current && !isDetecting) {
			const timer = setTimeout(() => {
				detectGamePath()
			}, 500)

			return () => clearTimeout(timer)
		}

		return undefined
	}, [settings.gameDirectory, isDetecting, detectGamePath, t])

	return (
		<div className="h-screen w-full flex items-center justify-center p-6">
			<Card className="w-full max-w-2xl shadow-lg">
				<CardHeader className="text-center">
					<CardTitle className="text-3xl font-bold">{t("pages.setup.title")}</CardTitle>
					<CardDescription className="text-lg">{t("pages.setup.subtitle")}</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					<div className="space-y-2">
						<h3 className="text-center font-semibold">{t("pages.setup.progress")}</h3>
						<Progress value={setupProgress} className="h-2" />
						<p className="text-center text-muted-foreground">{statusText}</p>
					</div>

					{isDetecting ? (
						<div className="flex flex-col items-center justify-center py-4">
							<p>{t("pages.setup.detection.waiting")}</p>
						</div>
					) : detectedPath ? (
						<div className="p-4 border rounded-md bg-muted/50">
							<div className="flex items-start">
								<CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
								<div>
									<p className="font-medium">{t("pages.setup.detection.success")}</p>
									<p className="text-sm text-muted-foreground break-all">{detectedPath}</p>
								</div>
							</div>
						</div>
					) : showManualInput ? (
						<div className="space-y-4">
							<div className="p-4 border rounded-md bg-muted/50 mb-4">
								<div className="flex items-start">
									<ExclamationCircleIcon className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
									<div>
										<p className="font-medium">{t("pages.setup.detection.manual")}</p>
										<p className="text-sm text-muted-foreground">
											{t("pages.setup.detection.manualDesc")}
										</p>
									</div>
								</div>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="game-path">{t("pages.setup.pathInput.label")}</Label>
								<div className="flex space-x-2">
									<Input
										id="game-path"
										value={manualPath}
										onChange={(e) => {
											setManualPath(e.target.value)
											setIsValidPath(null)
											setStatusText("Path entered, click Verify to check")
										}}
										placeholder={t("pages.setup.pathInput.placeholder")}
										className="flex-1"
									/>
									<Button variant="outline" onClick={browseForGameDirectory}>
										<FolderOpenIcon className="h-4 w-4 mr-2" />
										{t("pages.setup.pathInput.browse")}
									</Button>
								</div>
								{manualPath && isValidPath !== null && (
									<p className={`text-sm ${isValidPath ? "text-green-500" : "text-red-500"}`}>
										{isValidPath
											? t("pages.setup.pathInput.valid")
											: t("pages.setup.pathInput.invalid")}
									</p>
								)}
								{manualPath && isValidPath === null && (
									<Button
										variant="outline"
										onClick={async () => {
											const isValid = await window.api.game.verifyPath(manualPath)
											setIsValidPath(isValid)
											setStatusText(
												isValid
													? t("pages.setup.statusTexts.validPath", { path: manualPath })
													: t("pages.setup.statusTexts.invalidPath")
											)
										}}
										size="sm"
										className="w-fit"
									>
										{t("pages.setup.pathInput.verify")}
									</Button>
								)}
							</div>
						</div>
					) : (
						<Button variant="outline" onClick={detectGamePath} className="w-full">
							{t("pages.setup.buttons.retry")}
						</Button>
					)}
				</CardContent>

				<CardFooter className="flex justify-between">
					<Button variant="outline" onClick={() => window.api.window.close()}>
						{t("pages.setup.buttons.exit")}
					</Button>
					<Button
						onClick={completeSetup}
						disabled={!isValidPath || !(detectedPath || manualPath)}
						className="bg-green-600 hover:bg-green-700"
					>
						{t("pages.setup.buttons.complete")}
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
