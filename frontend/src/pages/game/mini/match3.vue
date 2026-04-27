<template>
  <div class="match3-game">
    <header class="match3-header">
      <div class="title-block">
        <strong>{{ design.name }}</strong>
        <span>{{ statusText }}</span>
      </div>
      <button type="button" class="restart-btn" @click="restartGame">重开</button>
    </header>

    <section class="score-panel">
      <div class="score-card primary">
        <span>得分</span>
        <strong>{{ score }}</strong>
      </div>
      <div class="score-card">
        <span>目标</span>
        <strong>{{ design.board.targetScore }}</strong>
      </div>
      <div class="score-card">
        <span>步数</span>
        <strong>{{ movesLeft }}</strong>
      </div>
      <div class="score-card">
        <span>最佳连锁</span>
        <strong>{{ bestCombo }}</strong>
      </div>
    </section>

    <div class="progress-track" aria-hidden="true">
      <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
    </div>

    <section class="board-wrap">
      <div class="board" :class="{ busy: isResolving || isFinished }">
        <button
          v-for="cell in renderCells"
          :key="cell.key"
          type="button"
          class="tile-cell"
          :class="{
            selected: cell.selected,
            hinted: cell.hinted,
            clearing: cell.clearing,
            empty: !cell.tile,
          }"
          :disabled="!cell.tile || isResolving || isFinished"
          :aria-label="cell.piece ? `${cell.piece.label}，第${cell.row + 1}行第${cell.col + 1}列` : '空格'"
          @click="handleCellClick(cell)"
        >
          <span
            v-if="cell.piece"
            class="tile-shape"
            :class="`shape-${cell.piece.shape}`"
            :style="tileStyle(cell.piece)"
          >
            <span class="tile-symbol">{{ cell.piece.symbol }}</span>
          </span>
        </button>
      </div>

      <div v-if="isFinished" class="result-overlay">
        <div class="result-card">
          <strong>{{ result === 'won' ? '挑战成功' : '本局结束' }}</strong>
          <p>{{ result === 'won' ? design.states.won : design.states.lost }}</p>
          <div class="result-score">
            <span>最终得分</span>
            <b>{{ score }}</b>
          </div>
          <button type="button" class="primary-btn" @click="restartGame">再来一局</button>
        </div>
      </div>
    </section>

    <section class="action-row">
      <button type="button" class="tool-btn" :disabled="isResolving || isFinished" @click="showHint">
        提示
      </button>
      <button type="button" class="tool-btn" :disabled="shuffleLeft <= 0 || isResolving || isFinished" @click="manualShuffle">
        重排 {{ shuffleLeft }}
      </button>
      <div class="gain-pill" :class="{ active: lastGain > 0 }">
        +{{ lastGain }}
      </div>
    </section>

    <footer class="round-summary">
      <span>已消除 {{ clearedCount }} 枚</span>
      <span>历史最高 {{ highScore }}</span>
      <span>连锁 {{ comboLabel }}x</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type GameResult = 'playing' | 'won' | 'lost'
type Board = Array<Array<Tile | null>>
type Match3PieceShape = 'circle' | 'diamond' | 'triangle' | 'hexagon' | 'rounded-square' | 'star'

interface Tile {
  id: number
  pieceId: string
}

interface CellPosition {
  row: number
  col: number
}

interface MatchLine {
  axis: 'row' | 'col'
  cells: CellPosition[]
}

interface RenderCell extends CellPosition {
  key: string
  tile: Tile | null
  piece: Match3PieceSpec | null
  selected: boolean
  hinted: boolean
  clearing: boolean
}

interface Match3PieceSpec {
  id: string
  label: string
  symbol: string
  shape: Match3PieceShape
  color: string
  light: string
  dark: string
}

interface Match3Design {
  name: string
  board: {
    rows: number
    cols: number
    moves: number
    targetScore: number
  }
  pieces: Match3PieceSpec[]
  scoring: {
    basePerTile: number
    fourMatchBonus: number
    fiveMatchBonus: number
    comboMultiplierStep: number
  }
  rules: {
    minMatch: number
    shuffleCharges: number
    validSwapOnlyConsumesMove: boolean
    autoShuffleWhenNoMove: boolean
  }
  states: {
    playing: string
    won: string
    lost: string
  }
}

