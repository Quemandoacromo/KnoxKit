import logger from "@main/utils/logger"
import { STEAM_API_BASE_URL } from "@shared/constants/steam"
import type {
	SteamCollectionDetails,
	SteamCollectionDetailsResponse,
	SteamPublishedFileDetails,
	SteamPublishedFileDetailsResponse
} from "@shared/types/workshop"
import axios from "axios"

/**
 * Gets details of a published item in Steam Workshop
 * @param publishedFileId ID of the published item
 */
export async function getPublishedFileDetails(
	publishedFileId: string
): Promise<SteamPublishedFileDetails | null> {
	try {
		const formData = new URLSearchParams()
		formData.append("itemcount", "1")
		formData.append("publishedfileids[0]", publishedFileId)

		const response = await axios.post<SteamPublishedFileDetailsResponse>(
			`${STEAM_API_BASE_URL}/GetPublishedFileDetails/v1/`,
			formData,
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			}
		)

		if (
			response.data.response.result === 1 &&
			response.data.response.resultcount > 0 &&
			response.data.response.publishedfiledetails.length > 0
		) {
			return response.data.response.publishedfiledetails[0]
		}

		return null
	} catch (error) {
		logger.steam.error(`Error fetching details for file ${publishedFileId}: ${error}`)
		return null
	}
}

/**
 * Gets details of multiple Steam Workshop items
 * @param publishedFileIds Array of published item IDs
 */
export async function getMultiplePublishedFileDetails(
	publishedFileIds: string[]
): Promise<SteamPublishedFileDetails[]> {
	if (publishedFileIds.length === 0) {
		return []
	}

	try {
		const formData = new URLSearchParams()
		formData.append("itemcount", publishedFileIds.length.toString())

		publishedFileIds.forEach((id, index) => {
			formData.append(`publishedfileids[${index}]`, id)
		})

		const response = await axios.post<SteamPublishedFileDetailsResponse>(
			`${STEAM_API_BASE_URL}/GetPublishedFileDetails/v1/`,
			formData,
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			}
		)

		if (response.data.response.result === 1 && response.data.response.resultcount > 0) {
			return response.data.response.publishedfiledetails
		}

		return []
	} catch (error) {
		logger.steam.error(`Error fetching details for multiple files: ${error}`)
		return []
	}
}

/**
 * Gets details of a Steam Workshop collection
 * @param collectionId ID of the collection
 */
export async function getCollectionDetails(
	collectionId: string
): Promise<SteamCollectionDetails | null> {
	try {
		const formData = new URLSearchParams()
		formData.append("collectioncount", "1")
		formData.append("publishedfileids[0]", collectionId)

		const response = await axios.post<SteamCollectionDetailsResponse>(
			`${STEAM_API_BASE_URL}/GetCollectionDetails/v1/`,
			formData,
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				}
			}
		)

		if (
			response.data.response.result === 1 &&
			response.data.response.resultcount > 0 &&
			response.data.response.collectiondetails.length > 0
		) {
			return response.data.response.collectiondetails[0]
		}

		return null
	} catch (error) {
		logger.steam.error(`Error fetching collection details for ${collectionId}: ${error}`)
		return null
	}
}

/**
 * Gets items of a collection and their details
 * @param collectionId ID of the collection
 */
export async function getCollectionItemsWithDetails(
	collectionId: string
): Promise<SteamPublishedFileDetails[]> {
	try {
		const collection = await getCollectionDetails(collectionId)
		if (!collection || !collection.children || collection.children.length === 0) {
			return []
		}

		const itemIds = collection.children.map((item) => item.publishedfileid)

		return getMultiplePublishedFileDetails(itemIds)
	} catch (error) {
		logger.steam.error(`Error fetching collection items with details for ${collectionId}: ${error}`)
		return []
	}
}
