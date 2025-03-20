import type { ElectronAPI } from "@electron-toolkit/preload"
import type { FileDialogResult, OpenDialogOptions } from "@shared/types/dialog"
import type { DownloadItem, DownloadStats } from "@shared/types/downloads"
import type { GameInstance, LaunchOptions } from "@shared/types/instances"
import type { AppSettings } from "@shared/types/settings"
import type { CpuInfo, MemoryWarningLevel, OsInfo, SystemMemoryInfo } from "@shared/types/system"
import type {
	CollectionDownloadStatus,
	CompleteCollectionResult,
	ParseCollectionResult,
	ProcessedMod,
	ProcessedModCollection,
	SteamPublishedFileDetails
} from "@shared/types/workshop"
import type { IpcRendererEvent } from "electron"

declare global {
	interface Window {
		electron: ElectronAPI
		api: {
			on: (
				channel: "deep-link:import-mod",
				callback: (event: IpcRendererEvent, data: { url: string }) => void
			) => void
			off: (
				channel: "deep-link:import-mod",
				callback: (event: IpcRendererEvent, data: { url: string }) => void
			) => void

			dialog: {
				openDirectory: (options?: OpenDialogOptions) => Promise<FileDialogResult>
				selectDirectory: (options?: OpenDialogOptions) => Promise<FileDialogResult>
			}
			downloads: {
				cancel: (id: string) => Promise<boolean>
				cleanup: (maxAgeMs?: number) => Promise<number>
				clearFinished: () => Promise<number>
				getAll: () => Promise<DownloadItem[]>
				getStats: () => Promise<DownloadStats>
				pause: (id: string) => Promise<boolean>
				resume: (id: string) => Promise<boolean>
				retry: (id: string) => Promise<boolean>
				queueWorkshopItem: (options: {
					workshopId: string
					name: string
					instanceId?: string
					metadata?: ProcessedMod
				}) => Promise<string>
				queueCollection: (
					collection: CompleteCollectionResult | ParseCollectionResult,
					instanceId?: string
				) => Promise<string>

				onUpdated: (callback: (event: IpcRendererEvent, download: DownloadItem) => void) => void
				onAdded: (callback: (event: IpcRendererEvent, download: DownloadItem) => void) => void
				offUpdated: (callback: (event: IpcRendererEvent, download: DownloadItem) => void) => void
				offAdded: (callback: (event: IpcRendererEvent, download: DownloadItem) => void) => void
			}
			filesystem: {
				isDirectoryWritable: (path: string) => Promise<boolean>
			}
			game: {
				detectPath: () => Promise<string>
				verifyPath: (path: string) => Promise<boolean>
				getRunningInstances: () => Promise<string[]>
				isInstanceRunning: (instanceId: string) => Promise<boolean>
			}
			instances: {
				create: (
					instanceData: Omit<
						GameInstance,
						"id" | "createdAt" | "status" | "lastPlayed" | "playTime"
					>
				) => Promise<GameInstance>
				delete: (id: string) => Promise<boolean>
				getAll: () => Promise<GameInstance[]>
				launch: (id: string, options?: LaunchOptions) => Promise<boolean>
				update: (id: string, updates: Partial<GameInstance>) => Promise<boolean>
				openDirectory: (id: string) => Promise<boolean>

				subscribeToUpdates: () => void
				onInstancesChanged: (
					callback: (event: IpcRendererEvent, instances: GameInstance[]) => void
				) => void
				offInstancesChanged: (
					callback: (event: IpcRendererEvent, instances: GameInstance[]) => void
				) => void
			}
			settings: {
				get: () => Promise<AppSettings>
				getDefaultPath: () => Promise<string>
				migrateInstances: (newPath: string) => Promise<boolean>
				set: (settings: Partial<AppSettings>) => Promise<boolean>
			}
			steam: {
				isAvailable: () => Promise<boolean>
				install: () => Promise<boolean>
				getCollectionDetails: (collectionId: string) => Promise<CompleteCollectionResult>
				getModDetails: (modId: string) => Promise<ProcessedMod | null>
			}
			system: {
				getMemoryInfo: () => Promise<SystemMemoryInfo>
				getMemoryOptions: () => Promise<number[]>
				getMemoryWarningLevel: (requestedMemoryMB: number) => Promise<MemoryWarningLevel>
				getOsInfo: () => Promise<OsInfo>
				getCpuInfo: () => Promise<CpuInfo>
			}
			window: {
				close: () => void
				getState: () => Promise<boolean>
				maximize: () => void
				minimize: () => void
			}
			mods: {
				getForInstance: (instanceId: string) => Promise<ProcessedMod[]>
				toggleMod: (instanceId: string, modId: string, enabled: boolean) => Promise<boolean>
				uninstallMod: (instanceId: string, modId: string) => Promise<boolean>
				openWorkshopPage: (workshopId: string) => Promise<boolean>
			}
			convertFilePath: (filePath: string) => string
		}
	}
}
