import { createRouter, createWebHistory } from 'vue-router'
// 统一路由懒加载
const Home = () => import('../views/Home.vue')
const ConceptBlueprint = () => import('../views/ConceptBlueprint.vue')
const Library = () => import('../views/Library.vue')

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
  }
]
})

export default router
