<template>
  <div class="game-snake">
    <div class="score-bar">
      <span class="score-label">得分</span>
      <span class="score-value">{{ score }}</span>
      <span class="speed-label">速度 {{ speed }}</span>
      <button class="restart-btn" @click="restart">重新开始</button>
    </div>
    <canvas ref="canvas" class="canvas" :width="canvasSize" :height="canvasSize" />
    <div class="controls">
      <button class="ctrl-btn" @click="setDir('up')">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 5l7 10H5z" fill="currentColor" /></svg>
      </button>
      <div class="ctrl-row">
        <button class="ctrl-btn" @click="setDir('left')">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12l10-7v14z" fill="currentColor" /></svg>
        </button>
        <button class="ctrl-btn" @click="setDir('down')">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 19l7-10H5z" fill="currentColor" /></svg>
        </button>
        <button class="ctrl-btn" @click="setDir('right')">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12l-10 7V5z" fill="currentColor" /></svg>
        </button>
      </div>
    </div>
    <div v-if="gameOver" class="overlay">
      <div class="overlay-card">
        <p class="overlay-title">游戏结束</p>
        <p class="overlay-score">得分：{{ score }}</p>
        <button class="restart-btn overlay-btn" @click="restart">再来一局</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const GRID = 20
const canvasSize = Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 32 : 380)
const cellSize = canvasSize / GRID

const canvas = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const speed = ref(1)
const gameOver = ref(false)

type Dir = 'up' | 'down' | 'left' | 'right'
type Pos = [number, number]

let snake: Pos[] = []
let food: Pos = [0, 0]
let dir: Dir = 'right'
let nextDir: Dir = 'right'
let timer = 0
let ctx: CanvasRenderingContext2D | null = null

function restart() {
  const mid = Math.floor(GRID / 2)
  snake = [[mid, mid], [mid - 1, mid], [mid - 2, mid]]
  dir = 'right'
  nextDir = 'right'
  score.value = 0
  speed.value = 1
  gameOver.value = false
  placeFood()
  draw()
  startLoop()
}

function placeFood() {
  const occupied = new Set(snake.map(([x, y]) => `${x},${y}`))
  const free: Pos[] = []
  for (let x = 0; x < GRID; x++)
    for (let y = 0; y < GRID; y++)
      if (!occupied.has(`${x},${y}`)) free.push([x, y])
  if (free.length === 0) { gameOver.value = true; return }
  food = free[Math.floor(Math.random() * free.length)]
}

function tick() {
  if (gameOver.value) return
  dir = nextDir
  const [hx, hy] = snake[0]
  let nx = hx, ny = hy
  if (dir === 'up') ny--
  else if (dir === 'down') ny++
  else if (dir === 'left') nx--
  else nx++

  if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) { gameOver.value = true; draw(); return }
  if (snake.some(([x, y]) => x === nx && y === ny)) { gameOver.value = true; draw(); return }

  const newHead: Pos = [nx, ny]
  snake.unshift(newHead)

  if (nx === food[0] && ny === food[1]) {
    score.value += 10
    if (score.value % 50 === 0 && speed.value < 10) {
      speed.value++
      startLoop()
    }
    placeFood()
  } else {
    snake.pop()
  }
  draw()
}

function draw() {
  if (!ctx) return
  const c = ctx
  c.fillStyle = '#0a1e2c'
  c.fillRect(0, 0, canvasSize, canvasSize)

  // Grid lines
  c.strokeStyle = 'rgba(255,255,255,0.03)'
  c.lineWidth = 0.5
  for (let i = 0; i <= GRID; i++) {
    const p = i * cellSize
    c.beginPath(); c.moveTo(p, 0); c.lineTo(p, canvasSize); c.stroke()
    c.beginPath(); c.moveTo(0, p); c.lineTo(canvasSize, p); c.stroke()
  }

  // Food
  const [fx, fy] = food
  c.fillStyle = '#f59e0b'
  c.beginPath()
  c.arc(fx * cellSize + cellSize / 2, fy * cellSize + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2)
  c.fill()

  // Snake
  snake.forEach(([x, y], i) => {
    const alpha = 1 - (i / snake.length) * 0.5
    c.fillStyle = i === 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(52, 211, 153, ${alpha})`
    c.beginPath()
    c.roundRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2, 3)
    c.fill()
  })
}

function startLoop() {
  if (timer) clearInterval(timer)
  const interval = Math.max(60, 160 - (speed.value - 1) * 15)
  timer = window.setInterval(tick, interval)
}

function setDir(d: Dir) {
  const opposites: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
  if (opposites[d] !== dir) nextDir = d
}

function onKey(e: KeyboardEvent) {
  const map: Record<string, Dir> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
  }
  const d = map[e.key]
  if (d) { e.preventDefault(); setDir(d) }
}

onMounted(() => {
  ctx = canvas.value?.getContext('2d') ?? null
  restart()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<style lang="scss" scoped>
.game-snake {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  user-select: none;
  position: relative;
}

.score-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.score-label { font-size: 13px; color: var(--text-tertiary); }
.speed-label { font-size: 12px; color: var(--text-tertiary); }

.score-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}

.restart-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.1); }
}

.canvas {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  max-width: 100%;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.ctrl-row {
  display: flex;
  gap: 6px;
}

.ctrl-btn {
  width: 52px;
  height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  &:active { background: rgba(56, 189, 248, 0.15); }
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
}

.overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px;
}

.overlay-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
.overlay-score { font-size: 14px; color: var(--text-secondary); margin: 0; }
.overlay-btn { margin-top: 4px; }
</style>
