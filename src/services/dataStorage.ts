import type { FeaturedPromptsMeta, PromptTagStat, SharedPrompt } from '@/types'

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
    async getMetadataResource<T>(path: string, baseUrl: string = '', repoConfig?: { owner: string, repo: string, branch?: string, bustCache?: boolean }): Promise<T | null> {
        try {
            const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
            const timestamp = repoConfig?.bustCache ? Date.now() : null
            const owner = repoConfig?.owner || import.meta.env.VITE_REPO_OWNER
            const repo = repoConfig?.repo || import.meta.env.VITE_REPO_NAME
            const branch = repoConfig?.branch || 'main'
            let rawBase = ''
            let useRaw = false

            if (owner && repo) {
                useRaw = true
                rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/public/`
            }

            const buildUrl = (base: string, resourcePath: string) => {
                const url = `${base}${resourcePath}`
                if (timestamp === null) return url
                return `${url}?t=${timestamp}`
            }

            const fetchResource = async () => {
                if (useRaw) {
                    try {
                        const res = await fetch(buildUrl(rawBase, path), {
                            cache: timestamp === null ? 'default' : 'no-store'
                        })
                        if (res.ok) return res
                    } catch {
                        console.warn(`[DataStorage] Raw fetch failed for ${path}, falling back`)
                    }
                }
                return fetch(buildUrl(cleanBase, path), {
                    cache: timestamp === null ? 'default' : 'no-store'
                })
            }

            const res = await fetchResource()
            if (!res.ok) return null
            return await res.json()
        } catch (e) {
            console.warn(`[DataStorage] Failed to load metadata resource ${path}`, e)
            return null
        }
    },

    /**
     * Efficiently loads all shared prompts by fetching chunks in parallel
     * @param baseUrl - The base URL of the application (e.g. from import.meta.env.BASE_URL)
     */
    async getAllPrompts(baseUrl: string = '', repoConfig?: { owner: string, repo: string, branch?: string, bustCache?: boolean }): Promise<SharedPrompt[]> {
        try {
            const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
            const timestamp = repoConfig?.bustCache ? Date.now() : null

            // Config for Raw GitHub Fetching (Freshest Data)
            // Priority: Passed config > Env vars
            const owner = repoConfig?.owner || import.meta.env.VITE_REPO_OWNER
            const repo = repoConfig?.repo || import.meta.env.VITE_REPO_NAME
            const branch = repoConfig?.branch || 'main'
            let rawBase = ''
            let useRaw = false

            if (owner && repo) {
                useRaw = true
                rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/public/`
                console.log(`[DataStorage] Enabled GitHub Raw fetch: ${rawBase}`)
            }

            console.log(`[DataStorage] Loading prompts from ${cleanBase}`)

            // Helper to fetch with fallback
            const buildUrl = (base: string, path: string) => {
                const url = `${base}${path}`
                if (timestamp === null) return url
                return `${url}?t=${timestamp}`
            }

            const fetchResource = async (path: string) => {
                if (useRaw) {
                    try {
                        const res = await fetch(buildUrl(rawBase, path), {
                            cache: timestamp === null ? 'default' : 'no-store'
                        })
                        if (res.ok) return res
                    } catch {
                        console.warn(`[DataStorage] Raw fetch failed for ${path}, falling back`)
                    }
                }
                return fetch(buildUrl(cleanBase, path), {
                    cache: timestamp === null ? 'default' : 'no-store'
                })
            }

            // 1. Fetch Index
            const indexRes = await fetchResource('data/index.json')
            if (!indexRes.ok) {
                // Fallback for legacy or empty state
                console.warn('[DataStorage] Index not found, trying legacy prompts.json')
                const legacyRes = await fetchResource('data/prompts.json')
                if (legacyRes.ok) {
                    const legacyData = await legacyRes.json()
                    console.log(`[DataStorage] Loaded ${legacyData.length} legacy prompts`)
                    return legacyData
                }
                return []
            }

            const indexData: StorageIndex = await indexRes.json()
            const chunks = indexData.chunks || []
            console.log(`[DataStorage] Found index with ${chunks.length} chunks, total items: ${indexData.total}`)

            if (chunks.length === 0) return []

            // 2. Fetch all chunks in batches to avoid browser limit/rate limiting
            // We use a simple batching strategy
            const BATCH_SIZE = 5
            const results: any[] = []

            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                const batch = chunks.slice(i, i + BATCH_SIZE)
                const batchPromises = batch.map((chunkName: string) =>
                    fetchResource(`data/${chunkName}`)
                        .then(r => r.json())
                        .then(items => {
                            // Inject metadata about source chunk for easier updates/deletes
                            return items.map((item: any) => ({
                                ...item,
                                _chunkPath: `${BASE_PATH}/${chunkName}`
                            }))
                        })
                        .catch(e => {
                            console.error(`[DataStorage] Failed to load chunk ${chunkName}`, e)
                            return []
                        })
                )
                const batchResults = await Promise.all(batchPromises)
                console.log(`[DataStorage] Batch loaded. Items: ${batchResults.map(b => b.length).join(', ')}`)
                results.push(...batchResults)
            }

            // Flatten and sort if necessary (though chunks should be ordered)
            return results.flat()
        } catch (e) {
            console.error('Failed to load chunked data', e)
            return []
        }
    },

    async getFeaturedPrompts(baseUrl: string = '', repoConfig?: { owner: string, repo: string, branch?: string, bustCache?: boolean }): Promise<FeaturedPromptsMeta | null> {
        return this.getMetadataResource<FeaturedPromptsMeta>('data/featured.json', baseUrl, repoConfig)
    },

    async getTagStats(baseUrl: string = '', repoConfig?: { owner: string, repo: string, branch?: string, bustCache?: boolean }): Promise<PromptTagStat[]> {
        const data = await this.getMetadataResource<PromptTagStat[]>('data/tags.json', baseUrl, repoConfig)
        return Array.isArray(data) ? data : []
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
