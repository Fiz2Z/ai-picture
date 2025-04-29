<script setup lang="ts">
import { provide } from 'vue'
import { useVModel } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
  }>(),
  {
    open: undefined,
    defaultOpen: false,
    onOpenChange: undefined,
  }
)

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const openRef = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
})

provide('sheet', {
  open: openRef,
  onOpenChange: (value: boolean) => {
    openRef.value = value
    props.onOpenChange?.(value)
  },
})
</script>

<template>
  <slot />
</template>
