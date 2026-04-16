<script setup lang="ts">
definePageMeta({
    layout: "auth",
    middleware: ["guest"],
});

useSeoMeta({
    title: "Reset Password — Reqcore",
    description: "Set a new password for your Reqcore account",
    robots: "noindex, nofollow",
});

const route = useRoute();
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref(false);
const isLoading = ref(false);
const localePath = useLocalePath();
const { track } = useTrack();

const token = computed(() => route.query.token as string | undefined);
const tokenError = computed(() => route.query.error as string | undefined);

onMounted(() => track("reset_password_page_viewed"));

async function handleResetPassword() {
    error.value = "";

    if (!token.value) {
        error.value = "Invalid or missing reset token. Please request a new password reset link.";
        return;
    }

    if (!newPassword.value) {
        error.value = "Password is required.";
        return;
    }

    if (newPassword.value.length < 8) {
        error.value = "Password must be at least 8 characters.";
        return;
    }

    if (newPassword.value !== confirmPassword.value) {
        error.value = "Passwords do not match.";
        return;
    }

    isLoading.value = true;

    try {
        const result = await authClient.resetPassword({
            newPassword: newPassword.value,
            token: token.value,
        });

        if (result.error) {
            error.value =
                result.error.message ?? "Failed to reset password. The link may have expired.";
            isLoading.value = false;
            return;
        }
    } catch (e: unknown) {
        error.value =
            e instanceof Error ? e.message : "Failed to reset password. Please try again.";
        isLoading.value = false;
        return;
    }

    track("reset_password_completed");
    success.value = true;
    isLoading.value = false;
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <h2
            class="text-xl font-semibold text-center text-surface-900 dark:text-surface-100 mb-2"
        >
            Set new password
        </h2>

        <template v-if="success">
            <div
                class="rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-400"
            >
                Your password has been reset successfully.
            </div>

            <NuxtLink
                :to="$localePath('/auth/sign-in')"
                class="mt-2 px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-brand-700 transition-colors text-center block"
            >
                Sign in with new password
            </NuxtLink>
        </template>

        <template v-else-if="tokenError || !token">
            <div
                class="rounded-md border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400"
            >
                {{ tokenError === 'INVALID_TOKEN'
                    ? "This password reset link is invalid or has expired."
                    : "Invalid password reset link. Please request a new one." }}
            </div>

            <NuxtLink
                :to="$localePath('/auth/forgot-password')"
                class="mt-2 px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-brand-700 transition-colors text-center block"
            >
                Request new reset link
            </NuxtLink>
        </template>

        <template v-else>
            <div
                v-if="error"
                class="rounded-md border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400"
            >
                {{ error }}
            </div>

            <form class="flex flex-col gap-4" @submit.prevent="handleResetPassword">
                <label
                    class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
                >
                    <span>New password</span>
                    <input
                        v-model="newPassword"
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
                    <span>Confirm new password</span>
                    <input
                        v-model="confirmPassword"
                        type="password"
                        autocomplete="new-password"
                        required
                        minlength="8"
                        class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                    />
                </label>

                <button
                    type="submit"
                    :disabled="isLoading"
                    class="mt-2 px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                    {{ isLoading ? "Resetting…" : "Reset password" }}
                </button>
            </form>

            <p class="text-center text-sm text-surface-500 dark:text-surface-400">
                <NuxtLink
                    :to="$localePath('/auth/sign-in')"
                    class="text-brand-600 dark:text-brand-400 hover:underline"
                >
                    Back to sign in
                </NuxtLink>
            </p>
        </template>
    </div>
</template>
