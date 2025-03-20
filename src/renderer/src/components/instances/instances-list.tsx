import type { GameInstance } from "@shared/types/instances"
import { ScrollArea } from "../ui/scroll-area"
import { InstanceCard } from "./instance-card"

interface InstancesListProps {
	instances: GameInstance[]
	onDuplicate: (id: string) => void
	onDelete: (id: string | null) => void
}

export function InstancesList({ instances, onDuplicate, onDelete }: InstancesListProps) {
	return (
		<ScrollArea className="h-[calc(100vh-3.5rem)] pr-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
				{instances.map((instance) => (
					<InstanceCard
						key={instance.id}
						instance={instance}
						onDuplicate={onDuplicate}
						onDelete={onDelete}
					/>
				))}
			</div>

			<div className="h-96" />
		</ScrollArea>
	)
}
