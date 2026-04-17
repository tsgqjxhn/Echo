<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-spinner">
      <div class="spinner-circle"></div>
      <p v-if="message" class="loading-message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  message?: string
}>()
</script>

<style scoped lang="scss">
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top, rgba(108, 116, 126, 0.12), transparent 30%),
    rgba(5, 6, 8, 0.78);
  backdrop-filter: blur(14px);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 180px;
  padding: 24px 26px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(22, 24, 27, 0.94), rgba(12, 14, 16, 0.92));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
}

.spinner-circle {
  width: 42px;
  height: 42px;
  border: 3px solid rgba(255, 255, 255, 0.14);
  border-top-color: rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  animation: loading-spin 0.9s linear infinite;
}

.loading-message {
  color: rgba(244, 246, 248, 0.92);
  font-size: 14px;
  text-align: center;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
