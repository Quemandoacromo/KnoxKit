import { useStore } from "@nanostores/react"
import { availableLanguages, currentLanguage, translate } from "@renderer/stores/i18n"
import { updateSetting } from "@renderer/stores/settings-store"
import type { LanguageType } from "@shared/types/settings"

export function useTranslation() {
	const language = useStore(currentLanguage)

	const changeLanguage = (newLanguage: string) => {
		if (availableLanguages.includes(newLanguage)) {
			currentLanguage.set(newLanguage)
			updateSetting("language", newLanguage as LanguageType)
		}
	}

	return {
		t: (key: string, variables?: Record<string, string | number>) =>
			translate(key, variables, language),
		language,
		changeLanguage,
		availableLanguages
	}
}
