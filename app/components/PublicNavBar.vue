<script setup lang="ts">
import { Github, Sun, Moon } from 'lucide-vue-next'

defineProps<{
  activePage?: 'features' | 'jobs' | 'roadmap' | 'blog' | 'docs'
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { data: session } = await authClient.useSession(useFetch)
const { isDark, toggle: toggleColorMode } = useColorMode()
</script>

<template>
  <nav class="fixed inset-x-0 top-0 z-50 border-b border-surface-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
      <!-- Logo â€” links to marketing site (WWMate.com) -->
      <a
        :href="useRuntimeConfig().public.marketingUrl"
        class="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-surface-900 dark:text-white"
      >
        <img
          src="/eagle-mascot-logo-128.png"
          alt="WWMate mascot"
          width="28"
          height="28"
          loading="eager"
          decoding="sync"
          class="h-7 w-7 object-contain"
        />
        WWMate
      </a>

      <!-- Center nav links (desktop) -->
      <div class="hidden items-center gap-1 md:flex">
        <NuxtLink
          :to="localePath('/jobs')"
          class="rounded-md px-3 py-1.5 text-[13px] font-medium transition"
          :class="activePage === 'jobs' ? 'text-surface-900 dark:text-white' : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'"
        >
          {{ t('home.nav.openPositions') }}
        </NuxtLink>
        <a
          href="https://github.com/WWMate-inc/WWMate"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-surface-500 dark:text-surface-400 transition hover:text-surface-900 dark:hover:text-white"
        >
          <Github class="h-3.5 w-3.5" />
          {{ t('home.nav.github') }}
        </a>
      </div>

      <!-- Right: session actions + language switcher -->
      <div class="flex items-center gap-2">
        <ClientOnly>
          <button
            class="inline-flex items-center justify-center size-8 rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition-all duration-200 cursor-pointer border-0 bg-transparent"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleColorMode"
          >
            <Sun v-if="isDark" class="size-4" />
            <Moon v-else class="size-4" />
          </button>
          <template #fallback>
            <div class="size-8" aria-hidden="true" />
          </template>
        </ClientOnly>
        <LanguageSwitcher />
        <template v-if="session?.user">
          <NuxtLink
            :to="localePath('/dashboard')"
            class="rounded-md bg-surface-900 dark:bg-white px-3.5 py-1.5 text-[13px] font-semibold text-white dark:text-[#09090b] transition hover:bg-surface-800 dark:hover:bg-white/90"
          >
            {{ t('home.nav.dashboard') }}
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink
            :to="localePath('/auth/sign-in')"
            class="hidden rounded-md px-3 py-1.5 text-[13px] font-medium text-surface-500 dark:text-surface-400 transition hover:text-surface-900 dark:hover:text-white sm:inline-flex"
          >
            {{ t('home.nav.logIn') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/auth/sign-up')"
            class="rounded-md bg-surface-900 dark:bg-white px-3.5 py-1.5 text-[13px] font-semibold text-white dark:text-[#09090b] transition hover:bg-surface-800 dark:hover:bg-white/90"
          >
            {{ t('home.nav.signUp') }}
          </NuxtLink>
        </template>
      </div>
    </div>
  </nav>
</template>

