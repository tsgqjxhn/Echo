<template>
  <div class="gomoku-page">
    <!-- Mode selection -->
    <div v-if="!mode" class="mode-screen">
      <h2 class="mode-title">选择对弈模式</h2>
      <button type="button" class="mode-card" @click="selectAiFriend">
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" width="28" height="28"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </div>
        <div class="mode-text"><span class="mode-name">邀请AI好友</span><span class="mode-desc">从好友列表中选择角色对弈（不含星标）</span></div>
      </button>
      <button type="button" class="mode-card" @click="selectLocalEngine">
        <div class="mode-icon engine-icon">
          <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7zM9 21h6M10 17v4M14 17v4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </div>
        <div class="mode-text"><span class="mode-name">内置引擎</span><span class="mode-desc">本地算法对弈，可选择难度</span></div>
      </button>
    </div>

    <!-- Friend picker -->
    <div v-else-if="mode === 'ai-friend' && !gameStarted" class="friend-screen">
      <div class="friend-header"><button type="button" class="back-btn-sm" @click="mode = null">返回</button><h3>选择AI好友</h3></div>
      <div v-if="friends.length === 0" class="empty-friends"><p>暂无好友。请先将角色加入好友列表。</p></div>
      <div v-else class="friend-list">
        <button v-for="f in friends" :key="f.id" type="button" class="friend-item" @click="startWithFriend(f)">
          <div class="friend-avatar"><img v-if="f.avatar" :src="f.avatar" @error="($event.target as HTMLImageElement).style.display = 'none'" /><span v-else>{{ f.name.charAt(0) }}</span></div>
          <span class="friend-name">{{ f.name }}</span>
          <svg class="friend-arrow" viewBox="0 0 24 24" width="16" height="16"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
        </button>
      </div>
    </div>

    <!-- Difficulty picker -->
    <div v-else-if="mode === 'local' && !gameStarted" class="diff-screen">
      <div class="diff-header"><button type="button" class="back-btn-sm" @click="mode = null">返回</button><h3>选择难度</h3></div>
      <div class="diff-list">
        <button v-for="d in difficulties" :key="d.level" type="button" class="diff-card" :class="{ selected: difficulty === d.level }" @click="difficulty = d.level">
          <span class="diff-name">{{ d.name }}</span><span class="diff-desc">{{ d.desc }}</span>
        </button>
      </div>
      <button type="button" class="start-btn" :disabled="!difficulty" @click="startLocal">开始对弈</button>
    </div>

    <!-- Game board -->
    <div v-else-if="gameStarted" class="game-screen">
      <div class="game-info-bar">
        <span class="opponent-name">{{ opponentName }}</span>
        <div class="action-btns">
          <button v-if="!gameOverMsg" type="button" class="action-sm draw-btn" @click="offerDraw">求和</button>
          <button v-if="!gameOverMsg" type="button" class="action-sm resign-btn" @click="resign">认输</button>
        </div>
        <span class="turn-indicator" :class="{ active: isPlayerTurn }">{{ isPlayerTurn ? '你的回合（黑）' : '对手思考中…' }}</span>
      </div>

      <div class="board-wrapper">
        <canvas ref="canvas" class="board-canvas" :width="canvasSize" :height="canvasSize" @click="onClickBoard" @touchend.prevent="onTouchBoard" />
      </div>

      <div class="game-action-panel">
        <button type="button" class="action-wide undo-btn" :disabled="moveHistory.length === 0 || !isPlayerTurn || !!gameOverMsg" @click="undoMove">悔棋</button>
      </div>

      <div v-if="aiRequestState !== 'idle'" class="ai-waiting-card">
        {{ aiRequestState === 'waiting' ? '正在邀请角色进入对局…' : '角色已收到对局邀请' }}
      </div>

      <div v-if="gameOverMsg" class="overlay">
        <div class="overlay-card">
          <p class="overlay-title">{{ gameOverMsg }}</p>
          <button type="button" class="start-btn" @click="resetGame">再来一局</button>
          <button type="button" class="back-btn-sm" @click="mode = null; gameStarted = false">返回选择</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCharacterStore } from '@/stores/character'
