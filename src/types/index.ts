// 画师对象类型
export interface Artist {
  name: string // 主名称
  other_names: string[] // 别名数组
  post_count: number // 作品数量
  danbooru_url?: string // Danbooru 画师主页 URL（由 enrich_artists.py 生成）
}

// Toast通知类型
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

export interface SharedPrompt {
  id: string
  title?: string // 标题（对应 Prompt-Hub 的 Title）
  prompt: string
  model: string
  tags: string[]
  description: string // 简介/备注
  image?: string // 图片URL
  username?: string // 作者
  author?: string // 兼容字段，等同于 username
  status?: 'draft' | 'pending' | 'published' | 'approved' | 'rejected' | 'archived' // 扩展状态
  created_at?: number
  updated_at?: number
  reviewed_by?: string
  review_reason?: string
  upvotes?: number
  downvotes?: number
  views?: number // 浏览量
  _issueNumber?: number // Internal for GitHub Issues
  _chunkPath?: string // Internal for Chunked Storage
  _updatedAt?: number // Internal for Local Drafts
  _profileId?: string // Internal for Offline Profiles
  _draftLabel?: string // Internal for Draft Ownership Label
  _validation?: PromptValidationSummary // Internal for Moderation UI
  _duplicateMatches?: DuplicatePromptMatch[] // Internal for Moderation UI
}

export interface PromptValidationIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
}

export interface DuplicatePromptMatch {
  id: string
  title: string
  score: number
  source: 'published' | 'submission'
}

export interface PromptValidationSummary {
  issues: PromptValidationIssue[]
  fingerprint: string
  normalizedTitle: string
}

export interface PromptTagStat {
  tag: string
  count: number
}

export interface FeaturedPromptsMeta {
  manualIds: string[]
  items: SharedPrompt[]
  updatedAt: number
}

export interface OfflineProfile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface OfflineArtistSnapshot {
  name: string
  other_names?: string[]
  post_count?: number
  danbooru_url?: string
}

export interface OfflineCollectionPromptItem {
  promptId: string
  addedAt: number
  snapshot: SharedPrompt
}

export interface OfflineCollectionArtistItem {
  artistName: string
  addedAt: number
  snapshot: OfflineArtistSnapshot
}

export interface OfflineCollection {
  id: string
  profileId: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  isDefault?: boolean
  prompts: OfflineCollectionPromptItem[]
  artists: OfflineCollectionArtistItem[]
}

export interface ChunkIndex {
  chunks: string[]
  total: number
  lastUpdated: number
}

export interface GithubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  name?: string | null
}
