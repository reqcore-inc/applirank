<script setup lang="ts">
import { Github, Shield, Database, Users, Briefcase, ArrowRight } from 'lucide-vue-next'

const localePath = useLocalePath()
const { data: session } = await authClient.useSession(useFetch)

const pillars = [
  { icon: Database, label: 'Your data', desc: 'Postgres + MinIO on your infrastructure. Nothing leaves your network.' },
  { icon: Shield, label: 'Fully auditable', desc: 'Open source — every line of matching logic is visible and overridable.' },
  { icon: Users, label: 'Unlimited seats', desc: 'Add your whole hiring team. No per-seat pricing, ever.' },
]

useHead({ title: 'Reqcore' })
definePageMeta({ layout: false })
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
    <!-- Ambient glow -->
    <div
      class="pointer-events-none absolute top-[-40%] left-1/2 h-[800px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.07]"
      style="background: radial-gradient(ellipse at center, var(--color-brand-500), transparent 70%)"
    />

    <PublicNavBar />

    <main class="relative mx-auto max-w-5xl px-6 pt-36 pb-24">
      <!-- ── Hero ── -->
      <div class="flex flex-col items-center text-center">
        <h1 class="hero-animate hero-delay-1 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          Your hiring.
          <br />
          <span class="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            Your infrastructure.
          </span>
        </h1>

        <p class="hero-animate hero-delay-2 mt-6 max-w-md text-base leading-relaxed text-surface-400 sm:text-lg">
          Open-source applicant tracking built for teams that self-host.
        </p>

        <div class="hero-animate hero-delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <NuxtLink
            v-if="session?.user"
            :to="localePath('/dashboard')"
            class="group flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[14px] font-semibold text-[#09090b] transition hover:bg-white/90"
          >
            Go to Dashboard
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </NuxtLink>
          <template v-else>
            <NuxtLink
              :to="localePath('/auth/sign-in')"
              class="group flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[14px] font-semibold text-[#09090b] transition hover:bg-white/90"
            >
              Sign in
              <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </NuxtLink>
            <NuxtLink
              :to="localePath('/auth/sign-up')"
              class="rounded-lg border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-[14px] font-medium text-surface-300 transition hover:border-white/[0.14] hover:bg-white/[0.06]"
            >
              Create account
            </NuxtLink>
          </template>
        </div>
      </div>

      <!-- ── Pillars ── -->
      <div class="hero-animate hero-delay-4 mx-auto mt-28 grid max-w-3xl gap-4 sm:grid-cols-3">
        <div
          v-for="pillar in pillars"
          :key="pillar.label"
          class="bento-card relative rounded-xl p-6"
        >
          <component :is="pillar.icon" class="mb-4 h-5 w-5 text-brand-400" />
          <h2 class="text-[15px] font-semibold text-white">{{ pillar.label }}</h2>
          <p class="mt-1.5 text-[13px] leading-relaxed text-surface-400">{{ pillar.desc }}</p>
        </div>
      </div>

      <!-- ── Footer ── -->
      <footer class="hero-animate hero-delay-5 mt-28 flex flex-col items-center gap-4 text-center">
        <div class="flex items-center gap-5">
          <a
            href="https://github.com/reqcore-inc/reqcore"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-1.5 text-[13px] text-surface-500 transition hover:text-surface-300"
          >
            <Github class="h-4 w-4" />
            Source
          </a>
          <NuxtLink
            :to="localePath('/jobs')"
            class="flex items-center gap-1.5 text-[13px] text-surface-500 transition hover:text-surface-300"
          >
            <Briefcase class="h-3.5 w-3.5" />
            Open Positions
          </NuxtLink>
        </div>
        <p class="text-[12px] text-surface-600">
          Reqcore — open-source applicant tracking
        </p>
      </footer>
    </main>
  </div>
</template>
