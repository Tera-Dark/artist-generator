import { createRouter, createWebHistory } from 'vue-router'
// 统一路由懒加载
const Home = () => import('../views/Home.vue')
const ConceptBlueprint = () => import('../views/ConceptBlueprint.vue')
const Library = () => import('../views/Library.vue')
const SharedPrompts = () => import('../views/SharedPrompts.vue')
const Moderation = () => import('../views/Moderation.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/library',
      name: 'library',
      component: Library
    },
    {
      path: '/concept',
      name: 'concept',
      component: ConceptBlueprint
    },
    {
      path: '/prompts',
      name: 'prompts',
      component: SharedPrompts
    },
    {
      path: '/moderation',
      name: 'moderation',
      component: () => import('../views/Moderation.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue')
    }
  ]
})

export default router
