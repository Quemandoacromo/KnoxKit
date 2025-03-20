import { cn } from "@renderer/lib/utils"

interface SpinnerProps {
	className?: string
	size?: "xs" | "sm" | "md" | "lg" | "xl" | number
}

export function Spinner({ className, size = "md" }: SpinnerProps): JSX.Element {
	const sizeClasses = {
		xs: "h-3 w-3",
		sm: "h-4 w-4",
		md: "h-6 w-6",
		lg: "h-8 w-8",
		xl: "h-10 w-10"
	}

	const sizeClass = typeof size === "string" ? sizeClasses[size] : `h-${size} w-${size}`

	return (
		<div
			className={cn(
				"animate-spin rounded-full border-2 border-current border-t-transparent",
				sizeClass,
				className
			)}
		>
			<span className="sr-only">Loading...</span>
		</div>
	)
}
