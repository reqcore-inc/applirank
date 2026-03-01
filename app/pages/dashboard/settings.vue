<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})
</script>

<template>
  <div class="flex min-w-0 flex-1 -mx-6 -my-8">
    <div class="sticky -top-8 h-screen shrink-0">
      <SettingsSidebar />
    </div>
    <div class="flex-1 min-w-0 px-8 py-8">
      <NuxtPage />
    </div>
  </div>
</template>
