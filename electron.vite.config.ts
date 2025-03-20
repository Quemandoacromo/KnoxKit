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
							"react-vendor": ["react", "react-dom", "wouter"],
							"radix-ui": [
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
							utils: ["date-fns", "uuid", "fuse.js", "class-variance-authority", "tailwind-merge"]
						}
					}
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