const design: Match3Design = {
  name: '星糖消消乐',
  board: {
    rows: 8,
    cols: 8,
    moves: 24,
    targetScore: 2600,
  },
  pieces: [
    {
      id: 'sun',
      label: '日冕糖',
      symbol: 'S',
      shape: 'circle',
      color: '#f59e0b',
      light: '#fde68a',
      dark: '#b45309',
    },
    {
      id: 'leaf',
      label: '青叶糖',
      symbol: 'L',
      shape: 'diamond',
      color: '#22c55e',
      light: '#bbf7d0',
      dark: '#15803d',
    },
    {
      id: 'wave',
      label: '海浪糖',
      symbol: 'W',
      shape: 'triangle',
      color: '#38bdf8',
      light: '#bae6fd',
      dark: '#0369a1',
    },
    {
      id: 'berry',
      label: '莓果糖',
      symbol: 'B',
      shape: 'hexagon',
      color: '#ec4899',
      light: '#fbcfe8',
      dark: '#be185d',
    },
    {
      id: 'grape',
      label: '葡萄糖',
      symbol: 'G',
      shape: 'rounded-square',
      color: '#8b5cf6',
      light: '#ddd6fe',
      dark: '#6d28d9',
    },
    {
      id: 'star',
      label: '星芒糖',
      symbol: 'A',
      shape: 'star',
      color: '#facc15',
      light: '#fef08a',
      dark: '#ca8a04',
    },
  ],
  scoring: {
    basePerTile: 12,
    fourMatchBonus: 48,
    fiveMatchBonus: 120,
    comboMultiplierStep: 0.35,
  },
  rules: {
    minMatch: 3,
    shuffleCharges: 2,
    validSwapOnlyConsumesMove: true,
    autoShuffleWhenNoMove: true,
  },
  states: {
    playing: '交换相邻星糖，组成三连即可消除。',
    won: '目标达成，星糖乐园被点亮。',
    lost: '步数用尽，距离目标还差一点。',
  },
}
const pieceMap = new Map<string, Match3PieceSpec>(design.pieces.map(piece => [piece.id, piece]))
const STORAGE_KEY = 'echo.match3.highScore'

const board = ref<Board>([])
const score = ref(0)
const movesLeft = ref(design.board.moves)
const shuffleLeft = ref(design.rules.shuffleCharges)
const clearedCount = ref(0)
const bestCombo = ref(0)
const comboLabel = ref(0)
const lastGain = ref(0)
const lastEvent = ref(design.states.playing)
const highScore = ref(0)
const result = ref<GameResult>('playing')
const selectedCell = ref<CellPosition | null>(null)
const hintKeys = ref<Set<string>>(new Set())
const clearingKeys = ref<Set<string>>(new Set())
const isResolving = ref(false)

let nextTileId = 1

const isFinished = computed(() => result.value !== 'playing')

const progressPercent = computed(() => {
  return Math.min(100, Math.round((score.value / design.board.targetScore) * 100))
})

const statusText = computed(() => {
  if (result.value === 'won') return design.states.won
  if (result.value === 'lost') return design.states.lost
  if (isResolving.value) return '星糖正在连锁消除...'
  return lastEvent.value
})

const renderCells = computed<RenderCell[]>(() => {
  const cells: RenderCell[] = []
  for (let row = 0; row < design.board.rows; row++) {
    for (let col = 0; col < design.board.cols; col++) {
      const tile = board.value[row]?.[col] || null
      const key = cellKey(row, col)
      cells.push({
        row,
        col,
        key,
        tile,
        piece: tile ? pieceMap.get(tile.pieceId) || null : null,
        selected: selectedCell.value?.row === row && selectedCell.value?.col === col,
        hinted: hintKeys.value.has(key),
        clearing: clearingKeys.value.has(key),
      })
    }
  }
  return cells
})

onMounted(() => {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  highScore.value = raw ? Number(raw) || 0 : 0
  restartGame()
})

function restartGame() {
  nextTileId = 1
  score.value = 0
  movesLeft.value = design.board.moves
  shuffleLeft.value = design.rules.shuffleCharges
  clearedCount.value = 0
  bestCombo.value = 0
  comboLabel.value = 0
  lastGain.value = 0
  lastEvent.value = design.states.playing
  result.value = 'playing'
  selectedCell.value = null
  hintKeys.value = new Set()
  clearingKeys.value = new Set()
  isResolving.value = false
  board.value = buildBoard()
}

function buildBoard(): Board {
  let fallback = createEmptyBoard()
  for (let attempt = 0; attempt < 80; attempt++) {
    const grid = createEmptyBoard()
    for (let row = 0; row < design.board.rows; row++) {
      for (let col = 0; col < design.board.cols; col++) {
        const options = design.pieces
          .map(piece => piece.id)
          .filter(pieceId => !createsMatchOnPlacement(grid, row, col, pieceId))
        grid[row][col] = createTile(pickRandom(options.length ? options : design.pieces.map(piece => piece.id)))
      }
    }
    fallback = grid
    if (findMatches(grid).length === 0 && findPossibleMove(grid)) return grid
  }
  return fallback
}

