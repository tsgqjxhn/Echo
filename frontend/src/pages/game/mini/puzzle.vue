<template>
  <div class="puzzle-game">
    <header class="puzzle-header">
      <button v-if="standalone" type="button" class="back-btn" @click="$emit('exit')">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" /></svg>
      </button>
      <div class="header-text">
        <strong>残缺的逻辑</strong>
        <span class="header-sub">拼凑展板碎片</span>
      </div>
      <div class="timer-area" :class="{ urgent: timeLeft < 30 }">
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"/></svg>
        <span>{{ formattedTime }}</span>
      </div>
    </header>

    <div class="heartbeat" v-if="timeLeft < 30 && phase === 'puzzle'">
      <span class="hb-dot"></span>
      <span>倒计时正在加速…</span>
    </div>

    <section v-if="phase === 'puzzle'" class="puzzle-board" ref="boardRef">
      <div
        v-for="piece in pieces"
        :key="piece.id"
        class="puzzle-piece"
        :class="{ placed: piece.placed, dragging: piece.id === draggingId }"
        :style="pieceStyle(piece)"
        @pointerdown="startDrag(piece, $event)"
      >
        <canvas
          :ref="el => setPieceCanvas(piece.id, el as HTMLCanvasElement)"
          class="piece-canvas"
        />
        <span v-if="!piece.placed" class="piece-label">{{ piece.label }}</span>
      </div>
    </section>

    <section v-else-if="phase === 'password'" class="password-phase">
      <div class="pw-card">
        <div class="pw-icon">
          <svg viewBox="0 0 24 24" width="40" height="40">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor"/>
          </svg>
        </div>
        <strong>碎片已拼凑完成</strong>
        <p>从展板碎片中发现的规律：</p>
        <div class="pattern-row">
          <span class="pattern-chip">A → B → C → D → E → <b>F</b></span>
          <span class="pattern-chip">012 → 034 → <b>078</b></span>
        </div>
        <div class="pw-input-row">
          <input
            ref="pwRef"
            v-model="passwordInput"
            class="pw-input"
            type="text"
            placeholder="输入密码"
            maxlength="10"
            @keydown.enter="submitPassword"
          />
          <button type="button" class="pw-submit" @click="submitPassword">确认</button>
        </div>
        <p v-if="pwError" class="pw-error">{{ pwError }}</p>
      </div>
    </section>

    <section v-else-if="phase === 'success'" class="success-phase">
      <div class="success-card">
        <div class="success-glow"></div>
        <svg viewBox="0 0 24 24" width="48" height="48">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#4ade80"/>
        </svg>
        <strong>密码正确！</strong>
        <p>密码门已解锁，绿灯亮起。</p>
        <button v-if="standalone" type="button" class="success-btn" @click="$emit('complete')">继续剧情</button>
      </div>
    </section>

    <section v-if="phase === 'puzzle'" class="puzzle-hint">
      <p>拖拽碎片到正确位置，拼出展板上的规律</p>
      <div class="hint-progress">{{ placedCount }} / {{ pieces.length }} 已放置</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  standalone?: boolean
}>()

const emit = defineEmits<{
  complete: []
  exit: []
}>()

type Phase = 'puzzle' | 'password' | 'success'

interface PuzzlePiece {
  id: number
  label: string
  correctRow: number
  correctCol: number
  currentX: number
  currentY: number
  placed: boolean
}

const GRID = 3
const COLS = 3
const ROWS = 2
const TOTAL = 6

const phase = ref<Phase>('puzzle')
const timeLeft = ref(120)
const passwordInput = ref('')
const pwError = ref('')
const draggingId = ref<number | null>(null)
const boardRef = ref<HTMLElement | null>(null)
const pwRef = ref<HTMLInputElement | null>(null)

const pieceCanvases = new Map<number, HTMLCanvasElement>()

let timer: ReturnType<typeof setInterval> | null = null
let dragOffset = { x: 0, y: 0 }

const LABELS = ['A-012', 'B-034', 'C-056', 'D-078', 'E-090', 'F-078']
const PIECE_COLORS = ['#1a3a4a', '#1a3a4a', '#1a3a4a', '#1a3a4a', '#1a3a4a', '#0d2a3a']

const pieces = ref<PuzzlePiece[]>([])

const placedCount = computed(() => pieces.value.filter(p => p.placed).length)
const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function setPieceCanvas(id: number, el: HTMLCanvasElement | null) {
  if (el) pieceCanvases.set(id, el)
}

