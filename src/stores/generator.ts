import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Artist,
  FeaturedPromptsMeta,
  OfflineCollection,
  OfflineCollectionArtistItem,
  OfflineCollectionPromptItem,
  OfflineProfile,
  PromptTagStat,
  SharedPrompt,
  ToastMessage,
} from '@/types'
import { githubService } from '@/services/github'
import { authService } from '@/services/auth'
import { catboxService } from '@/services/catbox'
import { dataStorage } from '@/services/dataStorage'
import {
  findDuplicatePromptMatches,
  sanitizePromptPayload,
  validatePromptPayload,
} from '@/utils/promptSubmission'

export const useGeneratorStore = defineStore('generator', () => {
  // --- States ---
  const isAuthLoading = ref(false)
  const isArtistsLoading = ref(false)
  const isPromptsLoading = ref(false)
  const isSubmissionLoading = ref(false)
  const isUploadLoading = ref(false)
  const isModerationLoading = ref(false)
  const isPublishedPromptLoading = ref(false)
  const isLoading = computed(() =>
    isAuthLoading.value ||
    isArtistsLoading.value ||
    isPromptsLoading.value ||
    isSubmissionLoading.value ||
    isUploadLoading.value ||
    isModerationLoading.value ||
    isPublishedPromptLoading.value,
  )
  const artistsLoadedAt = ref<number | null>(null)
  const artists = ref<Artist[]>([])
  const toasts = ref<ToastMessage[]>([])

  const sharedPrompts = ref<SharedPrompt[]>([])
  const featuredPrompts = ref<SharedPrompt[]>([])
  const featuredMeta = ref<FeaturedPromptsMeta | null>(null)
  const promptTagStats = ref<PromptTagStat[]>([])
  const userPrompts = ref<SharedPrompt[]>([])
  const pendingSubmissions = ref<SharedPrompt[]>([])
  const draftSubmissions = ref<SharedPrompt[]>([])
  const rejectedSubmissions = ref<SharedPrompt[]>([])
  const isModerator = ref(false)
  const user = ref<any>(null)

  // Offline identities & collections (Persisted locally)
  const offlineProfiles = ref<OfflineProfile[]>([])
  const activeOfflineProfileId = ref('')
  const localCollections = ref<OfflineCollection[]>([])
  const OFFLINE_PROFILES_KEY = 'ag_offline_profiles_v1'
  const ACTIVE_OFFLINE_PROFILE_KEY = 'ag_active_offline_profile_v1'
  const LOCAL_COLLECTIONS_KEY = 'ag_local_collections_v1'

  // Legacy favorites storage keys kept for migration
  const FAVORITES_KEY = 'ag_favorites_v1'
  const ARTIST_FAVORITES_KEY = 'ag_artist_favorites_v1'

  // Local Drafts (Persisted locally)
  const localDrafts = ref<SharedPrompt[]>([])
  const LOCAL_DRAFTS_KEY = 'ag_local_drafts_v1'

  // Config
  const ARTISTS_TTL_MS = 15 * 60 * 1000

  const USER_PROMPTS_KEY = 'ag_user_prompts_v1'
  const repoOwner = import.meta.env.VITE_REPO_OWNER || ''
  const repoName = import.meta.env.VITE_REPO_NAME || ''
  const DEFAULT_OFFLINE_PROFILE_NAME = '本地用户'
  const DEFAULT_COLLECTION_NAME = '默认收藏夹'

  // --- Helpers ---
  const createLocalId = (prefix: string) =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString().slice(2)
    toasts.value.push({ id, type, title, message, duration })
    if (duration > 0) setTimeout(() => removeToast(id), duration)
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const persistOfflineProfiles = () => {
    localStorage.setItem(OFFLINE_PROFILES_KEY, JSON.stringify(offlineProfiles.value))
    localStorage.setItem(ACTIVE_OFFLINE_PROFILE_KEY, activeOfflineProfileId.value)
  }

  const persistLocalCollections = () => {
    localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(localCollections.value))
  }

  const activeOfflineProfile = computed(() =>
    offlineProfiles.value.find((profile) => profile.id === activeOfflineProfileId.value) || null,
  )

  const activeLocalCollections = computed(() =>
    localCollections.value
      .filter((collection) => collection.profileId === activeOfflineProfileId.value)
      .sort((a, b) => {
        if (a.isDefault) return -1
        if (b.isDefault) return 1
        return b.updatedAt - a.updatedAt
      }),
  )

  const defaultCollection = computed(() =>
    activeLocalCollections.value.find((collection) => collection.isDefault) || null,
  )

  const activeLocalDrafts = computed(() =>
    localDrafts.value
      .filter((draft) => !draft._profileId || draft._profileId === activeOfflineProfileId.value)
      .sort((a, b) => (b._updatedAt || 0) - (a._updatedAt || 0)),
  )

  const activeDraftCount = computed(() => activeLocalDrafts.value.length)

  const favorites = computed(() =>
    (defaultCollection.value?.prompts || []).map((item) => item.snapshot),
  )

  const artistFavorites = computed(() =>
    (defaultCollection.value?.artists || []).map((item) => item.snapshot.name),
  )

  const snapshotPrompt = (item: SharedPrompt): SharedPrompt => ({
    ...item,
    tags: [...(item.tags || [])],
  })

  const snapshotArtist = (artist: Artist | string) => {
    if (typeof artist === 'string') {
      const existing = artists.value.find((entry) => entry.name === artist)
      if (existing) {
        return {
          name: existing.name,
          other_names: [...(existing.other_names || [])],
          post_count: existing.post_count,
          danbooru_url: existing.danbooru_url,
        }
      }

      return { name: artist }
    }

    return {
      name: artist.name,
      other_names: [...(artist.other_names || [])],
      post_count: artist.post_count,
      danbooru_url: artist.danbooru_url,
    }
  }

  const ensureDefaultCollection = (profileId: string) => {
    let collection = localCollections.value.find(
      (entry) => entry.profileId === profileId && entry.isDefault,
    )

    if (!collection) {
      const now = Date.now()
      collection = {
        id: createLocalId('collection'),
        profileId,
        name: DEFAULT_COLLECTION_NAME,
        description: '用于快速收藏常用画师串和画师',
        createdAt: now,
        updatedAt: now,
        isDefault: true,
        prompts: [],
        artists: [],
      }
      localCollections.value = [collection, ...localCollections.value]
      persistLocalCollections()
    }

    return collection
  }

  const ensureOfflineSetup = () => {
    if (!offlineProfiles.value.length) {
      const now = Date.now()
      const defaultProfile: OfflineProfile = {
        id: createLocalId('profile'),
        name: DEFAULT_OFFLINE_PROFILE_NAME,
        createdAt: now,
        updatedAt: now,
      }
      offlineProfiles.value = [defaultProfile]
      activeOfflineProfileId.value = defaultProfile.id
      persistOfflineProfiles()
    }

    if (!activeOfflineProfileId.value || !offlineProfiles.value.some((profile) => profile.id === activeOfflineProfileId.value)) {
      activeOfflineProfileId.value = offlineProfiles.value[0]?.id || ''
      persistOfflineProfiles()
    }

    if (activeOfflineProfileId.value) {
      ensureDefaultCollection(activeOfflineProfileId.value)
    }
  }

  const updateCollection = (collectionId: string, updater: (collection: OfflineCollection) => void) => {
    const target = localCollections.value.find((item) => item.id === collectionId)
    if (!target) return null

    updater(target)
    target.updatedAt = Date.now()
    persistLocalCollections()

    return target
  }

  const decorateModerationPrompt = (
    prompt: SharedPrompt,
    opts?: {
      publishedCandidates?: SharedPrompt[]
      submissionCandidates?: SharedPrompt[]
    },
  ) => {
    const validation = validatePromptPayload(prompt)
    const publishedMatches = findDuplicatePromptMatches(
      prompt,
      opts?.publishedCandidates || [],
      'published',
      prompt.id,
    )
    const submissionMatches = findDuplicatePromptMatches(
      prompt,
      opts?.submissionCandidates || [],
      'submission',
      prompt.id,
    )

    return {
      ...prompt,
      _validation: validation,
      _duplicateMatches: [...publishedMatches, ...submissionMatches]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    } as SharedPrompt
  }

  const decoratePromptList = (list: SharedPrompt[]) => {
    return list.map((item) =>
      decorateModerationPrompt(item, {
        publishedCandidates: sharedPrompts.value,
        submissionCandidates: list,
      }),
    )
  }

  const refreshModerationAnnotations = () => {
    if (pendingSubmissions.value.length) {
      pendingSubmissions.value = decoratePromptList([...pendingSubmissions.value])
    }
    if (draftSubmissions.value.length) {
      draftSubmissions.value = decoratePromptList([...draftSubmissions.value])
    }
    if (userPrompts.value.length) {
      userPrompts.value = decoratePromptList([...userPrompts.value])
    }
    if (rejectedSubmissions.value.length) {
      rejectedSubmissions.value = decoratePromptList([...rejectedSubmissions.value])
    }
  }

  const syncFeaturedItemsFromMeta = (meta: FeaturedPromptsMeta | null) => {
    if (!meta) {
      featuredPrompts.value = []
      return
    }

    const promptMap = new Map(sharedPrompts.value.map((item) => [item.id, item]))
    const selectedItems: SharedPrompt[] = []

    ;(meta.items || []).forEach((item) => {
      const latest = promptMap.get(item.id)
      selectedItems.push(latest || (sanitizePromptPayload(item) as SharedPrompt))
    })

    featuredPrompts.value = selectedItems
  }

  const loadPromptMetadata = async (opts?: { force?: boolean }) => {
    try {
      const base = import.meta.env.BASE_URL
      const owner = repoOwner || user.value?.login
      const repo = repoName || 'artist-generator'
      const repoConfig = {
        owner,
        repo,
        branch: 'main',
        bustCache: opts?.force,
      }

      const [featuredData, tagData] = await Promise.all([
        dataStorage.getFeaturedPrompts(base, repoConfig),
        dataStorage.getTagStats(base, repoConfig),
      ])

      if (featuredData && !Array.isArray(featuredData) && Array.isArray(featuredData.items)) {
        featuredMeta.value = featuredData
        syncFeaturedItemsFromMeta(featuredData)
      } else if (Array.isArray(featuredData)) {
        featuredMeta.value = {
          manualIds: [],
          items: featuredData.map((item) => sanitizePromptPayload(item) as SharedPrompt),
          updatedAt: Date.now(),
        }
        syncFeaturedItemsFromMeta(featuredMeta.value)
      } else {
        featuredMeta.value = null
        featuredPrompts.value = []
      }

      promptTagStats.value = Array.isArray(tagData) ? tagData : []
    } catch (e) {
      console.warn('Failed to load prompt metadata', e)
      featuredMeta.value = null
      featuredPrompts.value = []
      promptTagStats.value = []
    }
  }

  const isFeaturedPrompt = (promptId: string) => {
    return featuredMeta.value?.manualIds.includes(promptId) || false
  }

  const ensureCollectionsForAllProfiles = () => {
    offlineProfiles.value.forEach((profile) => {
      ensureDefaultCollection(profile.id)
    })
  }

  const cloneSerializable = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  const exportOfflineData = () => {
    ensureOfflineSetup()

    return {
      version: 1,
      exportedAt: Date.now(),
      offlineProfiles: cloneSerializable(offlineProfiles.value),
      activeOfflineProfileId: activeOfflineProfileId.value,
      localCollections: cloneSerializable(localCollections.value),
      localDrafts: cloneSerializable(localDrafts.value),
    }
  }

  const importOfflineData = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') {
      throw new Error('无效的导入数据')
    }

    const bundle = raw as {
      offlineProfiles?: unknown
      activeOfflineProfileId?: unknown
      localCollections?: unknown
      localDrafts?: unknown
    }

    offlineProfiles.value = Array.isArray(bundle.offlineProfiles)
      ? bundle.offlineProfiles.filter((item): item is OfflineProfile => {
          return !!item && typeof item === 'object' && typeof (item as OfflineProfile).id === 'string'
        })
      : []

    activeOfflineProfileId.value =
      typeof bundle.activeOfflineProfileId === 'string' ? bundle.activeOfflineProfileId : ''

    localCollections.value = Array.isArray(bundle.localCollections)
      ? bundle.localCollections.filter((item): item is OfflineCollection => {
          return !!item && typeof item === 'object' && typeof (item as OfflineCollection).id === 'string'
        })
      : []

    localDrafts.value = Array.isArray(bundle.localDrafts)
      ? bundle.localDrafts.filter((item): item is SharedPrompt => {
          return !!item && typeof item === 'object' && typeof (item as SharedPrompt).id === 'string'
        })
      : []

    ensureOfflineSetup()
    ensureCollectionsForAllProfiles()

    localDrafts.value = localDrafts.value.map((draft) => ({
      ...draft,
      _profileId: draft._profileId || activeOfflineProfileId.value,
      _draftLabel:
        draft._draftLabel ||
        offlineProfiles.value.find((profile) => profile.id === (draft._profileId || activeOfflineProfileId.value))
          ?.name ||
        DEFAULT_OFFLINE_PROFILE_NAME,
    }))

    persistOfflineProfiles()
    persistLocalCollections()
    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(localDrafts.value))

    return {
      profiles: offlineProfiles.value.length,
      collections: localCollections.value.length,
      drafts: localDrafts.value.length,
    }
  }

  // --- Auth: GitHub OAuth ---
  const initAuth = async () => {
    // Check if we have a token saved
    const token = authService.getToken()
    if (!token) return false

    isAuthLoading.value = true
    try {
      const owner = import.meta.env.VITE_REPO_OWNER || ''
      const repo = import.meta.env.VITE_REPO_NAME || ''
      return await verifyModerator(token, owner, repo, { silent: true })
    } finally {
      isAuthLoading.value = false
    }
  }

  const handleAuthCallback = async (code: string) => {
    isAuthLoading.value = true
    try {
      const token = await authService.handleCallback(code)
      if (token) {
        const owner = import.meta.env.VITE_REPO_OWNER || ''
        const repo = import.meta.env.VITE_REPO_NAME || ''
        await verifyModerator(token, owner, repo)
        // Clear code from URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        addToast('error', 'Auth Failed', 'Could not exchange code for token. Check Gatekeeper URL.')
      }
    } catch {
      addToast('error', 'Auth Error', 'Authentication process failed')
    } finally {
      isAuthLoading.value = false
    }
  }

  const loginWithGitHub = () => {
    authService.login()
  }

  const logout = async () => {
    authService.logout()
    isModerator.value = false
    user.value = null
    // Reload to clear state cleanly
    window.location.reload()
  }

  // --- Actions: Offline identities & collections ---
  const loadFavorites = () => {
    try {
      const profilesRaw = localStorage.getItem(OFFLINE_PROFILES_KEY)
      const activeProfileRaw = localStorage.getItem(ACTIVE_OFFLINE_PROFILE_KEY)
      const collectionsRaw = localStorage.getItem(LOCAL_COLLECTIONS_KEY)

      offlineProfiles.value = profilesRaw ? JSON.parse(profilesRaw) : []
      activeOfflineProfileId.value = activeProfileRaw || ''
      localCollections.value = collectionsRaw ? JSON.parse(collectionsRaw) : []
    } catch (e) {
      console.error('Failed to load offline collections', e)
      offlineProfiles.value = []
      activeOfflineProfileId.value = ''
      localCollections.value = []
    }

    ensureOfflineSetup()
    ensureCollectionsForAllProfiles()

    // One-time migration from legacy favorites storage.
    try {
      const legacyPromptRaw = localStorage.getItem(FAVORITES_KEY)
      if (legacyPromptRaw && defaultCollection.value) {
        const legacyPrompts = JSON.parse(legacyPromptRaw) as SharedPrompt[]
        if (Array.isArray(legacyPrompts)) {
          legacyPrompts.forEach((item) => {
            if (item?.id) addPromptToCollection(item, defaultCollection.value!.id, { silent: true })
          })
        }
        localStorage.removeItem(FAVORITES_KEY)
      }
    } catch (e) {
      console.warn('Failed to migrate legacy prompt favorites', e)
    }

    try {
      const legacyArtistRaw = localStorage.getItem(ARTIST_FAVORITES_KEY)
      if (legacyArtistRaw && defaultCollection.value) {
        const legacyArtists = JSON.parse(legacyArtistRaw) as string[]
        if (Array.isArray(legacyArtists)) {
          legacyArtists.forEach((name) => {
            if (typeof name === 'string' && name.trim()) {
              addArtistToCollection(name, defaultCollection.value!.id, { silent: true })
            }
          })
        }
        localStorage.removeItem(ARTIST_FAVORITES_KEY)
      }
    } catch (e) {
      console.warn('Failed to migrate legacy artist favorites', e)
    }
  }

  const loadArtistFavorites = () => {
    loadFavorites()
  }

  const setActiveOfflineProfile = (profileId: string) => {
    if (!offlineProfiles.value.some((profile) => profile.id === profileId)) return
    activeOfflineProfileId.value = profileId
    ensureDefaultCollection(profileId)
    persistOfflineProfiles()
  }

  const createOfflineProfile = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return null

    const now = Date.now()
    const profile: OfflineProfile = {
      id: createLocalId('profile'),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
    }

    offlineProfiles.value = [profile, ...offlineProfiles.value]
    activeOfflineProfileId.value = profile.id
    ensureDefaultCollection(profile.id)
    persistOfflineProfiles()

    return profile
  }

  const renameOfflineProfile = (profileId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return false

    const profile = offlineProfiles.value.find((item) => item.id === profileId)
    if (!profile) return false

    profile.name = trimmed
    profile.updatedAt = Date.now()
    persistOfflineProfiles()
    return true
  }

  const deleteOfflineProfile = (profileId: string) => {
    if (offlineProfiles.value.length <= 1) return false

    offlineProfiles.value = offlineProfiles.value.filter((profile) => profile.id !== profileId)
    localCollections.value = localCollections.value.filter((collection) => collection.profileId !== profileId)

    if (activeOfflineProfileId.value === profileId) {
      activeOfflineProfileId.value = offlineProfiles.value[0]?.id || ''
    }

    ensureOfflineSetup()
    persistOfflineProfiles()
    persistLocalCollections()
    return true
  }

  const createLocalCollection = (name: string, description = '') => {
    const trimmed = name.trim()
    if (!trimmed || !activeOfflineProfileId.value) return null

    const now = Date.now()
    const collection: OfflineCollection = {
      id: createLocalId('collection'),
      profileId: activeOfflineProfileId.value,
      name: trimmed,
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      prompts: [],
      artists: [],
    }

    localCollections.value = [collection, ...localCollections.value]
    persistLocalCollections()
    return collection
  }

  const renameLocalCollection = (collectionId: string, name: string, description?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return false

    const updated = updateCollection(collectionId, (collection) => {
      collection.name = trimmed
      if (typeof description === 'string') {
        collection.description = description.trim()
      }
    })

    return !!updated
  }

  const deleteLocalCollection = (collectionId: string) => {
    const target = localCollections.value.find((collection) => collection.id === collectionId)
    if (!target || target.isDefault) return false

    localCollections.value = localCollections.value.filter((collection) => collection.id !== collectionId)
    persistLocalCollections()
    return true
  }

  const addPromptToCollection = (
    item: SharedPrompt,
    collectionId: string,
    opts?: { silent?: boolean },
  ) => {
    const target = localCollections.value.find((collection) => collection.id === collectionId)
    if (!target) return false

    const exists = target.prompts.some((entry) => entry.promptId === item.id)
    if (exists) {
      if (!opts?.silent) {
        addToast('info', '已在收藏夹中', `《${item.title || '未命名 Prompt'}》已经存在`, 1800)
      }
      return false
    }

    const promptItem: OfflineCollectionPromptItem = {
      promptId: item.id,
      addedAt: Date.now(),
      snapshot: snapshotPrompt(item),
    }

    updateCollection(collectionId, (collection) => {
      collection.prompts.unshift(promptItem)
    })

    if (!opts?.silent) {
      addToast('success', '已加入收藏夹', `《${item.title || '未命名 Prompt'}》已保存`, 1800)
    }

    return true
  }

  const removePromptFromCollection = (promptId: string, collectionId: string, opts?: { silent?: boolean }) => {
    const updated = updateCollection(collectionId, (collection) => {
      collection.prompts = collection.prompts.filter((entry) => entry.promptId !== promptId)
    })

    if (updated && !opts?.silent) {
      addToast('info', '已移出收藏夹', 'Prompt 已从收藏夹移除', 1600)
    }

    return !!updated
  }

  const getPromptCollections = (promptId: string) => {
    return activeLocalCollections.value.filter((collection) =>
      collection.prompts.some((entry) => entry.promptId === promptId),
    )
  }

  const isFavorite = (id: string) => {
    return defaultCollection.value?.prompts.some((entry) => entry.promptId === id) || false
  }

  const toggleFavorite = (item: SharedPrompt) => {
    const collection = defaultCollection.value || (activeOfflineProfileId.value ? ensureDefaultCollection(activeOfflineProfileId.value) : null)
    if (!collection) return

    if (collection.prompts.some((entry) => entry.promptId === item.id)) {
      removePromptFromCollection(item.id, collection.id, { silent: true })
      addToast('info', '已取消收藏', `《${item.title || '未命名 Prompt'}》已移出默认收藏夹`, 1800)
    } else {
      addPromptToCollection(item, collection.id, { silent: true })
      addToast('success', '已收藏', `《${item.title || '未命名 Prompt'}》已加入默认收藏夹`, 1800)
    }
  }

  const addArtistToCollection = (
    artist: Artist | string,
    collectionId: string,
    opts?: { silent?: boolean },
  ) => {
    const target = localCollections.value.find((collection) => collection.id === collectionId)
    if (!target) return false

    const snapshot = snapshotArtist(artist)
    const exists = target.artists.some((entry) => entry.artistName === snapshot.name)
    if (exists) {
      if (!opts?.silent) {
        addToast('info', '画师已在收藏夹中', snapshot.name, 1600)
      }
      return false
    }

    const artistItem: OfflineCollectionArtistItem = {
      artistName: snapshot.name,
      addedAt: Date.now(),
      snapshot,
    }

    updateCollection(collectionId, (collection) => {
      collection.artists.unshift(artistItem)
    })

    if (!opts?.silent) {
      addToast('success', '画师已收藏', snapshot.name, 1600)
    }

    return true
  }

  const removeArtistFromCollection = (artistName: string, collectionId: string, opts?: { silent?: boolean }) => {
    const updated = updateCollection(collectionId, (collection) => {
      collection.artists = collection.artists.filter((entry) => entry.artistName !== artistName)
    })

    if (updated && !opts?.silent) {
      addToast('info', '已移出收藏', artistName, 1500)
    }

    return !!updated
  }

  const isArtistFavorite = (name: string) => {
    return defaultCollection.value?.artists.some((entry) => entry.artistName === name) || false
  }

  const toggleArtistFavorite = (artist: Artist | string) => {
    const collection = defaultCollection.value || (activeOfflineProfileId.value ? ensureDefaultCollection(activeOfflineProfileId.value) : null)
    if (!collection) return

    const artistName = typeof artist === 'string' ? artist : artist.name
    if (collection.artists.some((entry) => entry.artistName === artistName)) {
      removeArtistFromCollection(artistName, collection.id, { silent: true })
      addToast('info', '已取消收藏画师', artistName, 1500)
    } else {
      addArtistToCollection(artist, collection.id, { silent: true })
      addToast('success', '已收藏画师', artistName, 1500)
    }
  }

  // --- Actions: User Submissions ---
  // (Moved to below to use consistent logic)

  // --- Actions: Artists ---
  let pendingArtistLoad: Promise<void> | null = null
  const loadArtists = async (opts?: { force?: boolean; silent?: boolean }) => {
    if (!opts?.force && artists.value.length && artistsLoadedAt.value && (Date.now() - artistsLoadedAt.value < ARTISTS_TTL_MS)) return
    if (pendingArtistLoad) return pendingArtistLoad

    pendingArtistLoad = (async () => {
      isArtistsLoading.value = true
      try {
        const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/'
        const path = `${base}data/artists.json${opts?.force ? `?t=${Date.now()}` : ''}`
        const res = await fetch(path, {
          cache: opts?.force ? 'no-store' : 'default'
        })
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        artists.value = Array.isArray(data) ? data : (data.artists || [])
        artistsLoadedAt.value = Date.now()
        if (artists.value.length && localCollections.value.length) {
          let didUpdateArtistSnapshot = false
          const artistMap = new Map(artists.value.map((artist) => [artist.name, artist]))
          localCollections.value.forEach((collection) => {
            collection.artists = collection.artists.map((entry) => {
              const latest = artistMap.get(entry.artistName)
              if (!latest) return entry
              didUpdateArtistSnapshot = true
              return {
                ...entry,
                snapshot: snapshotArtist(latest),
              }
            })
          })
          if (didUpdateArtistSnapshot) {
            persistLocalCollections()
          }
        }
        if (!opts?.silent) {
          addToast('success', 'Ready', `Loaded ${artists.value.length} artists`, 1500)
        }
      } catch (e) {
        console.error(e)
        artists.value = []
        addToast('error', 'Error', 'Failed to load artists library', 3000)
      } finally {
        isArtistsLoading.value = false
        pendingArtistLoad = null
      }
    })()
    await pendingArtistLoad
  }

  // --- Actions: Prompts (Read Public) ---
  const loadSharedPrompts = async (opts?: { force?: boolean }) => {
    if (!opts?.force && sharedPrompts.value.length) return // Simple cache

    isPromptsLoading.value = true
    try {
      const base = import.meta.env.BASE_URL
      // Try to get repo config from state or env to enable Raw Fetch
      const owner = repoOwner || user.value?.login // Fallback to current user if logged in
      const repo = repoName || 'artist-generator' // Fallback to default name if unknown

      console.log('[GeneratorStore] Loading prompts with config:', { base, owner, repo })

      const loadedPrompts = await dataStorage.getAllPrompts(base, {
        owner,
        repo,
        branch: 'main',
        bustCache: opts?.force
      })
      sharedPrompts.value = loadedPrompts.map((item) => sanitizePromptPayload(item) as SharedPrompt)
      if (sharedPrompts.value.length && localCollections.value.length) {
        let didUpdatePromptSnapshot = false
        const promptMap = new Map(sharedPrompts.value.map((item) => [item.id, item]))
        localCollections.value.forEach((collection) => {
          collection.prompts = collection.prompts.map((entry) => {
            const latest = promptMap.get(entry.promptId)
            if (!latest) return entry
            didUpdatePromptSnapshot = true
            return {
              ...entry,
              snapshot: snapshotPrompt(latest),
            }
          })
        })
        if (didUpdatePromptSnapshot) {
          persistLocalCollections()
        }
      }
      if (featuredMeta.value) {
        syncFeaturedItemsFromMeta(featuredMeta.value)
      }
      await loadPromptMetadata(opts)
      refreshModerationAnnotations()
    } catch (e) {
      console.warn('Failed to load prompts', e)
      sharedPrompts.value = []
    } finally {
      isPromptsLoading.value = false
    }
  }

  // --- Actions: Submit (Public) ---
  const getSubmissionLink = (item: SharedPrompt) => {
    return githubService.getSubmissionLink(item)
  }

  const submitIssue = async (data: any) => {
    isSubmissionLoading.value = true
    try {
      const payload = {
        ...sanitizePromptPayload(data),
        created_at: data.created_at || Date.now(),
      } as SharedPrompt
      const validation = validatePromptPayload(payload)
      const hardErrors = validation.issues.filter((issue) => issue.severity === 'error')
      if (hardErrors.length) {
        addToast('error', '投稿未通过校验', hardErrors[0]?.message || '请完善表单后再提交', 2400)
        throw new Error(hardErrors.map((issue) => issue.message).join('; '))
      }
      const issue = await githubService.submitIssue(payload)
      addToast('success', 'Submitted', 'Submission received! Check "My Submissions" in Profile.', 3000)
      // Refresh user submissions immediately
      loadUserSubmissions()
      return issue
    } catch (e) {
      addToast('error', 'Error', 'Failed to create issue', 3000)
      throw e
    } finally {
      isSubmissionLoading.value = false
    }
  }

  const uploadToCatbox = async (file: File) => {
    isUploadLoading.value = true
    try {
      const url = await catboxService.uploadFile(file)
      return url
    } catch (e) {
      addToast('error', 'Upload Failed', 'Failed to upload to Catbox', 3000)
      throw e
    } finally {
      isUploadLoading.value = false
    }
  }

  // --- Actions: Admin (GitHub API) ---
  const verifyModerator = async (token: string, owner: string, repo: string, opts?: { silent?: boolean }) => {
    try {
      githubService.init(token, owner, repo)

      // Always fetch user profile
      try {
        const u = await githubService.getUser()
        user.value = u
        if (!opts?.silent) {
          addToast('success', 'Logged In', `Welcome, ${u.login}`, 2000)
        }
        loadUserSubmissions()
      } catch (e) {
        console.warn('Failed to fetch user profile', e)
      }

      const hasPermission = await githubService.checkPermissions()
      if (hasPermission) {
        isModerator.value = true
        if (!opts?.silent) {
          addToast('info', 'Admin Access', 'Moderator privileges active', 2000)
        }
        loadPendingSubmissions()
      } else {
        isModerator.value = false
      }
      return true
    } catch (e) {
      console.error(e)
      addToast('error', 'Login Failed', 'Invalid Token or Network Error', 3000)
      return false
    }
  }


  const loadPendingSubmissions = async () => {
    if (!isModerator.value) return
    isModerationLoading.value = true
    try {
      const issues = await githubService.getPendingIssues()
      // Parse issues to Schema
      const list: SharedPrompt[] = []
      issues.forEach((issue: any) => {
        // Attempt to extract JSON block
        const match = issue.body?.match(/```json([\s\S]*?)```/)
        if (match && match[1]) {
          try {
            const data = sanitizePromptPayload(JSON.parse(match[1])) as SharedPrompt
            data.id = data.id || `issue_${issue.number}` // Use issue ID as backup
            data._issueNumber = issue.number // Internal usage
            data.username = data.username || issue.user?.login || 'Anonymous' // Capture submitter

            // Fix: If image is missing, try to find Markdown image attachment in body
            if (!data.image) {
              const imgMatch = issue.body.match(/!\[.*?\]\((.*?)\)/)
              if (imgMatch && imgMatch[1]) {
                data.image = imgMatch[1] // Use the uploaded asset URL
              }
            }

            // Filter out drafts from pending list
            const isDraft = issue.labels.some((l: any) => (typeof l === 'string' ? l : l.name) === 'draft')
            if (!isDraft) {
              data.status = 'pending'
              list.push(data)
            }
          } catch { console.warn('Failed to parse issue', issue.number) }
        }
      })
      pendingSubmissions.value = decoratePromptList(list)
    } catch {
      addToast('error', 'Error', 'Failed to fetch pending issues', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const loadRejectedSubmissions = async () => {
    if (!isModerator.value) return
    isModerationLoading.value = true
    try {
      const issues = await githubService.getRejectedIssues()
      const list: SharedPrompt[] = []
      issues.forEach((issue: any) => {
        const match = issue.body?.match(/```json([\s\S]*?)```/)
        if (match && match[1]) {
          try {
            const data = sanitizePromptPayload(JSON.parse(match[1])) as SharedPrompt
            data.id = data.id || `issue_${issue.number}`
            data._issueNumber = issue.number
            data.username = data.username || issue.user?.login || 'Anonymous'
            list.push(data)
          } catch { console.warn('Failed to parse issue', issue.number) }
        }
      })
      rejectedSubmissions.value = decoratePromptList(list)
    } catch (e) {
      console.error(e)
      addToast('error', 'Error', 'Failed to fetch rejected issues', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const loadDraftSubmissions = async () => {
    if (!isModerator.value) return
    isModerationLoading.value = true
    try {
      const issues = await githubService.getDraftIssues()
      const list: SharedPrompt[] = []
      issues.forEach((issue: any) => {
        const match = issue.body?.match(/```json([\s\S]*?)```/)
        if (match && match[1]) {
          try {
            const data = sanitizePromptPayload(JSON.parse(match[1])) as SharedPrompt
            data.id = data.id || `issue_${issue.number}`
            data._issueNumber = issue.number
            data.username = data.username || issue.user?.login || 'Anonymous'
            list.push(data)
          } catch { console.warn('Failed to parse issue', issue.number) }
        }
      })
      draftSubmissions.value = decoratePromptList(list)
    } catch (e) {
      console.error(e)
      addToast('error', 'Error', 'Failed to fetch draft issues', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const loadUserSubmissions = async () => {
    if (!user.value) return
    isModerationLoading.value = true
    try {
      const issues = await githubService.getUserSubmissions()
      const list: SharedPrompt[] = []
      issues.forEach((issue: any) => {
        const match = issue.body?.match(/```json([\s\S]*?)```/)
        if (match && match[1]) {
          try {
            const data = sanitizePromptPayload(JSON.parse(match[1])) as SharedPrompt
            data.id = data.id || `issue_${issue.number}`
            data._issueNumber = issue.number
            data.username = data.username || issue.user?.login

            // Determine status
            if (issue.state === 'closed') {
              // Check labels for reason
              const labels = issue.labels.map((l: any) => typeof l === 'string' ? l : l.name)
              if (labels.includes('approved')) {
                data.status = 'approved'
                list.push(data)
              }
              else if (labels.includes('rejected')) {
                data.status = 'rejected'
                list.push(data)
              }
              // else: deleted/cancelled, do not add to list
            } else {
              data.status = 'pending'
              // Check if it is a draft
              const labels = issue.labels.map((l: any) => typeof l === 'string' ? l : l.name)
              if (labels.includes('draft')) data.status = 'draft'
              list.push(data)
            }
          } catch { }
        }
      })
      userPrompts.value = decoratePromptList(list)
    } catch (e) {
      console.error(e)
      addToast('error', 'Error', 'Failed to load your submissions', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const saveAsDraft = async (id: string, data: SharedPrompt) => {
    const item = pendingSubmissions.value.find(p => p.id === id) || draftSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isModerationLoading.value = true
    try {
      const sanitized = sanitizePromptPayload(data) as SharedPrompt
      // Update issue with 'draft' label
      await githubService.updateIssue(item._issueNumber, sanitized, ['draft'])
      addToast('success', 'Saved', 'Saved as draft', 2000)

      // Remove from pending if there
      pendingSubmissions.value = pendingSubmissions.value.filter(p => p.id !== id)

      // Update/Add to drafts
      const existingIdx = draftSubmissions.value.findIndex(p => p.id === id)
      if (existingIdx !== -1) {
        draftSubmissions.value[existingIdx] = decorateModerationPrompt({ ...item, ...sanitized })
      } else {
        draftSubmissions.value.unshift(decorateModerationPrompt({ ...item, ...sanitized }))
      }

    } catch {
      addToast('error', 'Error', 'Failed to save draft', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const moveToReview = async (id: string, data?: SharedPrompt) => {
    const item = draftSubmissions.value.find(p => p.id === id) || userPrompts.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isModerationLoading.value = true
    try {
      const dataToUpdate = data ? { ...item, ...(sanitizePromptPayload(data) as SharedPrompt) } : item
      await githubService.updateIssue(item._issueNumber, dataToUpdate, ['submission'])
      addToast('success', 'Moved', 'Moved to Pending Review', 2000)

      // Update local state
      draftSubmissions.value = draftSubmissions.value.filter(p => p.id !== id)

      // If it was in userPrompts, update it there too
      const userIdx = userPrompts.value.findIndex(p => p.id === id)
      if (userIdx !== -1) {
        userPrompts.value[userIdx] = decorateModerationPrompt({ ...dataToUpdate, status: 'pending' })
      } else {
        // Only add to pending if we are admin (implied by it being in draftSubmissions but not userPrompts?
        // actually pendingSubmissions is admin view. userPrompts is user view.)
        // If I am admin, I want to see it in pending.
        if (isModerator.value) {
          pendingSubmissions.value.unshift(decorateModerationPrompt({ ...dataToUpdate, status: 'pending' }))
        }
      }
    } catch {
      addToast('error', 'Error', 'Failed to move to review', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const updatePendingSubmission = async (id: string, data: SharedPrompt) => {
    const item = pendingSubmissions.value.find(p => p.id === id) || userPrompts.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isModerationLoading.value = true
    try {
      const sanitized = sanitizePromptPayload(data) as SharedPrompt
      await githubService.updateIssue(item._issueNumber, sanitized)
      // Update local state in both lists
      const pendingIdx = pendingSubmissions.value.findIndex(p => p.id === id)
      if (pendingIdx !== -1) {
        pendingSubmissions.value[pendingIdx] = decorateModerationPrompt({ ...pendingSubmissions.value[pendingIdx], ...sanitized })
      }
      const userIdx = userPrompts.value.findIndex(p => p.id === id)
      if (userIdx !== -1) {
        userPrompts.value[userIdx] = decorateModerationPrompt({ ...userPrompts.value[userIdx], ...sanitized })
      }
      addToast('success', 'Updated', 'Issue updated successfully', 2000)
    } catch {
      addToast('error', 'Error', 'Failed to update issue', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const approveSubmission = async (id: string, overrideData?: SharedPrompt) => {
    const item = pendingSubmissions.value.find(p => p.id === id) || draftSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isModerationLoading.value = true
    try {
      // Use overrideData if provided (e.g. edited before approval)
      const dataToCommit = overrideData
        ? { ...item, ...(sanitizePromptPayload(overrideData) as SharedPrompt) }
        : item
      const validation = validatePromptPayload(dataToCommit)
      const hardErrors = validation.issues.filter((issue) => issue.severity === 'error')
      if (hardErrors.length) {
        addToast('error', '无法发布', hardErrors[0]?.message || '请先修复校验问题', 2400)
        return
      }
      const { _issueNumber, ...cleanItem } = dataToCommit

      if (!_issueNumber) throw new Error('Missing Issue ID')

      await githubService.approveSubmission(_issueNumber, cleanItem)
      addToast('success', 'Approved', 'Prompt committed and issue closed', 2000)

      // Refresh
      pendingSubmissions.value = pendingSubmissions.value.filter(p => p.id !== id)
      draftSubmissions.value = draftSubmissions.value.filter(p => p.id !== id)
      // Optimistically add to published
      sharedPrompts.value.unshift({ ...cleanItem, status: 'published' } as SharedPrompt)
    } catch (e) {
      console.error(e)
      addToast('error', 'Failed', 'Could not commit changes', 3000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const rejectSubmission = async (id: string, reason: string) => {
    const item = pendingSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isModerationLoading.value = true
    try {
      await githubService.rejectSubmission(item._issueNumber, reason)
      addToast('info', 'Rejected', 'Issue closed', 2000)
      pendingSubmissions.value = pendingSubmissions.value.filter(p => p.id !== id)
    } catch {
      addToast('error', 'Error', 'Failed to reject issue', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  const deleteUserSubmission = async (id: string) => {
    const item = userPrompts.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isModerationLoading.value = true
    try {
      await githubService.deleteIssue(item._issueNumber)

      // Update local state
      userPrompts.value = userPrompts.value.filter(p => p.id !== id)
      pendingSubmissions.value = pendingSubmissions.value.filter(p => p.id !== id)

      addToast('success', 'Deleted', 'Submission removed successfully', 2000)
    } catch (e) {
      console.error(e)
      addToast('error', 'Error', 'Failed to delete submission', 2000)
    } finally {
      isModerationLoading.value = false
    }
  }

  // --- Actions: CRUD ---
  const uploadImage = async (file: File) => {
    isUploadLoading.value = true
    try {
      const url = await githubService.uploadImage(file)
      return url
    } catch {
      addToast('error', 'Upload Failed', 'Failed to upload image', 3000)
      return null
    } finally {
      isUploadLoading.value = false
    }
  }

  const deletePublishedPrompt = async (id: string) => {
    isPublishedPromptLoading.value = true
    try {
      const item = sharedPrompts.value.find(p => p.id === id)
      await githubService.deletePrompt(id, item?._chunkPath)
      sharedPrompts.value = sharedPrompts.value.filter(p => p.id !== id)
      if (featuredMeta.value?.manualIds.includes(id)) {
        featuredMeta.value = {
          ...featuredMeta.value,
          manualIds: featuredMeta.value.manualIds.filter((featuredId) => featuredId !== id),
          items: featuredMeta.value.items.filter((entry) => entry.id !== id),
          updatedAt: Date.now(),
        }
        syncFeaturedItemsFromMeta(featuredMeta.value)
      }
      addToast('success', 'Deleted', 'Prompt removed from repo', 2000)
    } catch {
      addToast('error', 'Error', 'Failed to delete prompt', 2000)
    } finally {
      isPublishedPromptLoading.value = false
    }
  }

  const updatePublishedPrompt = async (prompt: SharedPrompt) => {
    isPublishedPromptLoading.value = true
    try {
      await githubService.updatePrompt(prompt)
      // Optimistic update
      const idx = sharedPrompts.value.findIndex(p => p.id === prompt.id)
      if (idx !== -1) sharedPrompts.value[idx] = prompt
      if (featuredMeta.value) {
        syncFeaturedItemsFromMeta(featuredMeta.value)
      }
      addToast('success', 'Updated', 'Prompt updated successfully', 2000)
    } catch {
      addToast('error', 'Error', 'Failed to update prompt', 2000)
    } finally {
      isPublishedPromptLoading.value = false
    }
  }

  const toggleFeaturedPrompt = async (promptId: string) => {
    const target = sharedPrompts.value.find((item) => item.id === promptId)
    if (!target) return false

    isPublishedPromptLoading.value = true
    try {
      const currentManualIds = featuredMeta.value?.manualIds || []
      const nextManualIds = currentManualIds.includes(promptId)
        ? currentManualIds.filter((id) => id !== promptId)
        : [promptId, ...currentManualIds.filter((id) => id !== promptId)].slice(0, 8)

      const nextMeta: FeaturedPromptsMeta = {
        manualIds: nextManualIds,
        items: nextManualIds
          .map((id) => sharedPrompts.value.find((item) => item.id === id))
          .filter((item): item is SharedPrompt => !!item)
          .map((item) => sanitizePromptPayload(item) as SharedPrompt),
        updatedAt: Date.now(),
      }

      await githubService.updateFeaturedPrompts(nextMeta)
      featuredMeta.value = nextMeta
      syncFeaturedItemsFromMeta(nextMeta)
      addToast(
        'success',
        nextManualIds.includes(promptId) ? '已加入精选' : '已取消精选',
        target.title || promptId,
        1800,
      )
      return true
    } catch (e) {
      console.error(e)
      addToast('error', '精选更新失败', '请稍后重试', 2200)
      return false
    } finally {
      isPublishedPromptLoading.value = false
    }
  }

  // --- Actions: Local Drafts ---
  const loadLocalDrafts = () => {
    const saved = localStorage.getItem(LOCAL_DRAFTS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        localDrafts.value = Array.isArray(parsed) ? parsed : []
      } catch (e) {
        console.error('Failed to parse local drafts', e)
        localDrafts.value = []
      }
    }

    if (!localDrafts.value.length) return

    let didMigrate = false
    localDrafts.value = localDrafts.value.map((draft) => {
      if (draft._profileId) return draft

      didMigrate = true
      return {
        ...draft,
        _profileId: activeOfflineProfileId.value,
        _draftLabel: activeOfflineProfile.value?.name || DEFAULT_OFFLINE_PROFILE_NAME,
      }
    })

    if (didMigrate) {
      localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(localDrafts.value))
    }
  }

  const saveLocalDraft = (draft: Partial<SharedPrompt>, isAuto = false) => {
    // Generate ID if missing
    const id = draft.id || `draft_${Date.now()}`
    const timestamp = Date.now()
    const currentProfileId = draft._profileId || activeOfflineProfileId.value
    const currentDraftLabel = activeOfflineProfile.value?.name || DEFAULT_OFFLINE_PROFILE_NAME

    const newDraft: SharedPrompt = {
      ...draft,
      id,
      status: 'draft',
      _profileId: currentProfileId,
      _draftLabel: currentDraftLabel,
      // Store timestamp for sorting/display
      _updatedAt: timestamp
    } as SharedPrompt

    const index = localDrafts.value.findIndex(d => d.id === id)
    if (index >= 0) {
      localDrafts.value[index] = newDraft
    } else {
      localDrafts.value.unshift(newDraft)
    }

    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(localDrafts.value))

    if (!isAuto) {
      addToast('success', 'Saved', 'Draft saved to box', 1500)
    }
    return id
  }

  const deleteLocalDraft = (id: string) => {
    localDrafts.value = localDrafts.value.filter(d => d.id !== id)
    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(localDrafts.value))
    addToast('info', 'Deleted', 'Draft removed', 1000)
  }

  const duplicateLocalDraft = (id: string) => {
    const existing = localDrafts.value.find((draft) => draft.id === id)
    if (!existing) return null

    const { id: _id, _updatedAt, ...rest } = existing
    const nextId = saveLocalDraft(
      {
        ...rest,
        title: existing.title ? `${existing.title}（副本）` : '未命名草稿（副本）',
      },
      true,
    )

    addToast('success', '已复制草稿', '你可以在草稿箱里继续编辑副本', 1600)
    return nextId
  }

  // --- Local User Data ---
  try {
    const raw = localStorage.getItem(USER_PROMPTS_KEY)
    if (raw) userPrompts.value = JSON.parse(raw)
  } catch { }

  // Load local identity and user data on init
  loadFavorites()
  loadLocalDrafts()

  const searchArtists = (query: string): Artist[] => {
    const raw = query.trim().toLowerCase()
    if (!raw) return []
    const tokens = raw.split(/\s+/).filter(t => t.length > 0)

    return artists.value.filter(a => {
      const name = a.name.toLowerCase()
      const aliases = (a.other_names || []).map(n => n.toLowerCase())
      // Check if ALL tokens are present in either name OR any alias
      return tokens.every(token =>
        name.includes(token) || aliases.some(alias => alias.includes(token))
      )
    })
  }

  return {
    isLoading,
    isAuthLoading,
    isArtistsLoading,
    isPromptsLoading,
    isSubmissionLoading,
    isUploadLoading,
    isModerationLoading,
    isPublishedPromptLoading,
    artistsLoadedAt,
    repoOwner,
    repoName,
    artists,
    toasts,
    offlineProfiles,
    activeOfflineProfileId,
    activeOfflineProfile,
    localCollections,
    activeLocalCollections,
    activeLocalDrafts,
    activeDraftCount,
    defaultCollection,
    featuredPrompts,
    featuredMeta,
    promptTagStats,
    favorites,
    artistFavorites,
    localDrafts,
    sharedPrompts,
    userPrompts,
    pendingSubmissions,
    draftSubmissions,
    rejectedSubmissions,
    isModerator,
    user,
    loadArtists,
    loadSharedPrompts,
    loadPromptMetadata,
    getSubmissionLink,
    submitIssue,
    uploadToCatbox,
    saveLocalDraft,
    duplicateLocalDraft,
    verifyModerator,
    loadLocalDrafts,
    deleteLocalDraft,
    loadPendingSubmissions,
    loadDraftSubmissions,
    loadRejectedSubmissions,
    loadUserSubmissions,
    deleteUserSubmission,
    loadFavorites,
    loadArtistFavorites,
    setActiveOfflineProfile,
    createOfflineProfile,
    renameOfflineProfile,
    deleteOfflineProfile,
    exportOfflineData,
    importOfflineData,
    createLocalCollection,
    renameLocalCollection,
    deleteLocalCollection,
    addPromptToCollection,
    removePromptFromCollection,
    getPromptCollections,
    toggleFavorite,
    addArtistToCollection,
    removeArtistFromCollection,
    toggleArtistFavorite,
    isFavorite,
    isArtistFavorite,
    updatePendingSubmission,
    saveAsDraft,
    moveToReview,
    approveSubmission,
    rejectSubmission,
    uploadImage,
    deletePublishedPrompt,
    updatePublishedPrompt,
    toggleFeaturedPrompt,
    addToast,
    removeToast,
    searchArtists,
    isFeaturedPrompt,
    initAuth,
    loginWithGitHub,
    logout,
    handleAuthCallback
  }
})
