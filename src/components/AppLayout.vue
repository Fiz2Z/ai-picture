<script setup lang="ts">
import Navbar from '@/components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <div class="flex-1">
      <slot></slot>
    </div>
  </div>
</template>
