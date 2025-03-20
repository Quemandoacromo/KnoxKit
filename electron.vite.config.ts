import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"

export default defineConfig(({ mode }) => {
	const isProduction = mode === "production"

	return {
		main: {
			build: {
				minify: isProduction,
				sourcemap: !isProduction,
				outDir: resolve("out/main")
			},
			plugins: [externalizeDepsPlugin()],
			resolve: {
				alias: {
					"@main": resolve("src/main"),
					"@shared": resolve("src/shared")
				}
			}
		},
		preload: {
			build: {
				minify: isProduction,
				sourcemap: !isProduction
			},
			plugins: [externalizeDepsPlugin()],
			resolve: {
				alias: {
					"@main": resolve("src/main"),
					"@shared": resolve("src/shared")
				}
			}
		},
		renderer: {
			build: {
				minify: isProduction,
				sourcemap: !isProduction,
				rollupOptions: {
					output: {
						manualChunks: {
							"vendor-react": ["react", "react-dom"],
							"vendor-ui-radix": [
								"@radix-ui/react-alert-dialog",
								"@radix-ui/react-collapsible",
								"@radix-ui/react-dialog",
								"@radix-ui/react-dropdown-menu",
								"@radix-ui/react-label",
								"@radix-ui/react-progress",
								"@radix-ui/react-scroll-area",
								"@radix-ui/react-select",
								"@radix-ui/react-separator",
								"@radix-ui/react-slider",
								"@radix-ui/react-slot",
								"@radix-ui/react-switch",
								"@radix-ui/react-tabs",
								"@radix-ui/react-toast",
								"@radix-ui/react-tooltip"
							],
							"vendor-styling": [
								"class-variance-authority",
								"tailwind-merge",
								"tailwindcss-animate",
								"@heroicons/react",
								"@fontsource-variable/inter",
								"@fontsource-variable/outfit"
							],
							"vendor-routing": ["wouter"],
							"vendor-state": ["nanostores", "@nanostores/react"],
							"vendor-utils": ["date-fns", "uuid", "fuse.js", "axios", "ini"],
							"vendor-electron": ["electron-conf", "electron-updater", "electron-winston"],
							pages: [
								"./src/renderer/src/pages/instances.tsx",
								"./src/renderer/src/pages/downloads.tsx",
								"./src/renderer/src/pages/setup.tsx",
								"./src/renderer/src/pages/workshop.tsx"
							]
						}
					},
					external: ["extract-zip", "yauzl", "get-stream", "fd-slicer"]
				}
			},
			resolve: {
				alias: {
					"@renderer": resolve("src/renderer/src"),
					"@shared": resolve("src/shared"),
					"@main": resolve("src/main")
				}
			},
			plugins: [react(), tailwindcss()]
		}
	}
})
