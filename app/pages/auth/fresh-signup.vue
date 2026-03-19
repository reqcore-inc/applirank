<script setup lang="ts">
definePageMeta({ layout: 'auth' })

useSeoMeta({ robots: 'noindex, nofollow' })

onMounted(() => {
  // Full browser navigation to the server endpoint. The server checks
  // the session, destroys it if it belongs to the demo org, clears
  // auth cookies via Set-Cookie headers, and returns a 302 redirect
  // to either /auth/sign-up or /dashboard. Using native navigation
  // (not $fetch) guarantees the browser processes Set-Cookie headers.
  window.location.replace('/api/auth/demo-fresh-signup')
})
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <p class="text-sm text-surface-500 dark:text-surface-400">Redirecting…</p>
  </div>
</template>