import { useChatStore } from '@/stores/chat'
import type { ICharacter } from '@/types/character'

const SIZE = 15
const characterStore = useCharacterStore()
const chatStore = useChatStore()

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasSize = Math.min(380, typeof window !== 'undefined' ? window.innerWidth - 48 : 380)
const cellSize = canvasSize / (SIZE + 1)

const mode = ref<'ai-friend' | 'local' | null>(null)
const gameStarted = ref(false)
const difficulty = ref(0)
const opponentName = ref('引擎')
const gameOverMsg = ref('')
const playerColor = ref<1 | -1>(1) // 1=black(先手), -1=white
const currentTurn = ref<1 | -1>(1)
const lastMove = ref<[number, number] | null>(null)
const moveHistory = ref<Array<{ board: number[][]; currentTurn: 1 | -1; lastMove: [number, number] | null }>>([])
const aiRequestState = ref<'idle' | 'waiting' | 'sent'>('idle')

let board: number[][] = []
let friendCharacter: ICharacter | null = null
let aiTimer = 0
let ctx: CanvasRenderingContext2D | null = null

const friends = computed(() => characterStore.friendCharacters.filter(c => !c.isFavorite))
const isPlayerTurn = computed(() => currentTurn.value === playerColor.value)

const difficulties = [
  { level: 1, name: '入门', desc: '随机落子，偶尔好棋' },
  { level: 2, name: '简单', desc: '基本攻防意识' },
  { level: 3, name: '中等', desc: '评估局势，规划连珠' },
  { level: 4, name: '困难', desc: '深度搜索，精确计算' },
]

function initBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function selectAiFriend() { mode.value = 'ai-friend' }
function selectLocalEngine() { mode.value = 'local' }

function startWithFriend(f: ICharacter) {
  friendCharacter = f
  opponentName.value = f.name
  playerColor.value = 1; currentTurn.value = 1
  lastMove.value = null; gameOverMsg.value = ''
  moveHistory.value = []
  initBoard(); gameStarted.value = true
  notifyFriendGameCreated(f)
}

function startLocal() {
  opponentName.value = `引擎 (${difficulties[difficulty.value - 1].name})`
  playerColor.value = 1; currentTurn.value = 1
  lastMove.value = null; gameOverMsg.value = ''
  moveHistory.value = []
  aiRequestState.value = 'idle'
  initBoard(); gameStarted.value = true
}

function resetGame() {
  initBoard(); lastMove.value = null; gameOverMsg.value = ''
  currentTurn.value = 1; moveHistory.value = []; draw()
}

function cloneBoardState(): number[][] {
  return board.map(row => [...row])
}

function saveHistorySnapshot() {
  moveHistory.value.push({
    board: cloneBoardState(),
    currentTurn: currentTurn.value,
    lastMove: lastMove.value ? [...lastMove.value] as [number, number] : null,
  })
}

function undoMove() {
  const snapshot = moveHistory.value.pop()
  if (!snapshot) return
  if (aiTimer) {
    clearTimeout(aiTimer)
    aiTimer = 0
  }
  board = snapshot.board.map(row => [...row])
  currentTurn.value = snapshot.currentTurn
  lastMove.value = snapshot.lastMove
  gameOverMsg.value = ''
  draw()
}

async function notifyFriendGameCreated(friend: ICharacter) {
  aiRequestState.value = 'waiting'
  try {
    await chatStore.initChat(friend.id)
    await chatStore.sendMessage(`我创建了一局五子棋并邀请你对弈。请以${friend.name}的口吻简短回应是否接受邀请，并给出一句开局态度。`)
    aiRequestState.value = 'sent'
  } catch {
    aiRequestState.value = 'idle'
  }
}

