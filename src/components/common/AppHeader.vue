<template>
  <header class="app-nav">
    <div class="nav-container container-responsive h-24">
      <RouterLink to="/" class="nav-brand group">
        <div class="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl shadow-soft dark:shadow-none flex items-center justify-center transition-transform group-hover:scale-105">
          <Palette class="w-5 h-5 text-white" stroke-width="2.5" />
        </div>
        <span class="text-xl font-black tracking-tight ml-3">{{ title }}</span>
        <span v-if="sectionLabel" class="ml-3 px-2.5 py-1 text-[10px] font-bold bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg uppercase tracking-wider">{{ sectionLabel }}</span>
      </RouterLink>
      <nav class="nav-links gap-6 text-base">
        <RouterLink class="nav-link" active-class="nav-link-active" to="/">{{ t('nav.home') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/library">{{ t('nav.artists') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/concept">{{ t('nav.workspace') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/prompts">{{ t('nav.share') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/moderation">
            {{ store.user ? (store.user.login || 'User') : t('nav.login') }}
        </RouterLink>
        <RouterLink class="nav-link icon-only" active-class="nav-link-active" to="/settings" :title="t('nav.settings')">
            <Settings class="w-5 h-5" />
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Palette, Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useGeneratorStore } from '@/stores/generator'

const props = defineProps<{ title?: string; sectionLabel?: string }>()
const title = props.title ?? 'Artist Generator'
const { t } = useI18n()
const router = useRouter()
const store = useGeneratorStore()

const handleRestrictedLink = (path: string) => {
  if (path === '/moderation' && !store.user) {
    // Optional: show a toast here if desired, but navigation to /moderation is allowed for login
  }
  router.push(path)
}
</script>

<style scoped>
.app-nav {
    @apply sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 mb-8 dark:bg-neutral-950/80 dark:border-neutral-800/50 transition-colors duration-300;
}
.nav-container {
    @apply flex items-center justify-between;
}
.nav-brand {
    @apply flex items-center cursor-pointer select-none transition-opacity;
}
.nav-links {
    @apply hidden md:flex items-center gap-1;
}
.nav-link {
    @apply px-4 py-2 rounded-xl font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/50 dark:hover:text-white dark:hover:bg-neutral-800/50 transition-all;
}
.nav-link-active {
    @apply text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20 font-semibold;
}
.icon-only {
    @apply ml-2 p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-white;
}
</style>
