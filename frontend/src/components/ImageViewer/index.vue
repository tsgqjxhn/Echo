<template>
  <Teleport to="body">
    <div v-if="visible" class="image-viewer-overlay" @click.self="close">
      <button type="button" class="viewer-close" @click="close">&times;</button>
      <div
        ref="bodyRef"
        class="viewer-body"
        @wheel.prevent="onWheel"
        @dblclick.prevent="onDoubleClick"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
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
const bodyRef = ref<HTMLElement | null>(null)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)
const pinching = ref(false)
const dragStart = ref({ x: 0, y: 0, ox: 0, oy: 0 })
const naturalSize = ref({ w: 0, h: 0 })
const pointers = new Map<number, { x: number; y: number }>()
const pinchStart = ref({
  distance: 0,
  centerX: 0,
  centerY: 0,
  scale: 1,
  ox: 0,
  oy: 0,
})

const MIN_SCALE = 1
const MAX_SCALE = 5

const imageTransform = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`,
  transition: dragging.value || pinching.value ? 'none' : 'transform 0.2s ease',
}))

watch(() => props.visible, val => {
  if (val) {
    resetTransform()
  }
})

watch(() => props.src, () => {
  resetTransform()
})

function onImageLoad() {
  if (imgRef.value) {
    naturalSize.value = { w: imgRef.value.naturalWidth, h: imgRef.value.naturalHeight }
  }
  clampOffsets()
}

function close() {
  pointers.clear()
  dragging.value = false
  pinching.value = false
  emit('close')
}

function onPointerDown(e: PointerEvent) {
  e.preventDefault()
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

  if (pointers.size === 2) {
    dragging.value = false
    pinching.value = true
    beginPinch()
    return
  }

  dragging.value = scale.value > MIN_SCALE
  dragStart.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value }
}

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return

  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size >= 2) {
    updatePinch()
    return
  }

  if (!dragging.value) return

  offsetX.value = dragStart.value.ox + (e.clientX - dragStart.value.x)
  offsetY.value = dragStart.value.oy + (e.clientY - dragStart.value.y)
  clampOffsets()
}

function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)

  if (pointers.size === 1) {
    const remaining = [...pointers.values()][0]
    dragging.value = scale.value > MIN_SCALE
    dragStart.value = { x: remaining.x, y: remaining.y, ox: offsetX.value, oy: offsetY.value }
    return
  }

  dragging.value = false
  pinching.value = false
  pinchStart.value.distance = 0
  clampOffsets()
}

function onWheel(e: WheelEvent) {
  const nextScale = clamp(scale.value - e.deltaY * 0.0018, MIN_SCALE, MAX_SCALE)
  zoomAt(nextScale, e.clientX, e.clientY)
}

function onDoubleClick(e: MouseEvent) {
  if (scale.value > MIN_SCALE) {
    resetTransform()
    return
  }

  zoomAt(2.4, e.clientX, e.clientY)
}

function resetTransform() {
  scale.value = MIN_SCALE
  offsetX.value = 0
  offsetY.value = 0
  dragging.value = false
  pinching.value = false
  pointers.clear()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getBodyCenter() {
  const rect = bodyRef.value?.getBoundingClientRect()
  if (!rect) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function zoomAt(nextScale: number, clientX: number, clientY: number) {
  const oldScale = scale.value
  if (Math.abs(nextScale - oldScale) < 0.001) return

  const center = getBodyCenter()
  const ratio = nextScale / oldScale
  offsetX.value += (clientX - center.x - offsetX.value) * (1 - ratio)
  offsetY.value += (clientY - center.y - offsetY.value) * (1 - ratio)
  scale.value = nextScale
  clampOffsets()
}

function getPinchGeometry() {
  const points = [...pointers.values()]
  if (points.length < 2) return null

  const [a, b] = points
  const dx = b.x - a.x
  const dy = b.y - a.y
  return {
    distance: Math.hypot(dx, dy),
    centerX: (a.x + b.x) / 2,
    centerY: (a.y + b.y) / 2,
  }
}

function beginPinch() {
  const geometry = getPinchGeometry()
  if (!geometry) return

  pinchStart.value = {
    ...geometry,
    scale: scale.value,
    ox: offsetX.value,
    oy: offsetY.value,
  }
}

function updatePinch() {
  const geometry = getPinchGeometry()
  if (!geometry || pinchStart.value.distance <= 0) return

  const nextScale = clamp(
    pinchStart.value.scale * (geometry.distance / pinchStart.value.distance),
    MIN_SCALE,
    MAX_SCALE,
  )
  scale.value = nextScale
  offsetX.value = pinchStart.value.ox + (geometry.centerX - pinchStart.value.centerX)
  offsetY.value = pinchStart.value.oy + (geometry.centerY - pinchStart.value.centerY)
  clampOffsets()
}

function clampOffsets() {
  if (scale.value <= MIN_SCALE) {
    scale.value = MIN_SCALE
    offsetX.value = 0
    offsetY.value = 0
    return
  }

  const body = bodyRef.value
  const image = imgRef.value
  if (!body || !image) return

  const maxX = Math.max(0, (image.offsetWidth * scale.value - body.clientWidth) / 2) + 48
  const maxY = Math.max(0, (image.offsetHeight * scale.value - body.clientHeight) / 2) + 48
  offsetX.value = clamp(offsetX.value, -maxX, maxX)
  offsetY.value = clamp(offsetY.value, -maxY, maxY)
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
  cursor: zoom-in;
}

.viewer-image {
  max-width: 92vw;
  max-height: 86vh;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  border-radius: 6px;
  cursor: grab;
  will-change: transform;
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
