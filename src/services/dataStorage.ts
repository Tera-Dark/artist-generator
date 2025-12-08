import type { SharedPrompt } from '@/types'

const CHUNK_SIZE = 50
const BASE_PATH = 'public/data'

export interface StorageIndex {
    chunks: string[]
    total: number
    lastUpdated: number
}

/**
 * Service to handle efficient large-scale JSON storage and retrieval
 * Uses a chunked strategy: index.json points to multiple chunk_X.json files
 */
export const dataStorage = {
    /**
     * Efficiently loads all shared prompts by fetching chunks in parallel
     * @param baseUrl - The base URL of the application (e.g. from import.meta.env.BASE_URL)
     */
    async getAllPrompts(baseUrl: string = ''): Promise<SharedPrompt[]> {
        try {
            const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
            const timestamp = Date.now() // Cache busting

            // 1. Fetch Index
            const indexRes = await fetch(`${cleanBase}data/index.json?t=${timestamp}`)
            if (!indexRes.ok) {
                // Fallback for legacy or empty state
                console.warn('Index not found, trying legacy prompts.json')
                const legacyRes = await fetch(`${cleanBase}data/prompts.json?t=${timestamp}`)
                if (legacyRes.ok) return await legacyRes.json()
                return []
            }

            const indexData: StorageIndex = await indexRes.json()
            const chunks = indexData.chunks || []

            if (chunks.length === 0) return []

            // 2. Fetch all chunks in batches to avoid browser limit/rate limiting
            // We use a simple batching strategy
            const BATCH_SIZE = 5
            const results: any[] = []

            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                const batch = chunks.slice(i, i + BATCH_SIZE)
                const batchPromises = batch.map((chunkName: string) =>
                    fetch(`${cleanBase}data/${chunkName}?t=${timestamp}`)
                        .then(r => r.json())
                        .then(items => {
                            // Inject metadata about source chunk for easier updates/deletes
                            return items.map((item: any) => ({
                                ...item,
                                _chunkPath: `${BASE_PATH}/${chunkName}`
                            }))
                        })
                        .catch(e => {
                            console.error(`Failed to load chunk ${chunkName}`, e)
                            return []
                        })
                )
                const batchResults = await Promise.all(batchPromises)
                results.push(...batchResults)
            }

            // Flatten and sort if necessary (though chunks should be ordered)
            return results.flat()
        } catch (e) {
            console.error('Failed to load chunked data', e)
            return []
        }
    },

    /**
     * Constants for storage configuration
     */
    config: {
        CHUNK_SIZE,
        BASE_PATH,
        INDEX_PATH: `${BASE_PATH}/index.json`
    }
}
