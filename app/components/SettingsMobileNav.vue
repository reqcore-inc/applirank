<script setup lang="ts">
import {
  Building2, Users, UserCircle, ChevronLeft, Plug, Brain, ShieldCheck,
} from 'lucide-vue-next'

const route = useRoute()
const localePath = useLocalePath()

const settingsNav = [
  {
    label: 'General',
    to: '/dashboard/settings',
    icon: Building2,
    exact: true,
  },
  {
    label: 'Members',
    to: '/dashboard/settings/members',
    icon: Users,
    exact: true,
  },
  {
    label: 'Integrations',
    to: '/dashboard/settings/integrations',
    icon: Plug,
    exact: true,
  },
  {
    label: 'AI',
    to: '/dashboard/settings/ai',
    icon: Brain,
    exact: true,
  },
  {
    label: 'SSO',
    to: '/dashboard/settings/sso',
    icon: ShieldCheck,
    exact: true,
  },
  {
    label: 'Account',
    to: '/dashboard/settings/account',
    icon: UserCircle,
    exact: true,
  },
]

function isActive(to: string, exact: boolean) {
  const localizedTo = localePath(to)
  if (exact) return route.path === localizedTo
  return route.path === localizedTo || route.path.startsWith(`${localizedTo}/`)
}
</script>

<template>
  <div class="border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-sm">
    <!-- Back link + title -->
    <div class="flex items-center gap-3 px-4 pt-3 pb-2">
      <NuxtLink
        :to="$localePath('/dashboard')"
        class="inline-flex items-center gap-1 text-xs font-medium text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors no-underline"
      >
        <ChevronLeft class="size-3.5" />
        Back
      </NuxtLink>
      <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
        Settings
      </h2>
    </div>

    <!-- Scrollable tabs -->
    <nav class="flex overflow-x-auto px-3 gap-1 pb-2 scrollbar-none">
      <NuxtLink
        v-for="item in settingsNav"
        :key="item.to"
        :to="$localePath(item.to)"
        class="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors no-underline shrink-0"
        :class="isActive(item.to, item.exact)
          ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
          : 'text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/60 hover:text-surface-900 dark:hover:text-surface-100'"
      >
        <component :is="item.icon" class="size-3.5" />
        {{ item.label }}
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
