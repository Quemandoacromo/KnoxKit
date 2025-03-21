import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { PlayCircleIcon } from "@heroicons/react/24/solid"
import { useStore } from "@nanostores/react"
import { Button } from "@renderer/components/ui/button"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { launchInstance } from "@renderer/stores/instances-store"
import { settingsStore } from "@renderer/stores/settings-store"
import type { InstanceStatus } from "@shared/types/instances"
import { useCallback, useState } from "react"

interface LaunchButtonProps {
	instanceId: string
	status: InstanceStatus
	className?: string
}

export function LaunchButton({
	instanceId,
	status,
	className = ""
}: LaunchButtonProps): JSX.Element {
	const [isLaunching, setIsLaunching] = useState(false)
	const settings = useStore(settingsStore)
	const { t } = useTranslation()

	const handleLaunch = useCallback(async (): Promise<void> => {
		setIsLaunching(true)
		try {
			await launchInstance(instanceId, {
				...settings
			})
		} finally {
			setIsLaunching(false)
		}
	}, [instanceId, settings])

	const isDisabled = status !== "Ready" || isLaunching

	const buttonText = isLaunching
		? t("instances.components.launchButton.launching")
		: status === "Running"
			? t("instances.components.launchButton.running")
			: status === "Downloading"
				? t("instances.components.launchButton.downloading")
				: status === "Updating"
					? t("instances.components.launchButton.updating")
					: status === "Error"
						? t("instances.components.launchButton.error")
						: t("instances.components.launchButton.play")

	const showSpinner = isLaunching || status === "Downloading" || status === "Updating"

	// Get the button variant based on status
	const getButtonVariant = () => {
		if (status === "Ready") return "default"
		if (status === "Error") return "destructive"
		if (status === "Running") return "secondary"
		return "outline"
	}

	return (
		<Button
			variant={getButtonVariant()}
			className={`min-w-28 px-3 py-1.5 font-medium transition-all duration-300 ${status === "Ready" ? "hover:scale-105" : ""} ${className}`}
			onClick={handleLaunch}
			disabled={isDisabled}
		>
			<div className="flex items-center justify-center space-x-1">
				{showSpinner ? (
					<ArrowPathIcon className="h-5 w-5 animate-spin" />
				) : (
					<PlayCircleIcon className="h-5 w-5" />
				)}
				<span className="truncate">{buttonText}</span>
			</div>
		</Button>
	)
}
