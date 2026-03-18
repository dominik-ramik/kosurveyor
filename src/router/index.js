import { createRouter, createWebHistory } from 'vue-router'
import GenerateForm from '../views/GenerateForm.vue'
import PostprocessData from '../views/PostprocessData.vue'

const routes = [
  { path: '/generate',    name: 'generate',    component: GenerateForm },
  { path: '/postprocess', name: 'postprocess', component: PostprocessData },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