function initPieces() {
  const board = boardRef.value
  if (!board) return

  const boardW = board.clientWidth
  const boardH = board.clientHeight
  const cellW = boardW / COLS
  const cellH = boardH / ROWS

  const newPieces: PuzzlePiece[] = []
  const usedPositions = new Set<string>()

  for (let i = 0; i < TOTAL; i++) {
    const correctRow = Math.floor(i / COLS)
    const correctCol = i % COLS

    let randRow: number, randCol: number, key: string
    do {
      randRow = Math.floor(Math.random() * ROWS)
      randCol = Math.floor(Math.random() * COLS)
      key = `${randRow}-${randCol}`
    } while (usedPositions.has(key) && usedPositions.size < TOTAL)
    usedPositions.add(key)

    newPieces.push({
      id: i,
      label: LABELS[i],
      correctRow,
      correctCol,
      currentX: randCol * cellW + (Math.random() - 0.5) * 20,
      currentY: randRow * cellH + (Math.random() - 0.5) * 20,
      placed: false,
    })
  }

  pieces.value = newPieces

  void nextTick(() => {
    for (const piece of pieces.value) {
      drawPiece(piece)
    }
  })
}

function drawPiece(piece: PuzzlePiece) {
  const canvas = pieceCanvases.get(piece.id)
  if (!canvas) return

  const board = boardRef.value
  if (!board) return

  const cellW = board.clientWidth / COLS
  const cellH = board.clientHeight / ROWS
  const w = Math.floor(cellW - 8)
  const h = Math.floor(cellH - 8)

  canvas.width = w * 2
  canvas.height = h * 2
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.scale(2, 2)

  // Torn paper background
  ctx.fillStyle = PIECE_COLORS[piece.id] || '#1a3a4a'
  ctx.beginPath()
  const jag = () => (Math.random() - 0.5) * 6

  ctx.moveTo(4 + jag(), 4 + jag())
  ctx.lineTo(w - 4 + jag(), 4 + jag())
  for (let x = w - 4; x > 4; x -= 8) {
    ctx.lineTo(x + jag(), h - 4 + jag())
  }
  for (let x = 4; x < w - 4; x += 8) {
    ctx.lineTo(x + jag(), 4 + jag())
  }
  ctx.closePath()
  ctx.fill()

  // Torn edge effect
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Text content
  ctx.fillStyle = '#c0dce8'
  ctx.font = `bold ${Math.min(w, h) * 0.22}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(piece.label, w / 2, h / 2)

  // Subtle texture lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 0.5
  for (let y = 12; y < h - 12; y += 6) {
    ctx.beginPath()
    ctx.moveTo(8, y)
    ctx.lineTo(w - 8, y)
    ctx.stroke()
  }
}

function pieceStyle(piece: PuzzlePiece) {
  const board = boardRef.value
  if (!board) return {}

  const cellW = board.clientWidth / COLS
  const cellH = board.clientHeight / ROWS
  const w = cellW - 8
  const h = cellH - 8

  return {
    width: `${w}px`,
    height: `${h}px`,
    left: `${piece.currentX}px`,
    top: `${piece.currentY}px`,
    zIndex: piece.id === draggingId.value ? 100 : piece.placed ? 1 : 10,
  }
}

function startDrag(piece: PuzzlePiece, event: PointerEvent) {
  if (piece.placed || phase.value !== 'puzzle') return

  draggingId.value = piece.id
  const board = boardRef.value
  if (!board) return

  const rect = board.getBoundingClientRect()
  dragOffset.x = event.clientX - rect.left - piece.currentX
  dragOffset.y = event.clientY - rect.top - piece.currentY

  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)

  const onMove = (e: PointerEvent) => {
    const r = board.getBoundingClientRect()
    piece.currentX = e.clientX - r.left - dragOffset.x
    piece.currentY = e.clientY - r.top - dragOffset.y
  }

  const onUp = () => {
    draggingId.value = null
    target.removeEventListener('pointermove', onMove as EventListener)
    target.removeEventListener('pointerup', onUp)

    snapPiece(piece)
  }

  target.addEventListener('pointermove', onMove as EventListener)
  target.addEventListener('pointerup', onUp)
}

function snapPiece(piece: PuzzlePiece) {
  const board = boardRef.value
  if (!board) return

  const cellW = board.clientWidth / COLS
  const cellH = board.clientHeight / ROWS

  const col = Math.round(piece.currentX / cellW)
  const row = Math.round(piece.currentY / cellH)

  if (row === piece.correctRow && col === piece.correctCol) {
    piece.currentX = col * cellW
    piece.currentY = row * cellH
    piece.placed = true

    if (pieces.value.every(p => p.placed)) {
      setTimeout(() => {
        phase.value = 'password'
        void nextTick(() => pwRef.value?.focus())
      }, 600)
    }
  }
}

function submitPassword() {
  const input = passwordInput.value.trim().toUpperCase()
  if (!input) {
    pwError.value = '请输入密码'
    return
  }

  if (input === 'F-078') {
    phase.value = 'success'
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    emit('complete')
  } else {
    pwError.value = '密码错误，再仔细看看规律'
    passwordInput.value = ''
    void nextTick(() => pwRef.value?.focus())
  }
}

onMounted(() => {
  void nextTick(() => {
    initPieces()
  })

  timer = setInterval(() => {
    if (phase.value !== 'puzzle') return
    timeLeft.value--
    if (timeLeft.value <= 0) {
      if (timer) clearInterval(timer)
      timeLeft.value = 0
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.puzzle-game {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(14, 40, 60, 0.6) 0%, transparent 60%),
    linear-gradient(180deg, #050a0f 0%, #0a1520 50%, #060d14 100%);
  color: var(--text-primary);
  user-select: none;
}

.puzzle-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(5, 10, 15, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.back-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.header-text {
  flex: 1;

  strong {
    display: block;
    color: var(--text-primary);
    font-size: 16px;
  }
}

.header-sub {
  color: var(--text-tertiary);
  font-size: 11px;
}

.timer-area {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;

  &.urgent {
    color: #f87171;
    background: rgba(248, 113, 113, 0.10);
    animation: timer-pulse 1s ease infinite;
  }
}

@keyframes timer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.heartbeat {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #f87171;
  font-size: 12px;
  animation: heartbeat-fade 1.5s ease infinite;
}

.hb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f87171;
  animation: hb-pulse 0.8s ease infinite;
}

@keyframes hb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.4); opacity: 1; }
}

@keyframes heartbeat-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.puzzle-board {
  position: relative;
  flex: 1;
  margin: 16px;
  border-radius: 9px;
  border: 1px solid rgba(56, 189, 248, 0.12);
  background: rgba(255, 255, 255, 0.02);
  min-height: 300px;
  overflow: hidden;
}

.puzzle-piece {
  position: absolute;
  cursor: grab;
  transition: box-shadow 0.2s, opacity 0.2s;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  touch-action: none;

  &.placed {
    cursor: default;
    opacity: 0.85;
    box-shadow: 0 2px 8px rgba(74, 222, 128, 0.2);
    border: 1px solid rgba(74, 222, 128, 0.3);
  }

  &.dragging {
    cursor: grabbing;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    opacity: 0.9;
  }
}

.piece-canvas {
  display: block;
}

.piece-label {
  display: none;
}

.puzzle-hint {
  padding: 10px 16px 20px;
  text-align: center;

  p {
    color: var(--text-tertiary);
    font-size: 12px;
    margin: 0 0 4px;
  }
}

.hint-progress {
  color: var(--text-secondary);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

// Password phase
.password-phase {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.pw-card {
  width: min(380px, 100%);
  padding: 24px;
  border: 1px solid rgba(56, 189, 248, 0.14);
  border-radius: 11px;
  background: linear-gradient(180deg, rgba(10, 16, 27, 0.98), rgba(6, 11, 20, 0.98));
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.5);
  text-align: center;

  .pw-icon {
    margin-bottom: 14px;
    color: #7dd3fc;
  }

  strong {
    display: block;
    color: var(--text-primary);
    font-size: 20px;
    margin-bottom: 8px;
  }

  > p {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0 0 14px;
  }
}

.pattern-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.pattern-chip {
  display: inline-block;
  padding: 6px 14px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.06);
  color: #86efac;
  font-family: monospace;
  font-size: 14px;

  b {
    color: #4ade80;
  }
}

.pw-input-row {
  display: flex;
  gap: 8px;
}

.pw-input {
  flex: 1;
  height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font: inherit;
  font-size: 16px;
  font-family: monospace;
  letter-spacing: 2px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.4);
  }
}

.pw-submit {
  height: 44px;
  padding: 0 20px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.9), rgba(56, 189, 248, 0.9));
  color: #09121f;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.pw-error {
  margin-top: 10px;
  color: #f87171;
  font-size: 13px;
}

// Success phase
.success-phase {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.success-card {
  width: min(360px, 100%);
  padding: 28px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 11px;
  background: linear-gradient(180deg, rgba(10, 20, 15, 0.98), rgba(6, 14, 10, 0.98));
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.5);
  text-align: center;
  position: relative;
  overflow: hidden;

  strong {
    display: block;
    margin-top: 12px;
    color: #4ade80;
    font-size: 22px;
  }

  p {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.success-glow {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.2), transparent 70%);
  pointer-events: none;
}

.success-btn {
  margin-top: 18px;
  padding: 10px 28px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.9), rgba(34, 197, 94, 0.9));
  color: #091210;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
