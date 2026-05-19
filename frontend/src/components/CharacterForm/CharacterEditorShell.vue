<template>
  <div class="character-editor-shell">
    <header v-if="showHeader" class="editor-shell-header">
      <button type="button" class="back-btn" :aria-label="backLabel" @click="$emit('back')">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14.5 5.5L8 12l6.5 6.5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
          />
        </svg>
      </button>
      <h1 class="editor-shell-title">{{ title }}</h1>
      <div class="editor-shell-actions">
        <slot name="header-actions" />
      </div>
    </header>
    <main class="editor-shell-body">
      <slot />
    </main>
    <footer v-if="$slots.footer" class="editor-shell-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    showHeader?: boolean
    backLabel?: string
  }>(),
  {
    showHeader: true,
    backLabel: '返回',
  }
)

defineEmits<{
  back: []
}>()
</script>

<style scoped lang="scss">
.character-editor-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.editor-shell-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.back-icon {
  width: 24px;
  height: 24px;
}

.editor-shell-title {
  flex: 1;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.editor-shell-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-shell-body {
  flex: 1;
  overflow: auto;
}

.editor-shell-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}
</style>
