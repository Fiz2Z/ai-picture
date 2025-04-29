<script setup lang="ts">
import { RouterView } from 'vue-router';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/components/AppLayout.vue';
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <AppLayout>
      <RouterView/>
    </AppLayout>
    <Toaster position="top-center" richColors />
  </TooltipProvider>
</template>