// Affinity (shared system)
function getAffinityMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('echo_affinity') || '{}') } catch { return {} }
}
function getAffinity(charId: string): number {
  const map = getAffinityMap()
  if (map[charId] !== undefined) return map[charId]
  const sessions = chatStore.sessions.filter(s => s.characterId === charId)
  let msgs = 0; for (const s of sessions) msgs += s.messageCount
  const val = Math.min(100, 20 + msgs)
  setAffinity(charId, val); return val
}
function setAffinity(charId: string, val: number) {
  const map = getAffinityMap()
  map[charId] = Math.max(0, Math.min(100, val))
  localStorage.setItem('echo_affinity', JSON.stringify(map))
}
function addAffinity(charId: string, delta: number) { setAffinity(charId, getAffinity(charId) + delta) }

function saveGameRecord(opponent: string, result: string) {
  const key = 'echo_game_records'
  let records: Record<string, string> = {}
  try { records = JSON.parse(localStorage.getItem(key) || '{}') } catch { records = {} }
  const gameKey = 'gomoku'
  const score = result === '胜利' ? 3 : result === '和棋' ? 1 : 0
  const existing = records[gameKey]
  if (existing) {
    const es = existing.includes('胜利') ? 3 : existing.includes('和棋') ? 1 : 0
    if (score > es) records[gameKey] = `五子棋 vs ${opponent}：${result}（${new Date().toLocaleDateString()}）`
  } else {
    records[gameKey] = `五子棋 vs ${opponent}：${result}（${new Date().toLocaleDateString()}）`
  }
  localStorage.setItem(key, JSON.stringify(records))
}

function endGame(msg: string) {
  gameOverMsg.value = msg
  if (mode.value === 'ai-friend' && friendCharacter) {
    addAffinity(friendCharacter.id, 1)
    const result = msg.includes('赢') ? '胜利' : msg.includes('输') ? '失败' : '和棋'
    saveGameRecord(friendCharacter.name, result)
  } else if (mode.value === 'local') {
    const result = msg.includes('赢') ? '胜利' : msg.includes('输') ? '失败' : '和棋'
    saveGameRecord('内置引擎', result)
  }
}

function resign() { endGame('你认输了') }

function offerDraw() {
  if (gameOverMsg.value) return
  if (mode.value === 'local') { endGame('和棋（双方同意）'); return }
  if (friendCharacter) {
    const aff = getAffinity(friendCharacter.id)
    if (aff > 40) endGame(`和棋（${friendCharacter.name}同意了，好感度 ${aff}）`)
    else { gameOverMsg.value = `${friendCharacter.name}拒绝了求和（好感度 ${aff}，需 > 40）`; setTimeout(() => { if (gameOverMsg.value?.includes('拒绝')) gameOverMsg.value = '' }, 2000) }
  }
}

// --- Board click ---
function getCell(x: number, y: number): [number, number] {
  const col = Math.round((x - cellSize) / cellSize)
  const row = Math.round((y - cellSize) / cellSize)
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return [-1, -1]
  return [row, col]
}

function onClickBoard(e: MouseEvent) {
  if (!isPlayerTurn.value || gameOverMsg.value) return
  const rect = canvas.value!.getBoundingClientRect()
  const [r, c] = getCell(e.clientX - rect.left, e.clientY - rect.top)
  if (r < 0 || board[r][c] !== 0) return
  saveHistorySnapshot()
  placePiece(r, c)
}

function onTouchBoard(e: TouchEvent) {
  if (!isPlayerTurn.value || gameOverMsg.value) return
  const rect = canvas.value!.getBoundingClientRect()
  const t = e.changedTouches[0]
  const [r, c] = getCell(t.clientX - rect.left, t.clientY - rect.top)
  if (r < 0 || board[r][c] !== 0) return
  saveHistorySnapshot()
  placePiece(r, c)
}

function placePiece(r: number, c: number) {
  board[r][c] = currentTurn.value
  lastMove.value = [r, c]
  draw()
  if (checkWin(r, c, currentTurn.value)) {
    endGame(currentTurn.value === playerColor.value ? '你赢了！' : '你输了！')
    return
  }
  if (isBoardFull()) { endGame('和棋（棋盘已满）'); return }
  currentTurn.value = currentTurn.value === 1 ? -1 : 1
  if (currentTurn.value !== playerColor.value) aiTimer = window.setTimeout(doAiMove, 350)
}

