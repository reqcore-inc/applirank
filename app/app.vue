<script setup lang="ts">
const i18nHead = useLocaleHead({
  seo: true,
})

useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs,
  link: i18nHead.value.link,
  meta: i18nHead.value.meta,
}))

// Blocking inline script to apply dark mode before first paint (prevents white
// flash). The nonce attribute is required by the nonce-based CSP set in
// server/middleware/csp.ts â€” without it the script would be blocked by the
// Content Security Policy (CSP).
const _nonce = import.meta.server ? (useRequestEvent()?.context?.nonce ?? '') : ''
useHead({
  script: [
    {
      key: 'dark-mode-init',
      innerHTML: '(function(){try{var s=localStorage.getItem("WWMate-color-mode");var m=s||(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");document.documentElement.classList.toggle("dark",m==="dark");document.documentElement.style.colorScheme=m}catch(e){}})()',
      tagPosition: 'head',
      ...(_nonce ? { nonce: _nonce } : {}),
    },
  ],
})

// Sync Better Auth session â†’ PostHog identity & org group
await usePostHogIdentity()
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <ConsentBanner />
    </ClientOnly>
  </div>
</template>

