import { ArrowPathIcon, PlayIcon } from "@heroicons/react/24/outline"
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

	return (
		<Button
			variant={status === "Ready" ? "default" : "secondary"}
			className={`min-w-24 px-3 ${className}`}
			onClick={handleLaunch}
			disabled={isDisabled}
		>
			{showSpinner ? (
				<ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
			) : (
				<PlayIcon className="mr-2 h-4 w-4" />
			)}
			<span className="truncate">{buttonText}</span>
		</Button>
	)
}