function createEmptyBoard(): Board {
  return Array.from({ length: design.board.rows }, () => Array<Tile | null>(design.board.cols).fill(null))
}

function createTile(pieceId: string): Tile {
  return { id: nextTileId++, pieceId }
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function createsMatchOnPlacement(grid: Board, row: number, col: number, pieceId: string): boolean {
  const left1 = grid[row]?.[col - 1]?.pieceId
  const left2 = grid[row]?.[col - 2]?.pieceId
  const up1 = grid[row - 1]?.[col]?.pieceId
  const up2 = grid[row - 2]?.[col]?.pieceId
  return (left1 === pieceId && left2 === pieceId) || (up1 === pieceId && up2 === pieceId)
}

function handleCellClick(cell: RenderCell) {
  if (!cell.tile || isResolving.value || isFinished.value) return

  const selected = selectedCell.value
  if (!selected) {
    selectedCell.value = { row: cell.row, col: cell.col }
    lastEvent.value = '再点一枚相邻星糖进行交换。'
    return
  }

  if (selected.row === cell.row && selected.col === cell.col) {
    selectedCell.value = null
    lastEvent.value = design.states.playing
    return
  }

  if (!isAdjacent(selected, cell)) {
    selectedCell.value = { row: cell.row, col: cell.col }
    lastEvent.value = '只能交换上下左右相邻的星糖。'
    return
  }

  selectedCell.value = null
  void performSwap(selected, cell)
}

async function performSwap(a: CellPosition, b: CellPosition) {
  isResolving.value = true
  hintKeys.value = new Set()
  lastGain.value = 0

  swapCells(board.value, a, b)
  refreshBoard()
  await wait(120)

  const matches = findMatches(board.value)
  if (matches.length === 0) {
    swapCells(board.value, a, b)
    refreshBoard()
    if (!design.rules.validSwapOnlyConsumesMove) {
      movesLeft.value = Math.max(0, movesLeft.value - 1)
      finishOrContinue()
    }
    lastEvent.value = design.rules.validSwapOnlyConsumesMove
      ? '没有形成三连，本次交换不消耗步数。'
      : '没有形成三连，本次交换已结束。'
    isResolving.value = false
    return
  }

  movesLeft.value = Math.max(0, movesLeft.value - 1)
  await resolveMatches(matches)
  finishOrContinue()
  isResolving.value = false
}

async function resolveMatches(initialMatches: MatchLine[]) {
  let matches = initialMatches
  let combo = 1

  while (matches.length > 0) {
    const matchedCells = uniqueCells(matches)
    const points = calculateScore(matches, combo)

    comboLabel.value = combo
    bestCombo.value = Math.max(bestCombo.value, combo)
    lastGain.value = points
    score.value += points
    clearedCount.value += matchedCells.size
    updateHighScore()
    lastEvent.value = `消除 ${matchedCells.size} 枚星糖，获得 ${points} 分。`

    clearingKeys.value = matchedCells
    refreshBoard()
    await wait(210)

    for (const key of matchedCells) {
      const [row, col] = key.split('-').map(Number)
      board.value[row][col] = null
    }
    clearingKeys.value = new Set()
    refreshBoard()
    await wait(90)

    collapseBoard()
    refreshBoard()
    await wait(120)

    refillBoard()
    refreshBoard()
    await wait(150)

    matches = findMatches(board.value)
    combo++
  }
}

function finishOrContinue() {
  updateHighScore()
  if (score.value >= design.board.targetScore) {
    result.value = 'won'
    lastEvent.value = design.states.won
    return
  }

  if (movesLeft.value <= 0) {
    result.value = 'lost'
    lastEvent.value = design.states.lost
    return
  }

  if (!findPossibleMove(board.value) && design.rules.autoShuffleWhenNoMove) {
    board.value = buildBoard()
    lastEvent.value = '没有可用交换，棋盘已自动重排。'
  }
}

function findMatches(grid: Board): MatchLine[] {
  const matches: MatchLine[] = []
  const min = design.rules.minMatch

  for (let row = 0; row < design.board.rows; row++) {
    let col = 0
    while (col < design.board.cols) {
      const pieceId = grid[row][col]?.pieceId
      if (!pieceId) {
        col++
        continue
      }
      let end = col + 1
      while (end < design.board.cols && grid[row][end]?.pieceId === pieceId) end++
      if (end - col >= min) {
        matches.push({
          axis: 'row',
          cells: Array.from({ length: end - col }, (_, i) => ({ row, col: col + i })),
        })
      }
      col = end
    }
  }

  for (let col = 0; col < design.board.cols; col++) {
    let row = 0
    while (row < design.board.rows) {
      const pieceId = grid[row][col]?.pieceId
      if (!pieceId) {
        row++
        continue
      }
      let end = row + 1
      while (end < design.board.rows && grid[end][col]?.pieceId === pieceId) end++
      if (end - row >= min) {
        matches.push({
          axis: 'col',
          cells: Array.from({ length: end - row }, (_, i) => ({ row: row + i, col })),
        })
      }
      row = end
    }
  }

  return matches
}

function calculateScore(matches: MatchLine[], combo: number): number {
  let raw = 0
  for (const match of matches) {
    const length = match.cells.length
    raw += length * design.scoring.basePerTile
    if (length === 4) raw += design.scoring.fourMatchBonus
    if (length >= 5) raw += design.scoring.fiveMatchBonus + (length - 5) * design.scoring.basePerTile
  }
  const multiplier = 1 + Math.max(0, combo - 1) * design.scoring.comboMultiplierStep
  return Math.round(raw * multiplier)
}

function uniqueCells(matches: MatchLine[]): Set<string> {
  const cells = new Set<string>()
  for (const match of matches) {
    for (const cell of match.cells) cells.add(cellKey(cell.row, cell.col))
  }
  return cells
}

function collapseBoard() {
  for (let col = 0; col < design.board.cols; col++) {
    let writeRow = design.board.rows - 1
    for (let row = design.board.rows - 1; row >= 0; row--) {
      const tile = board.value[row][col]
      if (!tile) continue
      board.value[writeRow][col] = tile
      if (writeRow !== row) board.value[row][col] = null
      writeRow--
    }
    for (let row = writeRow; row >= 0; row--) board.value[row][col] = null
  }
}

function refillBoard() {
  const pieceIds = design.pieces.map(piece => piece.id)
  for (let row = 0; row < design.board.rows; row++) {
    for (let col = 0; col < design.board.cols; col++) {
      if (!board.value[row][col]) board.value[row][col] = createTile(pickRandom(pieceIds))
    }
  }
}

function findPossibleMove(source: Board): [CellPosition, CellPosition] | null {
  const directions: CellPosition[] = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
  ]

  for (let row = 0; row < design.board.rows; row++) {
    for (let col = 0; col < design.board.cols; col++) {
      for (const direction of directions) {
        const next = { row: row + direction.row, col: col + direction.col }
        if (next.row >= design.board.rows || next.col >= design.board.cols) continue
        const grid = cloneBoard(source)
        const from = { row, col }
        swapCells(grid, from, next)
        if (findMatches(grid).length > 0) return [from, next]
      }
    }
  }

  return null
}

