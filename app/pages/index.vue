<script setup lang="ts">
import { Github, Shield, Database, Users, Briefcase, ArrowRight } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const { data: session } = await authClient.useSession(useFetch)

const pillars = computed(() => [
  { icon: Database, label: t('home.pillars.yourData.label'), desc: t('home.pillars.yourData.desc') },
  { icon: Shield, label: t('home.pillars.auditable.label'), desc: t('home.pillars.auditable.desc') },
  { icon: Users, label: t('home.pillars.unlimitedSeats.label'), desc: t('home.pillars.unlimitedSeats.desc') },
])

useHead({ title: 'WWMate' })
definePageMeta({ layout: false })
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-white dark:bg-[#09090b]">
    <!-- Ambient glow -->
    <div
      class="pointer-events-none absolute top-[-40%] left-1/2 h-[800px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.07]"
      style="background: radial-gradient(ellipse at center, var(--color-brand-500), transparent 70%)"
    />

    <PublicNavBar />

    <main class="relative mx-auto max-w-5xl px-6 pt-36 pb-24">
      <!-- â”€â”€ Hero â”€â”€ -->
      <div class="flex flex-col items-center text-center">
        <h1 class="hero-animate hero-delay-1 text-5xl font-bold leading-[1.1] tracking-tight text-surface-900 dark:text-white sm:text-6xl lg:text-7xl">
          {{ $t('home.hero.titleLine1') }}
          <br />
          <span class="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            {{ $t('home.hero.titleHighlight') }}
          </span>
        </h1>

        <p class="hero-animate hero-delay-2 mt-6 max-w-md text-base leading-relaxed text-surface-600 dark:text-surface-400 sm:text-lg">
          {{ $t('home.hero.subtitle') }}
        </p>

        <div class="hero-animate hero-delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <NuxtLink
            v-if="session?.user"
            :to="localePath('/dashboard')"
            class="group flex items-center gap-2 rounded-lg bg-surface-900 dark:bg-white px-6 py-3 text-[14px] font-semibold text-white dark:text-[#09090b] transition hover:bg-surface-800 dark:hover:bg-white/90"
          >
            {{ $t('home.hero.goToDashboard') }}
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </NuxtLink>
          <template v-else>
            <NuxtLink
              :to="localePath('/auth/sign-in')"
              class="group flex items-center gap-2 rounded-lg bg-surface-900 dark:bg-white px-6 py-3 text-[14px] font-semibold text-white dark:text-[#09090b] transition hover:bg-surface-800 dark:hover:bg-white/90"
            >
              {{ $t('home.hero.signIn') }}
              <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </NuxtLink>
            <NuxtLink
              :to="localePath('/auth/sign-up')"
              class="rounded-lg border border-surface-300 dark:border-white/[0.08] bg-surface-100 dark:bg-white/[0.03] px-6 py-3 text-[14px] font-medium text-surface-600 dark:text-surface-300 transition hover:border-surface-400 dark:hover:border-white/[0.14] hover:bg-surface-200 dark:hover:bg-white/[0.06]"
            >
              {{ $t('home.hero.createAccount') }}
            </NuxtLink>
          </template>
        </div>
      </div>

      <!-- â”€â”€ Pillars â”€â”€ -->
      <div class="hero-animate hero-delay-4 mx-auto mt-28 grid max-w-3xl gap-4 sm:grid-cols-3">
        <div
          v-for="pillar in pillars"
          :key="pillar.label"
          class="bento-card relative rounded-xl p-6"
        >
          <component :is="pillar.icon" class="mb-4 h-5 w-5 text-brand-400" />
          <h2 class="text-[15px] font-semibold text-surface-900 dark:text-white">{{ pillar.label }}</h2>
          <p class="mt-1.5 text-[13px] leading-relaxed text-surface-600 dark:text-surface-400">{{ pillar.desc }}</p>
        </div>
      </div>

      <!-- â”€â”€ Footer â”€â”€ -->
      <footer class="hero-animate hero-delay-5 mt-28 flex flex-col items-center gap-4 text-center">
        <div class="flex items-center gap-5">
          <a
            href="https://github.com/WWMate-inc/WWMate"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1.5 text-[13px] text-surface-500 transition hover:text-surface-700 dark:hover:text-surface-300"
          >
            <Github class="h-4 w-4" />
            {{ $t('home.footer.source') }}
          </a>
          <NuxtLink
            :to="localePath('/jobs')"
            class="flex items-center gap-1.5 text-[13px] text-surface-500 transition hover:text-surface-700 dark:hover:text-surface-300"
          >
            <Briefcase class="h-3.5 w-3.5" />
            {{ $t('home.nav.openPositions') }}
          </NuxtLink>
        </div>
        <p class="text-[12px] text-surface-500 dark:text-surface-600">
          {{ $t('home.footer.tagline') }}
        </p>
      </footer>
    </main>
  </div>
</template>

