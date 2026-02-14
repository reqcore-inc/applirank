<template>
  <div class="min-h-screen bg-surface-50">
    <!-- Simple header -->
    <header class="border-b border-surface-200 bg-white">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="text-lg font-bold text-surface-900">
          Applirank
        </NuxtLink>
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-surface-200 mt-12">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <p class="text-xs text-surface-400 text-center">
          Powered by <NuxtLink to="/" class="underline hover:text-surface-600">Applirank</NuxtLink>
        </p>
      </div>
    </footer>
  </div>
</template>
