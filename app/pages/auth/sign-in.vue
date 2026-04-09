<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
})

useSeoMeta({
  title: 'Sign In — Reqcore',
  description: 'Sign in to your Reqcore account',
  robots: 'noindex, nofollow',
})

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)
const route = useRoute()
const config = useRuntimeConfig()
const localePath = useLocalePath()
const { track } = useTrack()

onMounted(() => track('signin_page_viewed'))

if (route.query.live === '1') {
  email.value = config.public.liveDemoEmail
  password.value = config.public.liveDemoPasscode
}

async function handleSignIn() {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Email and password are required.'
    return
  }

  isLoading.value = true

  const result = await authClient.signIn.email({
    email: email.value,
    password: password.value,
  })

  if (result.error) {
    if (result.error.status === 500) {
      error.value = result.error.message && result.error.message !== 'Server Error'
        ? result.error.message
        : 'Sign-in failed due to a server error. If you are self-hosting, make sure the BETTER_AUTH_URL environment variable is set to your deployment domain (e.g. "https://your-app.up.railway.app") and redeploy.'
    }
    else {
      error.value = result.error.message ?? 'Invalid credentials. Please try again.'
    }
    isLoading.value = false
    return
  }

  clearNuxtData()

  track('signin_completed')

  // If the user was accepting an invitation, redirect back to accept it
  const pendingInvitation = route.query.invitation as string | undefined
  if (pendingInvitation) {
    await navigateTo(localePath(`/auth/accept-invitation/${pendingInvitation}`))
  }
  else {
    await navigateTo(localePath('/dashboard'))
  }
}

async function handleKeycloakSignIn() {
  isLoading.value = true
  error.value = ''
  try {
    await authClient.signIn.oauth2({
      providerId: 'keycloak',
      callbackURL: localePath('/dashboard'),
    })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'SSO sign-in failed'
    isLoading.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSignIn">
    <h2 class="text-xl font-semibold text-center text-surface-900 dark:text-surface-100 mb-2">Sign in to your account</h2>

    <button
      type="button"
      :disabled="isLoading"
      class="px-4 py-2.5 bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 rounded-md text-sm font-medium hover:bg-surface-900 dark:hover:bg-surface-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      @click="handleKeycloakSignIn"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
      Sign in with SSO
    </button>

    <div class="relative">
      <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-surface-200 dark:border-surface-700"></div></div>
      <div class="relative flex justify-center text-xs"><span class="bg-white dark:bg-surface-900 px-2 text-surface-400">or continue with email</span></div>
    </div>


    <div v-if="error" class="rounded-md border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400">{{ error }}</div>

    <label class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300">
      <span>Email</span>
      <input
        v-model="email"
        type="email"
        autocomplete="email"
        required
        class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
      />
    </label>

    <label class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300">
      <span>Password</span>
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
        class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
      />
    </label>

    <button
      type="submit"
      :disabled="isLoading"
      class="mt-2 px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {{ isLoading ? 'Signing in…' : 'Sign in' }}
    </button>

    <p class="text-center text-sm text-surface-500 dark:text-surface-400">
      Don't have an account?
      <NuxtLink :to="route.query.invitation ? $localePath({ path: '/auth/sign-up', query: { invitation: route.query.invitation } }) : $localePath('/auth/sign-up')" class="text-brand-600 dark:text-brand-400 hover:underline">Sign up</NuxtLink>
    </p>
  </form>
</template>

