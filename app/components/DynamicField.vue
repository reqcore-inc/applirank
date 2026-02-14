<script setup lang="ts">
/**
 * Renders a custom question as the appropriate form field based on its type.
 * Used on the public application form to display recruiter-configured questions.
 */
const props = defineProps<{
  question: {
    id: string
    type: string
    label: string
    description?: string | null
    required: boolean
    options?: string[] | null
  }
  error?: string
}>()

const model = defineModel<string | string[] | number | boolean | undefined>()

// String-coerced model for text inputs (avoids TS error with boolean in v-model on <input>)
const stringModel = computed({
  get: () => (model.value as string) ?? '',
  set: (v: string) => { model.value = v },
})

const numberModel = computed({
  get: () => (model.value as number) ?? undefined,
  set: (v: number) => { model.value = v },
})

const booleanModel = computed({
  get: () => (model.value as boolean) ?? false,
  set: (v: boolean) => { model.value = v },
})

// For multi_select, ensure model value is always an array
if (props.question.type === 'multi_select' && !Array.isArray(model.value)) {
  model.value = []
}

// For checkbox, ensure model value is always a boolean
if (props.question.type === 'checkbox' && typeof model.value !== 'boolean') {
  model.value = false
}

function toggleMultiOption(option: string) {
  const current = Array.isArray(model.value) ? [...model.value] : []
  const idx = current.indexOf(option)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(option)
  }
  model.value = current
}

function isOptionSelected(option: string): boolean {
  return Array.isArray(model.value) && model.value.includes(option)
}

const inputClasses = 'w-full rounded-lg border px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors'
const errorBorderClass = 'border-danger-300'
const normalBorderClass = 'border-surface-300'
</script>

<template>
  <div>
    <label :for="`q-${question.id}`" class="block text-sm font-medium text-surface-700 mb-1">
      {{ question.label }}
      <span v-if="question.required" class="text-danger-500">*</span>
    </label>

    <!-- Short Text -->
    <input
      v-if="question.type === 'short_text'"
      :id="`q-${question.id}`"
      v-model="stringModel"
      type="text"
      :required="question.required"
      :class="[inputClasses, error ? errorBorderClass : normalBorderClass]"
    />

    <!-- Long Text -->
    <textarea
      v-else-if="question.type === 'long_text'"
      :id="`q-${question.id}`"
      v-model="stringModel"
      rows="4"
      :required="question.required"
      :class="[inputClasses, error ? errorBorderClass : normalBorderClass]"
    />

    <!-- Single Select -->
    <select
      v-else-if="question.type === 'single_select'"
      :id="`q-${question.id}`"
      v-model="stringModel"
      :required="question.required"
      :class="[inputClasses, 'bg-white', error ? errorBorderClass : normalBorderClass]"
    >
      <option value="" disabled>Select an option…</option>
      <option v-for="opt in question.options" :key="opt" :value="opt">
        {{ opt }}
      </option>
    </select>

    <!-- Multi Select (checkboxes) -->
    <div v-else-if="question.type === 'multi_select'" class="space-y-2 mt-1">
      <label
        v-for="opt in question.options"
        :key="opt"
        class="flex items-center gap-2 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="isOptionSelected(opt)"
          class="size-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
          @change="toggleMultiOption(opt)"
        />
        <span class="text-sm text-surface-700">{{ opt }}</span>
      </label>
    </div>

    <!-- Number -->
    <input
      v-else-if="question.type === 'number'"
      :id="`q-${question.id}`"
      v-model="numberModel"
      type="number"
      :required="question.required"
      :class="[inputClasses, error ? errorBorderClass : normalBorderClass]"
    />

    <!-- Date -->
    <input
      v-else-if="question.type === 'date'"
      :id="`q-${question.id}`"
      v-model="stringModel"
      type="date"
      :required="question.required"
      :class="[inputClasses, error ? errorBorderClass : normalBorderClass]"
    />

    <!-- URL -->
    <input
      v-else-if="question.type === 'url'"
      :id="`q-${question.id}`"
      v-model="stringModel"
      type="url"
      placeholder="https://…"
      :required="question.required"
      :class="[inputClasses, error ? errorBorderClass : normalBorderClass]"
    />

    <!-- Checkbox (boolean) -->
    <label v-else-if="question.type === 'checkbox'" class="flex items-center gap-2 mt-1 cursor-pointer">
      <input
        :id="`q-${question.id}`"
        v-model="booleanModel"
        type="checkbox"
        class="size-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
      />
      <span class="text-sm text-surface-700">Yes</span>
    </label>

    <!-- Help text -->
    <p v-if="question.description" class="mt-1 text-xs text-surface-400">
      {{ question.description }}
    </p>

    <!-- Error message -->
    <p v-if="error" class="mt-1 text-xs text-danger-600">{{ error }}</p>
  </div>
</template>
