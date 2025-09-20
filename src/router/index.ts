import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 当前项目为单页应用，暂时不需要路由
    // 如需添加新页面，可在此处配置路由
  ],
})

export default router
