<template>
  <Teleport to="body">
    <div v-if="visible" class="image-viewer-overlay" @click.self="close">
      <button type="button" class="viewer-close" @click="close">&times;</button>
      <div class="viewer-body" @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp">
        <img
          ref="imgRef"
          :src="src"
          :alt="alt"
          class="viewer-image"
          :style="imageTransform"
          @load="onImageLoad"
        />
      </div>
      <div v-if="caption" class="viewer-caption">{{ caption }}</div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  src: string
  alt?: string
  caption?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const imgRef = ref<HTMLImageElement | null>(null)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0, ox: 0, oy: 0 })
const naturalSize = ref({ w: 0, h: 0 })

const imageTransform = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
  transition: dragging.value ? 'none' : 'transform 0.2s ease',
}))

watch(() => props.visible, val => {
  if (val) {
    scale.value = 1
    offsetX.value = 0
    offsetY.value = 0
  }
})

function onImageLoad() {
  if (imgRef.value) {
    naturalSize.value = { w: imgRef.value.naturalWidth, h: imgRef.value.naturalHeight }
  }
}

function close() {
  emit('close')
}

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  offsetX.value = dragStart.value.ox + (e.clientX - dragStart.value.x)
  offsetY.value = dragStart.value.oy + (e.clientY - dragStart.value.y)
}

function onPointerUp() {
  dragging.value = false
}
</script>

<style lang="scss" scoped>
.image-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.viewer-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 30001;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.viewer-body {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
}

.viewer-image {
  max-width: 92vw;
  max-height: 86vh;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  border-radius: 6px;
}

.viewer-caption {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80vw;
  padding: 8px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
</style>
