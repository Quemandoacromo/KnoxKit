import { ArchiveBoxIcon, PlusIcon } from "@heroicons/react/24/outline"
import { Button } from "@renderer/components/ui/button"
import { useTranslation } from "@renderer/hooks/useTranslation"
import type { FilterStatus } from "@renderer/pages/instances"

interface EmptyStateProps {
	searchQuery: string
	filterStatus: FilterStatus
	onCreateClick: () => void
}
export function EmptyState({ searchQuery, filterStatus, onCreateClick }: EmptyStateProps) {
	const { t } = useTranslation()

	return (
		<div className="flex flex-col items-center justify-center py-8 md:py-10 px-4 text-center">
			<div className="bg-muted rounded-full p-4 md:p-6 mb-3 md:mb-4">
				<ArchiveBoxIcon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
			</div>
			<h3 className="text-lg md:text-xl font-semibold mb-2">
				{t("instances.components.emptyState.title")}
			</h3>
			<p className="text-sm md:text-base text-muted-foreground max-w-xs md:max-w-md mb-4 md:mb-6">
				{searchQuery || filterStatus !== "All"
					? t("instances.components.emptyState.filtered")
					: t("instances.components.emptyState.noInstances")}
			</p>
			<Button className="w-full sm:w-auto" onClick={onCreateClick}>
				<PlusIcon className="mr-2 h-4 w-4" /> {t("instances.components.emptyState.createButton")}
			</Button>
		</div>
	)
}
