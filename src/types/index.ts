// 画师对象类型
export interface Artist {
  name: string // 主名称
  other_names: string[] // 别名数组
  post_count: number // 作品数量
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
}
