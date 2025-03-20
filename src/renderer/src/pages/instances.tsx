import { useStore } from "@nanostores/react"
import { InstancesActionBar } from "@renderer/components/instances/action-bar"
import { CreateInstanceDialog } from "@renderer/components/instances/create-instance"
import { DeleteInstanceDialog } from "@renderer/components/instances/delete-instance"
import { EmptyState } from "@renderer/components/instances/empty-state"
import { InstancesList } from "@renderer/components/instances/instances-list"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import { toast } from "@renderer/components/ui/use-toast"
import { useTranslation } from "@renderer/hooks/useTranslation"
import { logger } from "@renderer/lib/utils"
import {
	createInstance,
	deleteInstance,
	getInstancesArray,
	initInstances,
	instancesStore,
	isInitialized
} from "@renderer/stores/instances-store"
import { useEffect, useMemo, useState } from "react"

export type SortOption = "name" | "lastPlayed" | "modCount" | "memoryAllocation"
export type FilterStatus = "All" | "Ready" | "Updating" | "Error" | "Outdated"

export default function InstancesPage() {
	const { t } = useTranslation()
	const instancesMap = useStore(instancesStore)
	const instances = useMemo(() => getInstancesArray(), [instancesMap])

	const [searchQuery, setSearchQuery] = useState("")
	const [sortBy, setSortBy] = useState<SortOption>("lastPlayed")
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("All")
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(!isInitialized())

	useEffect(() => {
		const loadInstances = async () => {
			if (!isInitialized()) {
				setIsLoading(true)
				try {
					await initInstances()
				} catch (error) {
					logger.error(`Error initializing instances: ${error}`)
				} finally {
					setIsLoading(false)
				}
			}
		}

		loadInstances()
	}, [])

	const filteredInstances = useMemo(() => {
		return instances
			.filter(
				(instance) =>
					(filterStatus === "All" || instance.status === filterStatus) &&
					(instance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						instance.description?.toLowerCase().includes(searchQuery.toLowerCase()))
			)
			.sort((a, b) => {
				switch (sortBy) {
					case "name":
						return a.name.localeCompare(b.name)
					case "lastPlayed":
						if (!a.lastPlayed) return 1
						if (!b.lastPlayed) return -1
						return new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime()
					case "modCount":
						return (b.modIds?.length || 0) - (a.modIds?.length || 0)
					case "memoryAllocation":
						return (b.memoryAllocation || 0) - (a.memoryAllocation || 0)
					default:
						return 0
				}
			})
	}, [instances, searchQuery, sortBy, filterStatus])

	const handleDeleteInstance = async (id: string) => {
		const instance = instances.find((i) => i.id === id)
		if (!instance) return

		try {
			await deleteInstance(id)

			toast({
				title: t("pages.instances.toast.deleted.title"),
				description: t("pages.instances.toast.deleted.description").replace(
					"{{name}}",
					instance.name
				)
			})
		} catch (error) {
			toast({
				title: t("pages.instances.toast.deleteError.title"),
				description: t("pages.instances.toast.deleteError.description").replace(
					"{{name}}",
					instance.name
				),
				variant: "destructive"
			})
		}

		setInstanceToDelete(null)
	}

	const handleCreateInstance = async (instanceData: any) => {
		try {
			const newInstance = await createInstance({
				...instanceData,
				status: "Ready",
				modIds: []
			})

			if (newInstance) {
				toast({
					title: t("pages.instances.toast.created.title"),
					description: t("pages.instances.toast.created.description").replace(
						"{{name}}",
						newInstance.name
					)
				})

				if (instanceData.collectionData?.mods && instanceData.collectionData.mods.length > 0) {
					try {
						await window.api.downloads.queueCollection(instanceData)

						toast({
							title: t("pages.instances.toast.collectionQueued.title"),
							description: t("pages.instances.toast.collectionQueued.description")
						})
					} catch (error) {
						logger.error(`Error queueing collection download: ${error}`)
						toast({
							title: t("pages.instances.toast.warning.title"),
							description: t("pages.instances.toast.warning.description"),
							variant: "warning"
						})
					}
				}
			}
		} catch (error) {
			logger.error(`Error creating instance: ${error}`)
			toast({
				title: t("pages.instances.toast.createError.title"),
				description: t("pages.instances.toast.createError.description"),
				variant: "destructive"
			})
		}
	}

	const handleDuplicateInstance = async (id: string) => {
		const instanceToDuplicate = instances.find((i) => i.id === id)
		if (!instanceToDuplicate) return

		try {
			const newInstance = await createInstance({
				...instanceToDuplicate,
				name: `${instanceToDuplicate.name} (Copy)`,
				path: instanceToDuplicate.path,
				customOptions: instanceToDuplicate.customOptions
			})

			if (newInstance) {
				toast({
					title: t("pages.instances.toast.duplicated.title"),
					description: t("pages.instances.toast.duplicated.description").replace(
						"{{name}}",
						instanceToDuplicate.name
					)
				})
			}
		} catch (error) {
			toast({
				title: t("pages.instances.toast.duplicateError.title"),
				description: t("pages.instances.toast.duplicateError.description").replace(
					"{{name}}",
					instanceToDuplicate.name
				),
				variant: "destructive"
			})
		}
	}

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<div className="spinner h-8 w-8 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p>{t("pages.instances.loading")}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">{t("pages.instances.title")}</h1>
				<p className="text-muted-foreground mt-2">{t("pages.instances.description")}</p>
			</div>

			<InstancesActionBar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				filterStatus={filterStatus}
				setFilterStatus={setFilterStatus}
				sortBy={sortBy}
				setSortBy={setSortBy}
				setIsCreateDialogOpen={setIsCreateDialogOpen}
			/>

			<ScrollArea className="flex-1 -mx-6 px-6">
				{filteredInstances.length > 0 ? (
					<InstancesList
						instances={filteredInstances}
						onDuplicate={handleDuplicateInstance}
						onDelete={setInstanceToDelete}
					/>
				) : (
					<EmptyState
						searchQuery={searchQuery}
						filterStatus={filterStatus}
						onCreateClick={() => setIsCreateDialogOpen(true)}
					/>
				)}
			</ScrollArea>

			<CreateInstanceDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onCreate={handleCreateInstance}
			/>

			<DeleteInstanceDialog
				open={!!instanceToDelete}
				onOpenChange={(open) => !open && setInstanceToDelete(null)}
				onConfirm={() => instanceToDelete && handleDeleteInstance(instanceToDelete)}
			/>
		</div>
	)
}