function doAiMove() {
  if (gameOverMsg.value) return
  const move = findBestMove(difficulty.value)
  if (!move) { endGame('和棋'); return }
  placePiece(move[0], move[1])
}

// --- Win check ---
function checkWin(r: number, c: number, p: number): boolean {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (let i = 1; i < 5; i++) { const nr = r + dr * i, nc = c + dc * i; if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== p) break; count++ }
    for (let i = 1; i < 5; i++) { const nr = r - dr * i, nc = c - dc * i; if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board[nr][nc] !== p) break; count++ }
    if (count >= 5) return true
  }
  return false
}

function isBoardFull(): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 0) return false
  return true
}

// --- AI ---
function evaluateLine(p: number, count: number, openEnds: number): number {
  if (count >= 5) return 100000
  if (p === 0) return 0
  const sign = p === currentTurn.value ? 1 : -1
  if (count === 4) return openEnds === 2 ? 50000 * sign : 10000 * sign
  if (count === 3) return openEnds === 2 ? 5000 * sign : 500 * sign
  if (count === 2) return openEnds === 2 ? 200 * sign : 50 * sign
  if (count === 1) return openEnds === 2 ? 20 * sign : 5 * sign
  return 0
}

function evaluatePosition(): number {
  let score = 0
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const er = r + dr * 4, ec = c + dc * 4
        if (er < 0 || er >= SIZE || ec < 0 || ec >= SIZE) continue
        let black = 0, white = 0, open = 0
        for (let i = 0; i < 5; i++) {
          const v = board[r + dr * i][c + dc * i]
          if (v === 1) black++; else if (v === -1) white++; else open++
        }
        if (black > 0 && white === 0) score += evaluateLine(1, black, open)
        else if (white > 0 && black === 0) score += evaluateLine(-1, white, open)
      }
    }
  }
  return score
}

function getCandidates(): [number, number][] {
  const set = new Set<string>()
  const range = 2
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) continue
      for (let dr = -range; dr <= range; dr++) {
        for (let dc = -range; dc <= range; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === 0) set.add(`${nr},${nc}`)
        }
      }
    }
  }
  if (set.size === 0) return [[7, 7]]
  return [...set].map(s => s.split(',').map(Number) as [number, number])
}

function findBestMove(diff: number): [number, number] | null {
  const cands = getCandidates()
  if (cands.length === 0) return null

  // Check immediate win or block
  for (const [r, c] of cands) {
    board[r][c] = currentTurn.value
    if (checkWin(r, c, currentTurn.value)) { board[r][c] = 0; return [r, c] }
    board[r][c] = 0
  }
  const opp = currentTurn.value === 1 ? -1 : 1
  for (const [r, c] of cands) {
    board[r][c] = opp
    if (checkWin(r, c, opp)) { board[r][c] = 0; return [r, c] }
    board[r][c] = 0
  }

  if (diff === 1) return cands[Math.floor(Math.random() * cands.length)]

  // Score each candidate
  const depth = diff <= 2 ? 0 : diff <= 3 ? 1 : 2
  let best: [number, number] = cands[0]
  let bestScore = -Infinity

  for (const [r, c] of cands) {
    board[r][c] = currentTurn.value
    let score: number
    if (depth === 0) {
      score = evaluatePosition()
    } else {
      score = minimax(depth - 1, -Infinity, Infinity, false)
    }
    board[r][c] = 0
    const noise = diff <= 2 ? (Math.random() - 0.5) * 100 : diff <= 3 ? (Math.random() - 0.5) * 30 : 0
    if (score + noise > bestScore) { bestScore = score + noise; best = [r, c] }
  }
  return best
}

