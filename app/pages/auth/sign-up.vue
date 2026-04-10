<script setup lang="ts">
definePageMeta({
    layout: "auth",
    middleware: ["guest"],
});

useSeoMeta({
    title: "Sign Up — Reqcore",
    description: "Create your Reqcore account",
    robots: "noindex, nofollow",
});

const route = useRoute();
const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const isLoading = ref(false);
const localePath = useLocalePath();
const { track } = useTrack();
const config = useRuntimeConfig();
const oidcEnabled = computed(() => config.public.oidcEnabled as boolean);
const oidcProviderName = computed(
    () => (config.public.oidcProviderName as string) || "SSO",
);

onMounted(() => track("signup_page_viewed"));

// If the user arrived from an invitation link, we'll redirect back after sign-up
const pendingInvitation = computed(
    () => route.query.invitation as string | undefined,
);

async function handleSignUp() {
    error.value = "";

    if (!name.value || !email.value || !password.value) {
        error.value = "All fields are required.";
        return;
    }

    if (password.value.length < 8) {
        error.value = "Password must be at least 8 characters.";
        return;
    }

    if (password.value !== confirmPassword.value) {
        error.value = "Passwords do not match.";
        return;
    }

    isLoading.value = true;

    track("signup_submitted");

    const result = await authClient.signUp.email({
        email: email.value,
        password: password.value,
        name: name.value,
    });

    if (result.error) {
        if (result.error.status === 500) {
            error.value =
                result.error.message && result.error.message !== "Server Error"
                    ? result.error.message
                    : 'Sign-up failed due to a server error. If you are self-hosting, make sure the BETTER_AUTH_URL environment variable is set to your deployment domain (e.g. "https://your-app.up.railway.app") and redeploy.';
        } else {
            error.value =
                result.error.message ?? "Sign-up failed. Please try again.";
        }
        track("signup_failed", { error_type: result.error.code ?? "unknown" });
        isLoading.value = false;
        return;
    }

    track("signup_completed");

    clearNuxtData();

    // If the user was accepting an invitation, redirect back to accept it
    if (pendingInvitation.value) {
        await navigateTo(
            localePath(`/auth/accept-invitation/${pendingInvitation.value}`),
        );
    } else {
        await navigateTo(localePath("/onboarding/create-org"));
    }
}

async function handleSsoSignUp() {
    isLoading.value = true;
    error.value = "";
    const callbackURL = pendingInvitation.value
        ? localePath(`/auth/accept-invitation/${pendingInvitation.value}`)
        : localePath("/dashboard");
    try {
        await authClient.signIn.oauth2({
            providerId: "oidc",
            callbackURL,
        });
    } catch (e: unknown) {
        error.value =
            e instanceof Error
                ? e.message
                : "SSO sign-up failed. Please try again.";
        isLoading.value = false;
    }
}
</script>

<template>
    <form class="flex flex-col gap-4" @submit.prevent="handleSignUp">
        <h2
            class="text-xl font-semibold text-center text-surface-900 dark:text-surface-100 mb-2"
        >
            Create your account
        </h2>

        <div
            v-if="error"
            class="rounded-md border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400"
        >
            {{ error }}
        </div>

        <!-- SSO sign-up — only shown when OIDC is configured via environment variables -->
        <template v-if="oidcEnabled">
            <button
                type="button"
                :disabled="isLoading"
                class="px-4 py-2.5 bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 rounded-md text-sm font-medium hover:bg-surface-900 dark:hover:bg-surface-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                @click="handleSsoSignUp"
            >
                <template v-if="isLoading">Redirecting…</template>
                <template v-else>
                    Sign up with {{ oidcProviderName }}
                    <span class="inline-flex items-center rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">Beta</span>
                </template>
            </button>

            <div class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div
                        class="w-full border-t border-surface-200 dark:border-surface-700"
                    />
                </div>
                <div class="relative flex justify-center text-xs">
                    <span
                        class="bg-white dark:bg-surface-900 px-2 text-surface-400"
                        >or continue with email</span
                    >
                </div>
            </div>
        </template>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Name</span>
            <input
                v-model="name"
                type="text"
                autocomplete="name"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Email</span>
            <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Password</span>
            <input
                v-model="password"
                type="password"
                autocomplete="new-password"
                required
                minlength="8"
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Confirm password</span>
            <input
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <button
            type="submit"
            :disabled="isLoading"
            class="mt-2 px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
            {{ isLoading ? "Creating account…" : "Sign up" }}
        </button>

        <p class="text-center text-sm text-surface-500 dark:text-surface-400">
            Already have an account?
            <NuxtLink
                :to="
                    pendingInvitation
                        ? $localePath({
                              path: '/auth/sign-in',
                              query: { invitation: pendingInvitation },
                          })
                        : $localePath('/auth/sign-in')
                "
                class="text-brand-600 dark:text-brand-400 hover:underline"
                >Sign in</NuxtLink
            >
        </p>
    </form>
</template>
