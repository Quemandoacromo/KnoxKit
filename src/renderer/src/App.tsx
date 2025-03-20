import "@renderer/styles/globals.css"
import { useStore } from "@nanostores/react"
import Layout from "@renderer/layouts/Layout"
import { DownloadsPage } from "@renderer/pages/downloads"
import InstancesPage from "@renderer/pages/instances"
import ModsPage from "@renderer/pages/mods"
import SettingsPage from "@renderer/pages/settings"
import SetupPage from "@renderer/pages/setup"
import { WorkshopPage } from "@renderer/pages/workshop"
import { ThemeProvider } from "@renderer/providers/theme-provider"
import { initSettings, settingsStore } from "@renderer/stores/settings-store"
import { useEffect, useState } from "react"
import { Link, Route, Router, Switch } from "wouter"
import { useHashLocation } from "wouter/use-hash-location"
import { ImportModDialog } from "./components/workshop/import-mod-dialog"

function App(): JSX.Element {
	const settings = useStore(settingsStore)
	const [isLoading, setIsLoading] = useState(true)
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
	const [importModUrl, setImportModUrl] = useState("")

	useEffect(() => {
		const handleDeepLink = (_event: any, data: { url: string }) => {
			if (data?.url) {
				setImportModUrl(data.url)
				setIsImportDialogOpen(true)
			}
		}

		window.api.on("deep-link:import-mod", handleDeepLink)

		return () => {
			window.api.off("deep-link:import-mod", handleDeepLink)
		}
	}, [])

	useEffect(() => {
		const loadSettings = async () => {
			await initSettings()
			setIsLoading(false)
		}

		loadSettings()
	}, [])

	if (isLoading) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="spinner h-8 w-8 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
					<p>Loading KnoxKit...</p>
				</div>
			</div>
		)
	}

	if (!settings.setupComplete) {
		return (
			<ThemeProvider defaultTheme={settings.theme || "dark"}>
				<SetupPage />
			</ThemeProvider>
		)
	}

	return (
		<ThemeProvider defaultTheme={settings.theme || "dark"}>
			<Router hook={useHashLocation}>
				<Layout>
					<Switch>
						<Route path="/" component={InstancesPage} />
						<Route path="/mods" component={ModsPage} />
						<Route path="/workshop" component={WorkshopPage} />
						<Route path="/settings" component={SettingsPage} />
						<Route path="/downloads" component={DownloadsPage} />

						<Route path="/:rest*">
							{() => (
								<div className="flex flex-col items-center justify-center h-full">
									<h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
									<p className="text-muted-foreground mb-6">
										The page you're looking for doesn't exist in this application.
									</p>
									<div className="flex gap-4">
										<Link
											href="/"
											className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
										>
											Go to Instances
										</Link>
										<Link
											href="/settings"
											className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
										>
											Go to Settings
										</Link>
									</div>
								</div>
							)}
						</Route>
					</Switch>
				</Layout>

				<ImportModDialog
					open={isImportDialogOpen}
					onOpenChange={setIsImportDialogOpen}
					initialUrl={importModUrl}
					redirectToDownloads={true}
				/>
			</Router>
		</ThemeProvider>
	)
}

export default App