function showHint() {
  if (isResolving.value || isFinished.value) return
  const move = findPossibleMove(board.value)
  if (!move) {
    board.value = buildBoard()
    lastEvent.value = '没有可提示的交换，棋盘已重排。'
    return
  }
  hintKeys.value = new Set(move.map(cell => cellKey(cell.row, cell.col)))
  lastEvent.value = '已标出一组可以交换的星糖。'
}

function manualShuffle() {
  if (shuffleLeft.value <= 0 || isResolving.value || isFinished.value) return
  shuffleLeft.value--
  selectedCell.value = null
  hintKeys.value = new Set()
  clearingKeys.value = new Set()
  board.value = buildBoard()
  lastEvent.value = '棋盘已重排，未消耗步数。'
}

function cloneBoard(source: Board): Board {
  return source.map(row => row.map(tile => (tile ? { ...tile } : null)))
}

function swapCells(grid: Board, a: CellPosition, b: CellPosition) {
  const next = grid[a.row][a.col]
  grid[a.row][a.col] = grid[b.row][b.col]
  grid[b.row][b.col] = next
}

function isAdjacent(a: CellPosition, b: CellPosition): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

function refreshBoard() {
  board.value = board.value.map(row => [...row])
}

function updateHighScore() {
  if (score.value <= highScore.value) return
  highScore.value = score.value
  window.localStorage.setItem(STORAGE_KEY, String(highScore.value))
}

function tileStyle(piece: Match3PieceSpec): Record<string, string> {
  return {
    '--piece-color': piece.color,
    '--piece-light': piece.light,
    '--piece-dark': piece.dark,
  }
}