function minimax(depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0) return evaluatePosition()
  const cands = getCandidates()
  if (cands.length === 0) return evaluatePosition()
  const side = maximizing ? currentTurn.value : (currentTurn.value === 1 ? -1 : 1)

  // Check immediate wins
  for (const [r, c] of cands) {
    board[r][c] = side
    if (checkWin(r, c, side)) { board[r][c] = 0; return maximizing ? 99999 : -99999 }
    board[r][c] = 0
  }

  // Limit candidates for performance
  const limited = cands.slice(0, 15)

  if (maximizing) {
    let max = -Infinity
    for (const [r, c] of limited) {
      board[r][c] = side
      const val = minimax(depth - 1, alpha, beta, false)
      board[r][c] = 0
      max = Math.max(max, val); alpha = Math.max(alpha, val)
      if (beta <= alpha) break
    }
    return max
  } else {
    let min = Infinity
    for (const [r, c] of limited) {
      board[r][c] = side
      const val = minimax(depth - 1, alpha, beta, true)
      board[r][c] = 0
      min = Math.min(min, val); beta = Math.min(beta, val)
      if (beta <= alpha) break
    }
    return min
  }
}

// --- Drawing ---
function draw() {
  if (!ctx) return
  const c = ctx
  c.fillStyle = '#1a2e24'
  c.fillRect(0, 0, canvasSize, canvasSize)

  // Grid lines
  c.strokeStyle = 'rgba(255,255,255,0.12)'
  c.lineWidth = 0.5
  for (let i = 0; i < SIZE; i++) {
    const p = cellSize * (i + 1)
    c.beginPath(); c.moveTo(cellSize, p); c.lineTo(cellSize * SIZE, p); c.stroke()
    c.beginPath(); c.moveTo(p, cellSize); c.lineTo(p, cellSize * SIZE); c.stroke()
  }

  // Star points
  const stars = [3, 7, 11]
  c.fillStyle = 'rgba(255,255,255,0.2)'
  for (const r of stars) for (const cc of stars) {
    c.beginPath(); c.arc(cellSize * (cc + 1), cellSize * (r + 1), 2.5, 0, Math.PI * 2); c.fill()
  }

  // Last move highlight
  if (lastMove.value) {
    const [lr, lc] = lastMove.value
    c.fillStyle = 'rgba(250, 204, 21, 0.15)'
    c.fillRect(cellSize * (lc + 1) - cellSize / 2, cellSize * (lr + 1) - cellSize / 2, cellSize, cellSize)
  }

  // Pieces
  for (let r = 0; r < SIZE; r++) {
    for (let cc = 0; cc < SIZE; cc++) {
      if (board[r][cc] === 0) continue
      const x = cellSize * (cc + 1), y = cellSize * (r + 1)
      const radius = cellSize * 0.4
      if (board[r][cc] === 1) {
        const grad = c.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius)
        grad.addColorStop(0, '#555'); grad.addColorStop(1, '#111')
        c.fillStyle = grad
      } else {
        const grad = c.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius)
        grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#bbb')
        c.fillStyle = grad
      }
      c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill()
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.5; c.stroke()
    }
  }
}

onMounted(() => {
  characterStore.loadCharacters()
  chatStore.loadSessions?.()
  ctx = canvas.value?.getContext('2d') ?? null
})

onBeforeUnmount(() => { if (aiTimer) clearTimeout(aiTimer) })

// Re-draw when game starts (canvas becomes visible)
import { watch } from 'vue'
watch(gameStarted, (v) => { if (v) requestAnimationFrame(() => { ctx = canvas.value?.getContext('2d') ?? null; draw() }) })
</script>

<style lang="scss" scoped>
/* Reuse chess styles for mode/friend/diff screens */
.gomoku-page { width: 100%; max-width: 480px; margin: 0 auto; }
.mode-screen { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
.mode-title { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: var(--text-primary); text-align: center; }
.mode-card {
  display: flex; align-items: center; gap: 16px; width: 100%; padding: 20px;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
  background: rgba(255,255,255,0.03); color: var(--text-primary); font: inherit;
  cursor: pointer; text-align: left; transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: rgba(56,189,248,0.3); background: rgba(56,189,248,0.06); }
}
.mode-icon {
  display: flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: 7px;
  background: rgba(56,189,248,0.1); color: rgba(56,189,248,0.7); flex-shrink: 0;
}
.engine-icon { background: rgba(168,85,247,0.1); color: rgba(168,85,247,0.7); }
.mode-text { display: flex; flex-direction: column; gap: 4px; }
.mode-name { font-size: 16px; font-weight: 600; }
.mode-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; }

