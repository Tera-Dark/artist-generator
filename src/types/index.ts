// 画师对象类型
export interface Artist {
  name: string           // 主名称
  other_names: string[]  // 别名数组
  post_count: number     // 作品数量
}

// Toast通知类型
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}