function cellKey(row: number, col: number): string {
  return `${row}-${col}`
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}
</script>

<style lang="scss" scoped>
.match3-game {
  width: min(560px, calc(100vw - 28px));
  color: var(--text-primary);
  user-select: none;
}

.match3-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  strong {
    font-size: 20px;
    font-weight: 700;
  }

  span {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
  }
}

.restart-btn,
.tool-btn,
.primary-btn {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  transition: transform var(--transition-base), border-color var(--transition-base), background var(--transition-base);

  &:active {
    transform: scale(0.96);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.restart-btn {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 14px;
  font-size: 13px;
}

.score-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.score-card {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);

  span {
    display: block;
    margin-bottom: 4px;
    color: var(--text-tertiary);
    font-size: 11px;
  }

  strong {
    display: block;
    color: var(--text-primary);
    font-size: 18px;
    line-height: 1;
  }
}

.score-card.primary {
  border-color: rgba(56, 189, 248, 0.22);
  background: rgba(56, 189, 248, 0.09);
}

.progress-track {
  height: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8, #22c55e, #facc15);
  transition: width 0.25s ease;
}

.board-wrap {
  position: relative;
}

.board {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
  aspect-ratio: 1;
  padding: 8px;
  border: 1px solid rgba(125, 211, 252, 0.12);
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.86), rgba(2, 6, 23, 0.9));
  box-shadow: var(--shadow-lg);
  touch-action: manipulation;
}

.board.busy .tile-cell {
  pointer-events: none;
}

.tile-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.055);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, opacity 0.16s ease;

  &:disabled {
    cursor: default;
  }
}

.tile-cell:not(:disabled):active {
  transform: scale(0.94);
}

.tile-cell.selected {
  border-color: rgba(250, 204, 21, 0.92);
  background: rgba(250, 204, 21, 0.14);
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.16);
}

.tile-cell.hinted {
  border-color: rgba(34, 197, 94, 0.78);
  animation: hintPulse 0.9s ease-in-out infinite;
}

.tile-cell.clearing {
  opacity: 0.3;
  transform: scale(0.72);
}

.tile-cell.empty {
  opacity: 0.35;
}

.tile-shape {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--piece-light), var(--piece-color) 54%, var(--piece-dark));
  box-shadow:
    inset 0 2px 5px rgba(255, 255, 255, 0.38),
    inset 0 -5px 9px rgba(0, 0, 0, 0.18),
    0 9px 18px rgba(0, 0, 0, 0.28);
}

.tile-shape {
  width: 68%;
  height: 68%;
}

.tile-symbol {
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(10px, 2.8vw, 18px);
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
}

.shape-circle {
  border-radius: 50%;
}

.shape-diamond {
  border-radius: 8px;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}

.shape-triangle {
  clip-path: polygon(50% 3%, 96% 92%, 4% 92%);
}

.shape-hexagon {
  clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);
}

.shape-rounded-square {
  border-radius: 18px;
}

.shape-star {
  clip-path: polygon(50% 0, 62% 34%, 98% 35%, 69% 56%, 79% 91%, 50% 70%, 21% 91%, 31% 56%, 2% 35%, 38% 34%);
}

.result-overlay {
  position: absolute;
  inset: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.result-card {
  width: min(320px, calc(100% - 32px));
  padding: 22px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.94);
  text-align: center;
  box-shadow: var(--shadow-xl);

  strong {
    display: block;
    margin-bottom: 8px;
    font-size: 22px;
  }

  p {
    margin: 0 0 14px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.7;
  }
}

.result-score {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);

  b {
    color: var(--text-primary);
  }
}

.primary-btn {
  width: 100%;
  min-height: 42px;
  background: var(--interactive-gradient);
  color: #fff;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.tool-btn {
  min-height: 40px;
  padding: 0 14px;
  font-size: 13px;
}

.gain-pill {
  margin-left: auto;
  min-width: 70px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-tertiary);
  text-align: center;
  font-weight: 700;
}

.gain-pill.active {
  color: #fef3c7;
  background: rgba(250, 204, 21, 0.13);
}

.round-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.round-summary span {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
}

@keyframes hintPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.2);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.18);
  }
}

@media (max-width: 560px) {
  .match3-game {
    width: calc(100vw - 24px);
  }

  .score-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .board {
    gap: 4px;
    padding: 6px;
    border-radius: 18px;
  }

  .tile-cell {
    border-radius: 11px;
  }

  .tile-shape {
    width: 72%;
    height: 72%;
  }
}
</style>