.friend-screen, .diff-screen { padding: 16px; }
.friend-header, .diff-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; h3 { margin: 0; font-size: 16px; color: var(--text-primary); } }
.empty-friends { padding: 40px 20px; text-align: center; color: var(--text-tertiary); font-size: 14px; }
.friend-list { display: flex; flex-direction: column; gap: 6px; }
.friend-item {
  display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px;
  border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;
  background: rgba(255,255,255,0.02); color: var(--text-primary); font: inherit;
  cursor: pointer; text-align: left; transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.05); }
}
.friend-avatar {
  width: 36px; height: 36px; border-radius: 50%; background: rgba(56,189,248,0.1);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  flex-shrink: 0; font-size: 14px; font-weight: 600; color: rgba(56,189,248,0.7);
  img { width: 100%; height: 100%; object-fit: cover; }
}
.friend-name { flex: 1; font-size: 14px; }
.friend-arrow { color: var(--text-tertiary); flex-shrink: 0; }
.diff-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.diff-card {
  display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 14px 16px;
  border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;
  background: rgba(255,255,255,0.02); color: var(--text-primary); font: inherit;
  cursor: pointer; text-align: left; transition: border-color 0.2s, background 0.2s;
  &.selected { border-color: rgba(56,189,248,0.4); background: rgba(56,189,248,0.08); }
  &:hover { border-color: rgba(56,189,248,0.2); }
}
.diff-name { font-size: 15px; font-weight: 600; }
.diff-desc { font-size: 12px; color: var(--text-tertiary); }
.start-btn {
  width: 100%; padding: 14px; border: none; border-radius: 6px;
  background: var(--interactive-gradient); color: #fff; font: inherit;
  font-size: 15px; font-weight: 600; cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.back-btn-sm {
  padding: 6px 14px; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px;
  background: transparent; color: var(--text-secondary); font: inherit; font-size: 13px;
  cursor: pointer; &:hover { background: rgba(255,255,255,0.05); }
}

/* Game */
.game-screen { display: flex; flex-direction: column; gap: 12px; }
.game-info-bar { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.opponent-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.action-btns { display: flex; gap: 6px; flex: 1; }
.action-sm { padding: 4px 12px; border-radius: 4px; font: inherit; font-size: 12px; cursor: pointer; transition: background 0.15s; }
.draw-btn { border: 1px solid rgba(250,204,21,0.2); background: transparent; color: rgba(250,204,21,0.7); &:hover { background: rgba(250,204,21,0.08); } }
.resign-btn { border: 1px solid rgba(248,113,113,0.2); background: transparent; color: rgba(248,113,113,0.7); &:hover { background: rgba(248,113,113,0.08); } }
.turn-indicator {
  font-size: 12px; color: var(--text-tertiary); padding: 3px 10px; border-radius: 999px;
  background: rgba(255,255,255,0.04); margin-left: auto;
  &.active { background: rgba(52,211,153,0.12); color: rgba(52,211,153,0.8); }
}
.board-wrapper { display: flex; justify-content: center; }
.board-canvas {
  border-radius: 4px; border: 2px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4); max-width: 100%;
}
.game-action-panel { display: flex; gap: 8px; }
.action-wide {
  flex: 1; min-height: 42px; border-radius: 5px;
  border: 1px solid rgba(56,189,248,0.18);
  background: rgba(56,189,248,0.08);
  color: rgba(125,211,252,0.86);
  font: inherit; font-weight: 600; cursor: pointer;
  &:disabled { opacity: 0.42; cursor: not-allowed; }
}
.ai-waiting-card {
  padding: 10px 12px; border: 1px solid rgba(52,211,153,0.14);
  border-radius: 5px; background: rgba(52,211,153,0.08);
  color: rgba(110,231,183,0.9); font-size: 13px; text-align: center;
}
.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center;
  justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
}
.overlay-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  width: min(100vw, 520px); min-height: 220px; padding: 32px 22px;
  background: #0c1e2e; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0; box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}
.overlay-title { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }

.overlay-card .start-btn,
.overlay-card .back-btn-sm {
  width: min(280px, 100%);
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
}
</style>
