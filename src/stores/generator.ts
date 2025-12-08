import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Artist, ToastMessage, SharedPrompt } from '@/types'
import { githubService } from '@/services/github'
import { authService } from '@/services/auth'

export const useGeneratorStore = defineStore('generator', () => {
  // --- States ---
  const isLoading = ref(false)
  const artistsLoadedAt = ref<number | null>(null)
  const artists = ref<Artist[]>([])
  const toasts = ref<ToastMessage[]>([])

  const sharedPrompts = ref<SharedPrompt[]>([])
  const userPrompts = ref<SharedPrompt[]>([])
  const pendingSubmissions = ref<SharedPrompt[]>([])
  const draftSubmissions = ref<SharedPrompt[]>([])
  const rejectedSubmissions = ref<SharedPrompt[]>([])
  const isModerator = ref(false)
  const user = ref<any>(null)

  // Favorites (Persisted locally)
  const favorites = ref<SharedPrompt[]>([])
  const FAVORITES_KEY = 'ag_favorites_v1'

  // Config
  const ARTISTS_TTL_MS = 15 * 60 * 1000
  const PROMPTS_TTL_MS = 5 * 60 * 1000
  const USER_PROMPTS_KEY = 'ag_user_prompts_v1'
  const repoOwner = import.meta.env.VITE_REPO_OWNER || ''
  const repoName = import.meta.env.VITE_REPO_NAME || ''

  // --- Helpers ---
  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString().slice(2)
    toasts.value.push({ id, type, title, message, duration })
    if (duration > 0) setTimeout(() => removeToast(id), duration)
  }

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  // --- Auth: GitHub OAuth ---
  const initAuth = async () => {
    // Check if we have a token saved
    const token = authService.getToken()
    if (token) {
       const owner = import.meta.env.VITE_REPO_OWNER || ''
       const repo = import.meta.env.VITE_REPO_NAME || ''
       await verifyModerator(token, owner, repo)
    }
  }

  const handleAuthCallback = async (code: string) => {
    isLoading.value = true
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
    } catch (e) {
      addToast('error', 'Auth Error', 'Authentication process failed')
    } finally {
      isLoading.value = false
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

  // --- Actions: Favorites ---
  const loadFavorites = () => {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (saved) {
      try {
        favorites.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse favorites', e)
        favorites.value = []
      }
    }
  }

  const toggleFavorite = (item: SharedPrompt) => {
    const index = favorites.value.findIndex(f => f.id === item.id)
    if (index >= 0) {
      favorites.value.splice(index, 1)
      addToast('info', 'Removed', 'Removed from favorites', 1000)
    } else {
      favorites.value.push(item)
      addToast('success', 'Saved', 'Added to favorites', 1000)
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
  }

  const isFavorite = (id: string) => {
    return favorites.value.some(f => f.id === id)
  }

  // --- Actions: User Submissions ---
  const loadUserSubmissions = async () => {
    if (!authService.getToken()) return
    isLoading.value = true
    try {
      // 1. Get Issues from GitHub
      const issues = await githubService.getUserSubmissions()

      // 2. Map to SharedPrompt
      userPrompts.value = issues.map((i: any) => {
          let content: any = {}
          try {
              // Try to parse body as JSON block
              const jsonMatch = i.body?.match(/```json\n([\s\S]*?)\n```/)
              if (jsonMatch) {
                  content = JSON.parse(jsonMatch[1])
              } else {
                  // Fallback
                  content = { title: i.title, description: i.body }
              }
          } catch (e) {
              content = { title: i.title, description: i.body }
          }

          return {
              ...content,
              id: content.id || i.id.toString(), // Use content ID if avail, else Issue ID
              _issueNumber: i.number,
              status: i.state === 'closed' ? (i.labels.find((l:any) => l.name === 'approved') ? 'published' : 'rejected') : 'pending', // Rough status mapping
              // Enhance with label info if possible
              username: i.user.login
          }
      })
    } catch (e) {
      console.error(e)
      addToast('error', 'Error', 'Failed to load your submissions')
    } finally {
      isLoading.value = false
    }
  }

  // --- Actions: Artists ---
  let pendingArtistLoad: Promise<void> | null = null
  const loadArtists = async (opts?: { force?: boolean }) => {
    if (!opts?.force && artists.value.length && artistsLoadedAt.value && (Date.now() - artistsLoadedAt.value < ARTISTS_TTL_MS)) return
    if (pendingArtistLoad) return pendingArtistLoad

    pendingArtistLoad = (async () => {
      isLoading.value = true
      try {
        const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/'
        const res = await fetch(`${base}data/artists.json`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        artists.value = Array.isArray(data) ? data : (data.artists || [])
        artistsLoadedAt.value = Date.now()
        addToast('success', 'Ready', `Loaded ${artists.value.length} artists`, 1500)
      } catch (e) {
        console.error(e)
        artists.value = [{ name: 'Error Loading', other_names: [], post_count: 0 }]
        addToast('error', 'Error', 'Failed to load artists library', 3000)
      } finally {
        isLoading.value = false
        pendingArtistLoad = null
      }
    })()
    await pendingArtistLoad
  }

  // --- Actions: Prompts (Read Public) ---
  const loadSharedPrompts = async (opts?: { force?: boolean }) => {
    if (!opts?.force && sharedPrompts.value.length) return // Simple cache

    isLoading.value = true
    try {
      const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/'
      const res = await fetch(`${base}data/prompts.json?t=${Date.now()}`) // Cache bust
      if (res.ok) {
        sharedPrompts.value = await res.json()
      } else {
        // Fallback or empty if file doesn't exist yet
        sharedPrompts.value = []
      }
    } catch (e) {
      console.warn('Failed to load prompts.json', e)
    } finally {
      isLoading.value = false
    }
  }

  // --- Actions: Submit (Public) ---
  const getSubmissionLink = (item: SharedPrompt) => {
    return githubService.getSubmissionLink(item)
  }

  // --- Actions: Admin (GitHub API) ---
  const verifyModerator = async (token: string, owner: string, repo: string) => {
    try {
      githubService.init(token, owner, repo)

      // Always fetch user profile
      try {
        const u = await githubService.getUser()
        user.value = u
        addToast('success', 'Logged In', `Welcome, ${u.login}`, 2000)
      } catch (e) {
        console.warn('Failed to fetch user profile', e)
      }

      const hasPermission = await githubService.checkPermissions()
      if (hasPermission) {
        isModerator.value = true
        addToast('info', 'Admin Access', 'Moderator privileges active', 2000)
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
    isLoading.value = true
    try {
      const issues = await githubService.getPendingIssues()
      // Parse issues to Schema
      const list: SharedPrompt[] = []
      issues.forEach((issue: any) => {
        // Attempt to extract JSON block
        const match = issue.body?.match(/```json([\s\S]*?)```/)
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1])
            data.id = data.id || `issue_${issue.number}` // Use issue ID as backup
            data._issueNumber = issue.number // Internal usage
            data.username = issue.user?.login || 'Anonymous' // Capture submitter

            // Fix: If image is missing, try to find Markdown image attachment in body
            if (!data.image) {
              const imgMatch = issue.body.match(/!\[.*?\]\((.*?)\)/)
              if (imgMatch && imgMatch[1]) {
                data.image = imgMatch[1] // Use the uploaded asset URL
              }
            }
            list.push(data)
          } catch (e) { console.warn('Failed to parse issue', issue.number) }
        }
      })
      pendingSubmissions.value = list
    } catch (e) {
      addToast('error', 'Error', 'Failed to fetch pending issues', 2000)
    } finally {
      isLoading.value = false
    }
  }

  const loadRejectedSubmissions = async () => {
    if (!isModerator.value) return
    isLoading.value = true
    try {
      const issues = await githubService.getRejectedIssues()
      const list: SharedPrompt[] = []
      issues.forEach((issue: any) => {
        const match = issue.body?.match(/```json([\s\S]*?)```/)
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1])
            data.id = data.id || `issue_${issue.number}`
            data._issueNumber = issue.number
            data.username = issue.user?.login || 'Anonymous'
            list.push(data)
          } catch (e) { console.warn('Failed to parse issue', issue.number) }
        }
      })
      rejectedSubmissions.value = list
    } catch (e) {
      console.error(e)
      addToast('error', 'Error', 'Failed to fetch rejected issues', 2000)
    } finally {
      isLoading.value = false
    }
  }

  const loadDraftSubmissions = async () => {
    if (!isModerator.value) return
    isLoading.value = true
    try {
      const issues = await githubService.getDraftIssues()
      const list: SharedPrompt[] = []
      issues.forEach((issue: any) => {
        const match = issue.body?.match(/```json([\s\S]*?)```/)
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1])
            data.id = data.id || `issue_${issue.number}`
            data._issueNumber = issue.number
            data.username = issue.user?.login || 'Anonymous'
            list.push(data)
          } catch (e) { console.warn('Failed to parse issue', issue.number) }
        }
      })
      draftSubmissions.value = list
    } catch (e) {
      console.error(e)
      addToast('error', 'Error', 'Failed to fetch draft issues', 2000)
    } finally {
      isLoading.value = false
    }
  }

  const saveAsDraft = async (id: string, data: SharedPrompt) => {
    const item = pendingSubmissions.value.find(p => p.id === id) || draftSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isLoading.value = true
    try {
        // Update issue with 'draft' label
        await githubService.updateIssue(item._issueNumber, data, ['draft'])
        addToast('success', 'Saved', 'Saved as draft', 2000)

        // Remove from pending if there
        pendingSubmissions.value = pendingSubmissions.value.filter(p => p.id !== id)

        // Update/Add to drafts
        const existingIdx = draftSubmissions.value.findIndex(p => p.id === id)
        if (existingIdx !== -1) {
             draftSubmissions.value[existingIdx] = { ...item, ...data }
        } else {
             draftSubmissions.value.unshift({ ...item, ...data })
        }

    } catch (e) {
        addToast('error', 'Error', 'Failed to save draft', 2000)
    } finally {
        isLoading.value = false
    }
  }

  const moveToReview = async (id: string, data?: SharedPrompt) => {
    const item = draftSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isLoading.value = true
    try {
        const dataToUpdate = data ? { ...item, ...data } : item
        await githubService.updateIssue(item._issueNumber, dataToUpdate, ['submission'])
        addToast('success', 'Moved', 'Moved to Pending Review', 2000)

        draftSubmissions.value = draftSubmissions.value.filter(p => p.id !== id)
        pendingSubmissions.value.unshift(dataToUpdate)
    } catch (e) {
        addToast('error', 'Error', 'Failed to move to review', 2000)
    } finally {
        isLoading.value = false
    }
  }

  const updatePendingSubmission = async (id: string, data: SharedPrompt) => {
    const item = pendingSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isLoading.value = true
    try {
        await githubService.updateIssue(item._issueNumber, data)
        const idx = pendingSubmissions.value.findIndex(p => p.id === id)
        if (idx !== -1) {
            pendingSubmissions.value[idx] = { ...pendingSubmissions.value[idx], ...data }
        }
        addToast('success', 'Updated', 'Issue updated successfully', 2000)
    } catch (e) {
        addToast('error', 'Error', 'Failed to update issue', 2000)
    } finally {
        isLoading.value = false
    }
  }

  const approveSubmission = async (id: string, overrideData?: SharedPrompt) => {
    const item = pendingSubmissions.value.find(p => p.id === id) || draftSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isLoading.value = true
    try {
      // Use overrideData if provided (e.g. edited before approval)
      const dataToCommit = overrideData ? { ...item, ...overrideData } : item
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
      isLoading.value = false
    }
  }

  const rejectSubmission = async (id: string, reason: string) => {
    const item = pendingSubmissions.value.find(p => p.id === id)
    if (!item || !item._issueNumber) return

    isLoading.value = true
    try {
      await githubService.rejectSubmission(item._issueNumber, reason)
      addToast('info', 'Rejected', 'Issue closed', 2000)
      pendingSubmissions.value = pendingSubmissions.value.filter(p => p.id !== id)
    } catch (e) {
      addToast('error', 'Error', 'Failed to reject issue', 2000)
    } finally {
      isLoading.value = false
    }
  }

  // --- Actions: CRUD ---
  const uploadImage = async (file: File) => {
    isLoading.value = true
    try {
      const url = await githubService.uploadImage(file)
      return url
    } catch (e) {
      addToast('error', 'Upload Failed', 'Failed to upload image', 3000)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const deletePublishedPrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt globally?')) return
    isLoading.value = true
    try {
      await githubService.deletePrompt(id)
      sharedPrompts.value = sharedPrompts.value.filter(p => p.id !== id)
      addToast('success', 'Deleted', 'Prompt removed from repo', 2000)
    } catch (e) {
      addToast('error', 'Error', 'Failed to delete prompt', 2000)
    } finally {
      isLoading.value = false
    }
  }

  const updatePublishedPrompt = async (prompt: SharedPrompt) => {
    isLoading.value = true
    try {
      await githubService.updatePrompt(prompt)
      // Optimistic update
      const idx = sharedPrompts.value.findIndex(p => p.id === prompt.id)
      if (idx !== -1) sharedPrompts.value[idx] = prompt
      addToast('success', 'Updated', 'Prompt updated successfully', 2000)
    } catch (e) {
      addToast('error', 'Error', 'Failed to update prompt', 2000)
    } finally {
      isLoading.value = false
    }
  }

  // --- Local User Data ---
  try {
    const raw = localStorage.getItem(USER_PROMPTS_KEY)
    if (raw) userPrompts.value = JSON.parse(raw)
  } catch { }

  const saveLocalDraft = (p: SharedPrompt) => {
    userPrompts.value.unshift(p)
    localStorage.setItem(USER_PROMPTS_KEY, JSON.stringify(userPrompts.value))
    addToast('success', 'Saved', 'Draft saved locally', 1500)
  }

  const searchArtists = (query: string): Artist[] => {
    const q = query.toLowerCase()
    return artists.value.filter(a => a.name.toLowerCase().includes(q))
  }

  // Initialize Auth
  initAuth()

  return {
    isLoading,
    artistsLoadedAt,
    repoOwner,
    repoName,
    artists,
    toasts,
    favorites,
    sharedPrompts,
    userPrompts,
    pendingSubmissions,
    draftSubmissions,
    rejectedSubmissions,
    isModerator,
    user,
    loadArtists,
    loadSharedPrompts,
    getSubmissionLink,
    saveLocalDraft,
    verifyModerator,
    loadPendingSubmissions,
    loadDraftSubmissions,
    loadRejectedSubmissions,
    loadUserSubmissions,
    loadFavorites,
    toggleFavorite,
    isFavorite,
    updatePendingSubmission,
    saveAsDraft,
    moveToReview,
    approveSubmission,
    rejectSubmission,
    uploadImage,
    deletePublishedPrompt,
    updatePublishedPrompt,
    addToast,
    removeToast,
    searchArtists,
    loginWithGitHub,
    logout,
    handleAuthCallback
  }
})

