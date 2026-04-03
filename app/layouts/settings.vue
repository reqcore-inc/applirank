<script setup lang="ts">
import { Eye, LogIn } from 'lucide-vue-next'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

const { data: session } = await authClient.useSession(useFetch)

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { activeOrg } = useCurrentOrg()
const { isUpsellOpen, closeUpsell } = usePreviewReadOnly()
const { sessionExpired } = useSessionGuard()

const isDemo = computed(() => {
  const slug = config.public.demoOrgSlug
  return slug && activeOrg.value?.slug === slug
})

const isDemoAccount = computed(() => session.value?.user?.email === 'demo@reqcore.com')

function handleSignInAgain() {
  navigateTo(localePath('/auth/sign-in?session=expired'))
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface-50 dark:bg-surface-950">
    <!-- AppTopBar: desktop only -->
    <AppTopBar class="hidden lg:block" />
    <AppToasts />
    <PreviewUpsellModal v-if="isUpsellOpen" @close="closeUpsell" />
    <ClientOnly>
      <DemoUpsellBanner v-if="isDemoAccount" />
    </ClientOnly>

    <!-- Session expired overlay (shown after demo reseed or session invalidation) -->
    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="sessionExpired"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/60 backdrop-blur-sm"
        >
          <div class="mx-4 max-w-md rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 text-center shadow-xl">
            <LogIn class="mx-auto mb-4 size-10 text-brand-500" />
            <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">
              Session expired
            </h2>
            <p class="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">
              The demo account was recently updated with fresh data. Please sign in again to continue exploring.
            </p>
            <button
              class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors cursor-pointer"
              @click="handleSignInAgain"
            >
              Sign in again
            </button>
          </div>
        </div>
      </Teleport>
    </ClientOnly>

    <!-- Demo mode banner -->
    <div
      v-if="isDemo"
      class="mx-auto mb-6 flex max-w-5xl items-center gap-3 rounded-lg border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/40 px-4 py-2.5 text-sm text-brand-700 dark:text-brand-300"
    >
      <Eye class="size-4 shrink-0" />
      <span>
        <strong>Live demo</strong> — Explore freely with sample data. Editing is disabled here.
        <a
          href="https://github.com/reqcore-inc/reqcore#quick-start"
          target="_blank"
          rel="noopener noreferrer"
          class="ml-1 font-semibold underline decoration-brand-400/40 underline-offset-2 hover:decoration-brand-400"
        >Deploy your own free instance →</a>
      </span>
    </div>

    <div class="flex flex-1 flex-col lg:flex-row min-w-0">
      <!-- Desktop sidebar -->
      <div class="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] shrink-0 z-10">
        <SettingsSidebar />
      </div>
      <!-- Mobile top nav -->
      <div class="lg:hidden sticky top-0 z-10">
        <SettingsMobileNav />
      </div>
      <!-- Page content -->
      <main class="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
