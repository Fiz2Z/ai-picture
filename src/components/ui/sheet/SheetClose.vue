<script setup lang="ts">
import { inject } from 'vue'

const sheet = inject('sheet', {
  open: { value: false },
  onOpenChange: (value: boolean) => { value },
})

const handleClick = () => {
  sheet.onOpenChange(false)
}
</script>

<template>
  <div @click="handleClick">
    <slot />
  </div>
</template>
