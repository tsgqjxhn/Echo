<template>
  <div class="game-2048" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <div class="score-bar">
      <span class="score-label">得分</span>
      <span class="score-value">{{ score }}</span>
      <button class="restart-btn" @click="restart">重新开始</button>
    </div>
    <div class="grid">
      <div v-for="(row, r) in grid" :key="r" class="grid-row">
        <div v-for="(cell, c) in row" :key="c" class="cell" :class="cellClass(cell)">
          {{ cell || '' }}
        </div>
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
import { reactive, ref } from 'vue'

type Grid = number[][]

const SIZE = 4
const score = ref(0)
const gameOver = ref(false)

const grid = reactive<Grid>(createEmptyGrid())

function createEmptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function addRandom() {
  const empty: [number, number][] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) empty.push([r, c])
  if (empty.length === 0) return
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  grid[r][c] = Math.random() < 0.9 ? 2 : 4
}

function cloneGrid(): Grid {
  return grid.map(row => [...row])
}

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (a[r][c] !== b[r][c]) return false
  return true
}

function slideRow(row: number[]): { result: number[]; pts: number } {
  const filtered = row.filter(v => v !== 0)
  const result: number[] = []
  let pts = 0
  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2
      result.push(merged)
      pts += merged
      i += 2
    } else {
      result.push(filtered[i])
      i++
    }
  }
  while (result.length < SIZE) result.push(0)
  return { result, pts }
}

function move(direction: 'up' | 'down' | 'left' | 'right') {
  if (gameOver.value) return
  const prev = cloneGrid()
  let pts = 0

  if (direction === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const { result, pts: p } = slideRow(grid[r])
      grid[r] = result
      pts += p
    }
  } else if (direction === 'right') {
    for (let r = 0; r < SIZE; r++) {
      const { result, pts: p } = slideRow([...grid[r]].reverse())
      grid[r] = result.reverse()
      pts += p
    }
  } else if (direction === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = grid.map(row => row[c])
      const { result, pts: p } = slideRow(col)
      for (let r = 0; r < SIZE; r++) grid[r][c] = result[r]
      pts += p
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const col = grid.map(row => row[c]).reverse()
      const { result, pts: p } = slideRow(col)
      const rev = result.reverse()
      for (let r = 0; r < SIZE; r++) grid[r][c] = rev[r]
      pts += p
    }
  }

  if (!gridsEqual(prev, grid)) {
    score.value += pts
    addRandom()
    checkGameOver()
  }
}

function checkGameOver() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return
    }
  gameOver.value = true
}

function restart() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) grid[r][c] = 0
  score.value = 0
  gameOver.value = false
  addRandom()
  addRandom()
}

function cellClass(v: number) {
  if (!v) return 'cell-empty'
  return `cell-${v}`
}

// Keyboard
function onKey(e: KeyboardEvent) {
  const map: Record<string, 'up' | 'down' | 'left' | 'right'> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
  }
  const dir = map[e.key]
  if (dir) { e.preventDefault(); move(dir) }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKey)
}

// Touch
let touchX = 0
let touchY = 0

function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0].clientX
  touchY = e.touches[0].clientY
}

function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  const dy = e.changedTouches[0].clientY - touchY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  if (Math.max(absDx, absDy) < 30) return
  if (absDx > absDy) move(dx > 0 ? 'right' : 'left')
  else move(dy > 0 ? 'down' : 'up')
}

// Init
restart()
</script>

<style lang="scss" scoped>
.game-2048 {
  width: min(380px, calc(100vw - 32px));
  user-select: none;
  position: relative;
}

.score-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.score-label {
  font-size: 13px;
  color: var(--text-tertiary);
}

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

.grid {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 8px;
  gap: 6px;
  display: flex;
  flex-direction: column;
}

.grid-row {
  display: flex;
  gap: 6px;
}

.cell {
  flex: 1;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 700;
  font-size: 18px;
  transition: background 0.1s;
}

.cell-empty { background: rgba(255, 255, 255, 0.03); }
.cell-2 { background: #1a3a4a; color: #e0e0e0; }
.cell-4 { background: #1a4a3a; color: #e0e0e0; }
.cell-8 { background: #2a5a2a; color: #fff; }
.cell-16 { background: #3a6a1a; color: #fff; }
.cell-32 { background: #4a7a0a; color: #fff; }
.cell-64 { background: #5a8a00; color: #fff; }
.cell-128 { background: #d97706; color: #fff; font-size: 16px; }
.cell-256 { background: #ea580c; color: #fff; font-size: 16px; }
.cell-512 { background: #dc2626; color: #fff; font-size: 16px; }
.cell-1024 { background: #9333ea; color: #fff; font-size: 13px; }
.cell-2048 { background: #facc15; color: #1a1a1a; font-size: 13px; }

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
