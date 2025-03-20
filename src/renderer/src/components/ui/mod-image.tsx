import { PuzzlePieceIcon } from "@heroicons/react/24/outline"
import { logger } from "@renderer/lib/utils"
import { cn } from "@renderer/lib/utils"
import { useEffect, useState } from "react"

type ImageSize = "sm" | "md" | "lg" | "full"

interface ModImageProps {
	src?: string
	alt: string
	className?: string
	size?: ImageSize
}

const sizeClasses = {
	sm: "w-10 h-10",
	md: "w-16 h-16",
	lg: "w-24 h-24",
	full: "w-full aspect-[16/9]"
}

const iconSizeClasses = {
	sm: "h-4 w-4",
	md: "h-6 w-6",
	lg: "h-8 w-8",
	full: "h-10 w-10"
}

export function ModImage({ src, alt, className, size = "md" }: ModImageProps) {
	const [error, setError] = useState(false)
	const [loading, setLoading] = useState(true)
	const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)

	useEffect(() => {
		if (src) {
			setLoading(true)
			const converted = window.api.convertFilePath(src)
			logger.info(`ModImage converted src: ${src} to: ${converted}`)
			setImageSrc(converted)
			setError(false)
		} else {
			setImageSrc(undefined)
			setLoading(false)
		}
	}, [src])

	const baseClasses = "rounded overflow-hidden transition-all duration-200"
	const sizeClass = sizeClasses[size] || sizeClasses.md
	const iconSizeClass = iconSizeClasses[size] || iconSizeClasses.md

	if (!imageSrc || error) {
		return (
			<div
				className={cn(
					baseClasses,
					sizeClass,
					"bg-muted flex items-center justify-center",
					className
				)}
			>
				<PuzzlePieceIcon className={cn(iconSizeClass, "text-muted-foreground/50")} />
			</div>
		)
	}

	return (
		<div className={cn(baseClasses, sizeClass, "bg-muted relative", className)}>
			{loading && (
				<div className="absolute inset-0 flex items-center justify-center bg-muted">
					<PuzzlePieceIcon
						className={cn(iconSizeClass, "text-muted-foreground/50 animate-pulse")}
					/>
				</div>
			)}
			<img
				src={imageSrc}
				alt={alt}
				className={cn("w-full h-full object-cover", loading ? "opacity-0" : "opacity-100")}
				onError={() => {
					console.error("Image failed to load:", imageSrc)
					setError(true)
					setLoading(false)
				}}
				onLoad={() => setLoading(false)}
			/>
		</div>
	)
}
