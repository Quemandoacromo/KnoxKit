import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@renderer/components/ui/select"
import { useTranslation } from "@renderer/hooks/useTranslation"
import type { FilterStatus, SortOption } from "@renderer/pages/instances"

interface InstancesActionBarProps {
	searchQuery: string
	setSearchQuery: (query: string) => void
	filterStatus: FilterStatus
	setFilterStatus: (status: FilterStatus) => void
	sortBy: SortOption
	setSortBy: (option: SortOption) => void
	setIsCreateDialogOpen: (open: boolean) => void
}

export function InstancesActionBar({
	searchQuery,
	setSearchQuery,
	filterStatus,
	setFilterStatus,
	sortBy,
	setSortBy,
	setIsCreateDialogOpen
}: InstancesActionBarProps) {
	const { t } = useTranslation()

	return (
		<div className="flex flex-col gap-3 w-full border-border border-b pb-3">
			<div className="flex justify-between items-center gap-3">
				{/* Search Bar */}
				<div className="relative flex-1 min-w-[120px]">
					<MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder={t("instances.components.actionBar.search")}
						className="pl-8 h-9 text-sm w-full"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				{/* New Instance Button - Always visible */}
				<Button
					className="h-9 whitespace-nowrap"
					size="sm"
					onClick={() => setIsCreateDialogOpen(true)}
				>
					<PlusIcon className="h-4 w-4 mr-2" />
					{t("instances.components.actionBar.newInstance")}
				</Button>
			</div>

			{/* Filters row */}
			<div className="flex flex-col sm:flex-row gap-3 w-full">
				{/* Status Filter */}
				<div className="w-full sm:w-1/2">
					<div className="flex items-center gap-2">
						<Label htmlFor="filter-status" className="text-sm whitespace-nowrap">
							{t("instances.components.actionBar.status")}
						</Label>
						<Select
							value={filterStatus}
							onValueChange={(val) => setFilterStatus(val as FilterStatus)}
						>
							<SelectTrigger id="filter-status" className="text-sm h-9 w-full">
								<SelectValue placeholder={t("instances.components.actionBar.status")} />
							</SelectTrigger>
							<SelectContent>
								{["All", "Ready", "Updating", "Error", "Outdated"].map((status) => (
									<SelectItem key={status} value={status}>
										{t(`pages.instances.filterStatus.${status}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Sort Options */}
				<div className="w-full sm:w-1/2">
					<div className="flex items-center gap-2">
						<Label htmlFor="sort-by" className="text-sm whitespace-nowrap">
							{t("instances.components.actionBar.sortBy")}
						</Label>
						<Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
							<SelectTrigger id="sort-by" className="text-sm h-9 w-full">
								<SelectValue placeholder={t("instances.components.actionBar.sortBy")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="name">
									{t("instances.components.actionBar.sortOptions.name")}
								</SelectItem>
								<SelectItem value="lastPlayed">
									{t("instances.components.actionBar.sortOptions.lastPlayed")}
								</SelectItem>
								<SelectItem value="modCount">
									{t("instances.components.actionBar.sortOptions.modCount")}
								</SelectItem>
								<SelectItem value="memoryAllocation">
									{t("instances.components.actionBar.sortOptions.memoryAllocation")}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</div>
	)
}
