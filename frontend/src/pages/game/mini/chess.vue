<template>
  <div class="chess-page">
    <!-- Mode selection screen -->
    <div v-if="!mode" class="mode-screen">
      <h2 class="mode-title">选择对弈模式</h2>

      <button type="button" class="mode-card" @click="selectAiFriend">
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" width="28" height="28"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </div>
        <div class="mode-text">
          <span class="mode-name">邀请AI好友</span>
          <span class="mode-desc">从好友列表中选择角色对弈（不含星标）</span>
        </div>
      </button>

      <button type="button" class="mode-card" @click="selectLocalEngine">
        <div class="mode-icon engine-icon">
          <svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7zM9 21h6M10 17v4M14 17v4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </div>
        <div class="mode-text">
          <span class="mode-name">内置引擎</span>
          <span class="mode-desc">本地算法对弈，可选择难度</span>
        </div>
      </button>
    </div>

    <!-- Friend picker -->
    <div v-else-if="mode === 'ai-friend' && !gameStarted" class="friend-screen">
      <div class="friend-header">
        <button type="button" class="back-btn-sm" @click="mode = null">返回</button>
        <h3>选择AI好友</h3>
      </div>
      <div v-if="friends.length === 0" class="empty-friends">
        <p>暂无好友。请先将角色加入好友列表。</p>
      </div>
      <div v-else class="friend-list">
        <button v-for="f in friends" :key="f.id" type="button" class="friend-item" @click="startWithFriend(f)">
          <div class="friend-avatar">
            <img v-if="f.avatar" :src="f.avatar" @error="($event.target as HTMLImageElement).style.display = 'none'" />
            <span v-else>{{ f.name.charAt(0) }}</span>
          </div>
          <span class="friend-name">{{ f.name }}</span>
          <svg class="friend-arrow" viewBox="0 0 24 24" width="16" height="16"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" /></svg>
        </button>
      </div>
    </div>

    <!-- Difficulty picker -->
    <div v-else-if="mode === 'local' && !gameStarted" class="diff-screen">
      <div class="diff-header">
        <button type="button" class="back-btn-sm" @click="mode = null">返回</button>
        <h3>选择难度</h3>
      </div>
      <div class="diff-list">
        <button v-for="d in difficulties" :key="d.level" type="button" class="diff-card" :class="{ selected: difficulty === d.level }" @click="difficulty = d.level">
          <span class="diff-name">{{ d.name }}</span>
          <span class="diff-desc">{{ d.desc }}</span>
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
        <span class="turn-indicator" :class="{ active: isPlayerTurn }">{{ isPlayerTurn ? '你的回合' : '对手思考中…' }}</span>
      </div>

      <div class="board-wrapper">
        <div class="board">
          <template v-for="(row, r) in 8" :key="r">
            <div v-for="(col, c) in 8" :key="c"
              class="square"
              :class="squareClass(r, c)"
              @click="clickSquare(r, c)"
            >
              <span v-if="board[r][c]" class="piece" :class="pieceColor(board[r][c])">{{ pieceSymbol(board[r][c]) }}</span>
            </div>
          </template>
        </div>
      </div>

      <div class="game-action-panel">
        <button type="button" class="action-wide undo-btn" :disabled="moveHistory.length === 0 || !isPlayerTurn || !!gameOverMsg" @click="undoMove">悔棋</button>
      </div>

      <div v-if="aiRequestState !== 'idle'" class="ai-waiting-card">
        {{ aiRequestState === 'waiting' ? '正在邀请角色进入对局…' : '角色已收到对局邀请' }}
      </div>

      <div class="captured-area">
        <span class="captured-label">已吃：</span>
        <span v-for="(p, i) in capturedByPlayer" :key="'cp' + i" class="captured-piece">{{ pieceSymbol(p) }}</span>
        <span class="captured-sep">|</span>
        <span v-for="(p, i) in capturedByOpponent" :key="'co' + i" class="captured-piece opponent">{{ pieceSymbol(p) }}</span>
      </div>

      <!-- Game over -->
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

// Chess piece types: positive = white, negative = black
// 1=pawn, 2=knight, 3=bishop, 4=rook, 5=queen, 6=king
type Piece = number
type BoardState = Piece[][]

const characterStore = useCharacterStore()
const chatStore = useChatStore()

const mode = ref<'ai-friend' | 'local' | null>(null)
const gameStarted = ref(false)
const difficulty = ref(0)
const opponentName = ref('引擎')
const board = ref<BoardState>(initialBoard())
const selectedSquare = ref<[number, number] | null>(null)
const validMoves = ref<[number, number][]>([])
const playerColor = ref<1 | -1>(1) // 1=white, -1=black
const currentTurn = ref<1 | -1>(1)
const gameOverMsg = ref('')
const capturedByPlayer = ref<number[]>([])
const capturedByOpponent = ref<number[]>([])
const lastMove = ref<{ from: [number, number]; to: [number, number] } | null>(null)
const moveHistory = ref<Array<{
  board: BoardState
  currentTurn: 1 | -1
  capturedByPlayer: number[]
  capturedByOpponent: number[]
  lastMove: { from: [number, number]; to: [number, number] } | null
}>>([])
const aiRequestState = ref<'idle' | 'waiting' | 'sent'>('idle')
let friendCharacter: ICharacter | null = null
let aiTimer = 0

const friends = computed(() =>
  characterStore.friendCharacters.filter(c => !c.isFavorite),
)

const difficulties = [
  { level: 1, name: '入门', desc: '随机走棋，偶尔好棋' },
  { level: 2, name: '简单', desc: '基本战术意识' },
  { level: 3, name: '中等', desc: '评估局面，规划组合' },
  { level: 4, name: '困难', desc: '深度搜索，精确计算' },
]

const isPlayerTurn = computed(() => currentTurn.value === playerColor.value)

function initialBoard(): BoardState {
  return [
    [-4, -2, -3, -5, -6, -3, -2, -4],
    [-1, -1, -1, -1, -1, -1, -1, -1],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [4, 2, 3, 5, 6, 3, 2, 4],
  ]
}

function pieceSymbol(p: Piece): string {
  const symbols: Record<number, string> = {
    1: '♙', 2: '♘', 3: '♗', 4: '♖', 5: '♕', 6: '♔',
    [-1]: '♟', [-2]: '♞', [-3]: '♝', [-4]: '♜', [-5]: '♛', [-6]: '♚',
  }
  return symbols[p] || ''
}

function pieceColor(p: Piece): string {
  return p > 0 ? 'white-piece' : 'black-piece'
}

function squareClass(r: number, c: number): string {
  const isLight = (r + c) % 2 === 0
  const classes: string[] = [isLight ? 'light' : 'dark']
  if (selectedSquare.value?.[0] === r && selectedSquare.value?.[1] === c) classes.push('selected')
  if (validMoves.value.some(([vr, vc]) => vr === r && vc === c)) classes.push('valid-move')
  if (lastMove.value) {
    const { from, to } = lastMove.value
    if ((from[0] === r && from[1] === c) || (to[0] === r && to[1] === c)) classes.push('last-move')
  }
  return classes.join(' ')
}

function selectAiFriend() {
  mode.value = 'ai-friend'
}

function selectLocalEngine() {
  mode.value = 'local'
}

function startWithFriend(f: ICharacter) {
  friendCharacter = f
  opponentName.value = f.name
  playerColor.value = 1
  currentTurn.value = 1
  board.value = initialBoard()
  selectedSquare.value = null
  validMoves.value = []
  lastMove.value = null
  capturedByPlayer.value = []
  capturedByOpponent.value = []
  moveHistory.value = []
  gameOverMsg.value = ''
  gameStarted.value = true
  notifyFriendGameCreated(f)
}

function startLocal() {
  opponentName.value = `引擎 (${difficulties[difficulty.value - 1].name})`
  playerColor.value = 1
  currentTurn.value = 1
  board.value = initialBoard()
  selectedSquare.value = null
  validMoves.value = []
  lastMove.value = null
  capturedByPlayer.value = []
  capturedByOpponent.value = []
  moveHistory.value = []
  aiRequestState.value = 'idle'
  gameOverMsg.value = ''
  gameStarted.value = true
}

function clickSquare(r: number, c: number) {
  if (!isPlayerTurn.value || gameOverMsg.value) return

  const piece = board.value[r][c]

  // If a piece is selected and clicking a valid move
  if (selectedSquare.value) {
    const isValid = validMoves.value.some(([vr, vc]) => vr === r && vc === c)
    if (isValid) {
      saveHistorySnapshot()
      movePiece(selectedSquare.value[0], selectedSquare.value[1], r, c)
      selectedSquare.value = null
      validMoves.value = []
      return
    }
  }

  // Select own piece
  if (piece && Math.sign(piece) === playerColor.value) {
    selectedSquare.value = [r, c]
    validMoves.value = getLegalMoves(board.value, r, c, playerColor.value)
  } else {
    selectedSquare.value = null
    validMoves.value = []
  }
}

function saveHistorySnapshot() {
  moveHistory.value.push({
    board: cloneBoard(board.value),
    currentTurn: currentTurn.value,
    capturedByPlayer: [...capturedByPlayer.value],
    capturedByOpponent: [...capturedByOpponent.value],
    lastMove: lastMove.value ? { from: [...lastMove.value.from] as [number, number], to: [...lastMove.value.to] as [number, number] } : null,
  })
}

function undoMove() {
  const snapshot = moveHistory.value.pop()
  if (!snapshot) return
  if (aiTimer) {
    clearTimeout(aiTimer)
    aiTimer = 0
  }
  board.value = cloneBoard(snapshot.board)
  currentTurn.value = snapshot.currentTurn
  capturedByPlayer.value = [...snapshot.capturedByPlayer]
  capturedByOpponent.value = [...snapshot.capturedByOpponent]
  lastMove.value = snapshot.lastMove
  selectedSquare.value = null
  validMoves.value = []
  gameOverMsg.value = ''
}

async function notifyFriendGameCreated(friend: ICharacter) {
  aiRequestState.value = 'waiting'
  try {
    await chatStore.initChat(friend.id)
    await chatStore.sendMessage(`我创建了一局国际象棋并邀请你对弈。请以${friend.name}的口吻简短回应是否接受邀请，并给出一句开局态度。`)
    aiRequestState.value = 'sent'
  } catch {
    aiRequestState.value = 'idle'
  }
}

function movePiece(fr: number, fc: number, tr: number, tc: number) {
  lastMove.value = { from: [fr, fc], to: [tr, tc] }
  const captured = board.value[tr][tc]
  if (captured) {
    if (Math.sign(captured) === playerColor.value) {
      capturedByOpponent.value.push(captured)
    } else {
      capturedByPlayer.value.push(captured)
    }
  }

  board.value[tr][tc] = board.value[fr][fc]
  board.value[fr][fc] = 0

  // Pawn promotion (auto queen)
  if (board.value[tr][tc] === 1 && tr === 0) board.value[tr][tc] = 5
  if (board.value[tr][tc] === -1 && tr === 7) board.value[tr][tc] = -5

  // Check if king captured
  if (Math.abs(captured) === 6) {
    endGame(Math.sign(captured) === playerColor.value ? '你输了！' : '你赢了！')
    return
  }

  currentTurn.value = currentTurn.value === 1 ? -1 : 1

  // Check for checkmate/stalemate
  if (isCheckmate(board.value, currentTurn.value)) {
    endGame(currentTurn.value === playerColor.value ? '将杀！你输了' : '将杀！你赢了')
    return
  }

  if (isStalemate(board.value, currentTurn.value)) {
    endGame('和棋（逼和）')
    return
  }

  // AI move
  if (currentTurn.value !== playerColor.value) {
    aiTimer = window.setTimeout(doAiMove, 400)
  }
}

function doAiMove() {
  if (gameOverMsg.value) return
  const aiSide = currentTurn.value
  const move = findBestMove(board.value, aiSide, difficulty.value)
  if (!move) {
    endGame(isCheckmate(board.value, aiSide) ? '将杀！你赢了' : '和棋')
    return
  }
  movePiece(move.fr, move.fc, move.tr, move.tc)
}

// --- Move generation ---

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8
}

function getPseudoMoves(b: BoardState, r: number, c: number): [number, number][] {
  const piece = b[r][c]
  if (!piece) return []
  const color = Math.sign(piece)
  const type = Math.abs(piece)
  const moves: [number, number][] = []
  const enemy = (nr: number, nc: number) => b[nr][nc] !== 0 && Math.sign(b[nr][nc]) !== color
  const empty = (nr: number, nc: number) => b[nr][nc] === 0
  const canGo = (nr: number, nc: number) => empty(nr, nc) || enemy(nr, nc)

  if (type === 1) {
    const dir = color === 1 ? -1 : 1
    const startRow = color === 1 ? 6 : 1
    if (inBounds(r + dir, c) && empty(r + dir, c)) {
      moves.push([r + dir, c])
      if (r === startRow && empty(r + 2 * dir, c)) moves.push([r + 2 * dir, c])
    }
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc) && enemy(r + dir, c + dc)) moves.push([r + dir, c + dc])
    }
  }

  if (type === 2) {
    const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
    for (const [dr, dc] of jumps) {
      const nr = r + dr, nc = c + dc
      if (inBounds(nr, nc) && canGo(nr, nc)) moves.push([nr, nc])
    }
  }

  if (type === 3 || type === 5) {
    const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
    const maxDist = type === 3 ? 7 : 7 // bishop slides diag, queen slides all
    for (const [dr, dc] of (type === 3 ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : dirs)) {
      for (let dist = 1; dist <= maxDist; dist++) {
        const nr = r + dr * dist, nc = c + dc * dist
        if (!inBounds(nr, nc)) break
        if (empty(nr, nc)) { moves.push([nr, nc]); continue }
        if (enemy(nr, nc)) { moves.push([nr, nc]); break }
        break
      }
    }
  }

  if (type === 4 || type === 5) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (let dist = 1; dist <= 7; dist++) {
        const nr = r + dr * dist, nc = c + dc * dist
        if (!inBounds(nr, nc)) break
        if (empty(nr, nc)) { moves.push([nr, nc]); continue }
        if (enemy(nr, nc)) { moves.push([nr, nc]); break }
        break
      }
    }
  }

  if (type === 6) {
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
      const nr = r + dr, nc = c + dc
      if (inBounds(nr, nc) && canGo(nr, nc)) moves.push([nr, nc])
    }
  }

  return moves
}

function cloneBoard(b: BoardState): BoardState {
  return b.map(row => [...row])
}

function findKing(b: BoardState, color: number): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] === 6 * color) return [r, c]
  return [-1, -1]
}

function isSquareAttacked(b: BoardState, r: number, c: number, byColor: number): boolean {
  for (let br = 0; br < 8; br++)
    for (let bc = 0; bc < 8; bc++) {
      if (Math.sign(b[br][bc]) !== byColor) continue
      const moves = getPseudoMoves(b, br, bc)
      if (moves.some(([mr, mc]) => mr === r && mc === c)) return true
    }
  return false
}

function isInCheck(b: BoardState, color: number): boolean {
  const [kr, kc] = findKing(b, color)
  if (kr < 0) return false
  return isSquareAttacked(b, kr, kc, -color)
}

function getLegalMoves(b: BoardState, r: number, c: number, color: number): [number, number][] {
  const piece = b[r][c]
  if (!piece || Math.sign(piece) !== color) return []
  return getPseudoMoves(b, r, c).filter(([tr, tc]) => {
    const nb = cloneBoard(b)
    nb[tr][tc] = nb[r][c]
    nb[r][c] = 0
    return !isInCheck(nb, color)
  })
}

function hasAnyLegalMove(b: BoardState, color: number): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (Math.sign(b[r][c]) === color && getLegalMoves(b, r, c, color).length > 0) return true
  return false
}

function isCheckmate(b: BoardState, color: number): boolean {
  return isInCheck(b, color) && !hasAnyLegalMove(b, color)
}

function isStalemate(b: BoardState, color: number): boolean {
  return !isInCheck(b, color) && !hasAnyLegalMove(b, color)
}

// --- AI Engine ---

const PIECE_VALUES: Record<number, number> = {
  1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 20000,
}

// Piece-square tables for positional evaluation (simplified)
const PST_PAWN = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
]

const PST_KNIGHT = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
]

function evaluate(b: BoardState, forColor: number): number {
  let score = 0
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = b[r][c]
      if (!p) continue
      const color = Math.sign(p)
      const type = Math.abs(p)
      const val = PIECE_VALUES[type] || 0
      let posBonus = 0
      if (type === 1) posBonus = color === 1 ? PST_PAWN[7 - r][c] : PST_PAWN[r][c]
      else if (type === 2) posBonus = color === 1 ? PST_KNIGHT[7 - r][c] : PST_KNIGHT[r][c]
      score += color * (val + posBonus)
    }
  return score * forColor
}

interface Move { fr: number; fc: number; tr: number; tc: number; score?: number }

function getAllMoves(b: BoardState, color: number): Move[] {
  const moves: Move[] = []
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if (Math.sign(b[r][c]) !== color) continue
      for (const [tr, tc] of getLegalMoves(b, r, c, color)) {
        moves.push({ fr: r, fc: c, tr, tc })
      }
    }
  return moves
}

function applyMove(b: BoardState, m: Move): BoardState {
  const nb = cloneBoard(b)
  nb[m.tr][m.tc] = nb[m.fr][m.fc]
  nb[m.fr][m.fc] = 0
  // Auto-queen
  if (nb[m.tr][m.tc] === 1 && m.tr === 0) nb[m.tr][m.tc] = 5
  if (nb[m.tr][m.tc] === -1 && m.tr === 7) nb[m.tr][m.tc] = -5
  return nb
}

function minimax(b: BoardState, color: number, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0) return evaluate(b, color)
  const moves = getAllMoves(b, maximizing ? color : -color)
  if (moves.length === 0) {
    if (isInCheck(b, maximizing ? color : -color)) return maximizing ? -99999 : 99999
    return 0
  }

  // Sort: captures first for better pruning
  moves.sort((a, b2) => {
    const captA = Math.abs(b[a.tr][a.tc])
    const captB = Math.abs(b[b2.tr][b2.tc])
    return captB - captA
  })

  if (maximizing) {
    let maxEval = -Infinity
    for (const m of moves) {
      const val = minimax(applyMove(b, m), color, depth - 1, alpha, beta, false)
      maxEval = Math.max(maxEval, val)
      alpha = Math.max(alpha, val)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (const m of moves) {
      const val = minimax(applyMove(b, m), color, depth - 1, alpha, beta, true)
      minEval = Math.min(minEval, val)
      beta = Math.min(beta, val)
      if (beta <= alpha) break
    }
    return minEval
  }
}

function findBestMove(b: BoardState, color: number, diff: number): Move | null {
  const moves = getAllMoves(b, color)
  if (moves.length === 0) return null

  if (diff === 1) {
    // Random with slight preference for captures
    const captures = moves.filter(m => b[m.tr][m.tc] !== 0)
    const pool = captures.length > 0 && Math.random() > 0.3 ? captures : moves
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const depth = diff <= 2 ? 1 : diff <= 3 ? 2 : 3

  let bestMove = moves[0]
  let bestScore = -Infinity

  for (const m of moves) {
    const nb = applyMove(b, m)
    const score = minimax(nb, color, depth - 1, -Infinity, Infinity, false)
    // Add randomness for lower difficulties
    const noise = diff <= 2 ? (Math.random() - 0.5) * 200 : diff <= 3 ? (Math.random() - 0.5) * 50 : 0
    if (score + noise > bestScore) {
      bestScore = score + noise
      bestMove = m
    }
  }

  return bestMove
}

function resign() {
  endGame('你认输了')
}

function offerDraw() {
  if (gameOverMsg.value) return
  if (mode.value === 'local') {
    endGame('和棋（双方同意）')
    return
  }
  if (friendCharacter) {
    const affinity = getAffinity(friendCharacter.id)
    if (affinity > 40) {
      endGame(`和棋（${friendCharacter.name}同意了，好感度 ${affinity}）`)
    } else {
      gameOverMsg.value = `${friendCharacter.name}拒绝了求和（好感度 ${affinity}，需 > 40）`
      setTimeout(() => { if (gameOverMsg.value?.includes('拒绝')) gameOverMsg.value = '' }, 2000)
    }
  }
}

// Shared affinity system (same as chat.vue)
function getAffinityMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem('echo_affinity') || '{}') } catch { return {} }
}
function getAffinity(charId: string): number {
  const map = getAffinityMap()
  if (map[charId] !== undefined) return map[charId]
  const sessions = chatStore.sessions.filter(s => s.characterId === charId)
  let msgs = 0
  for (const s of sessions) msgs += s.messageCount
  const val = Math.min(100, 20 + msgs)
  setAffinity(charId, val)
  return val
}
function setAffinity(charId: string, val: number) {
  const map = getAffinityMap()
  map[charId] = Math.max(0, Math.min(100, val))
  localStorage.setItem('echo_affinity', JSON.stringify(map))
}
function addAffinity(charId: string, delta: number) {
  const cur = getAffinity(charId)
  setAffinity(charId, cur + delta)
}

function calcAffinity(characterId: string): number {
  return getAffinity(characterId)
}

// Save game record as a document visible to all AI characters
function saveGameRecord(opponent: string, result: string) {
  const key = 'echo_game_records'
  let records: Record<string, string> = {}
  try { records = JSON.parse(localStorage.getItem(key) || '{}') } catch { records = {} }
  const gameKey = `chess`
  const score = result === '胜利' ? 3 : result === '和棋' ? 1 : 0
  const existing = records[gameKey]
  // Only replace if this result is better
  if (existing) {
    const existingScore = existing.includes('胜利') ? 3 : existing.includes('和棋') ? 1 : 0
    if (score > existingScore) {
      records[gameKey] = `国际象棋 vs ${opponent}：${result}（${new Date().toLocaleDateString()}）`
    }
  } else {
    records[gameKey] = `国际象棋 vs ${opponent}：${result}（${new Date().toLocaleDateString()}）`
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

function resetGame() {
  board.value = initialBoard()
  selectedSquare.value = null
  validMoves.value = []
  lastMove.value = null
  currentTurn.value = 1
  capturedByPlayer.value = []
  capturedByOpponent.value = []
  moveHistory.value = []
  gameOverMsg.value = ''
  if (currentTurn.value !== playerColor.value) {
    aiTimer = window.setTimeout(doAiMove, 400)
  }
}

onMounted(() => {
  characterStore.loadCharacters()
})

onBeforeUnmount(() => {
  if (aiTimer) clearTimeout(aiTimer)
})
</script>

<style lang="scss" scoped>
.chess-page {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

/* --- Mode screen --- */
.mode-screen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.mode-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  &:hover { border-color: rgba(56, 189, 248, 0.3); background: rgba(56, 189, 248, 0.06); }
}

.mode-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px; height: 52px;
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.1);
  color: rgba(56, 189, 248, 0.7);
  flex-shrink: 0;
}

.engine-icon {
  background: rgba(168, 85, 247, 0.1);
  color: rgba(168, 85, 247, 0.7);
}

.mode-text { display: flex; flex-direction: column; gap: 4px; }
.mode-name { font-size: 16px; font-weight: 600; }
.mode-desc { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; }

/* --- Friend picker --- */
.friend-screen { padding: 16px; }
.friend-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
}

.empty-friends {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
}

.friend-list { display: flex; flex-direction: column; gap: 6px; }

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  &:hover { background: rgba(255, 255, 255, 0.05); }
}

.friend-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(56, 189, 248, 0.7);
  img { width: 100%; height: 100%; object-fit: cover; }
}

.friend-name { flex: 1; font-size: 14px; }
.friend-arrow { color: var(--text-tertiary); flex-shrink: 0; }

/* --- Difficulty --- */
.diff-screen { padding: 16px; }
.diff-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  h3 { margin: 0; font-size: 16px; color: var(--text-primary); }
}

.diff-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }

.diff-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, background 0.2s;
  &.selected { border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.08); }
  &:hover { border-color: rgba(56, 189, 248, 0.2); }
}

.diff-name { font-size: 15px; font-weight: 600; }
.diff-desc { font-size: 12px; color: var(--text-tertiary); }

.start-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: var(--interactive-gradient);
  color: #fff;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.back-btn-sm {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.05); }
}

/* --- Game --- */
.game-screen { display: flex; flex-direction: column; gap: 12px; }

.game-info-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.opponent-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.action-btns {
  display: flex;
  gap: 6px;
  flex: 1;
  justify-content: flex-start;
}

.action-sm {
  padding: 4px 12px;
  border-radius: 8px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.draw-btn {
  border: 1px solid rgba(250, 204, 21, 0.2);
  background: transparent;
  color: rgba(250, 204, 21, 0.7);
  &:hover { background: rgba(250, 204, 21, 0.08); }
}

.resign-btn {
  border: 1px solid rgba(248, 113, 113, 0.2);
  background: transparent;
  color: rgba(248, 113, 113, 0.7);
  &:hover { background: rgba(248, 113, 113, 0.08); }
}

.turn-indicator {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  margin-left: auto;
  &.active {
    background: rgba(52, 211, 153, 0.12);
    color: rgba(52, 211, 153, 0.8);
  }
}

.board-wrapper {
  display: flex;
  justify-content: center;
}

.board {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  width: min(380px, calc(100vw - 48px));
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.square {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: background 0.1s;
  &.light { background: #2a4a3a; }
  &.dark { background: #1a2e24; }
  &.selected { background: rgba(56, 189, 248, 0.25) !important; }
  &.last-move { background: rgba(250, 204, 21, 0.18) !important; }
  &.valid-move::after {
    content: '';
    position: absolute;
    width: 30%;
    height: 30%;
    border-radius: 50%;
    background: rgba(52, 211, 153, 0.4);
  }
  &:active { opacity: 0.8; }
}

.piece {
  font-size: clamp(20px, 4.5vw, 32px);
  line-height: 1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  &.white-piece { color: #f0f0f0; }
  &.black-piece { color: #1a1a1a; text-shadow: 0 1px 3px rgba(255, 255, 255, 0.2); }
}

.captured-area {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 16px;
}

.game-action-panel {
  display: flex;
  gap: 8px;
}

.action-wide {
  flex: 1;
  min-height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(56, 189, 248, 0.18);
  background: rgba(56, 189, 248, 0.08);
  color: rgba(125, 211, 252, 0.86);
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }
}

.ai-waiting-card {
  padding: 10px 12px;
  border: 1px solid rgba(52, 211, 153, 0.14);
  border-radius: 10px;
  background: rgba(52, 211, 153, 0.08);
  color: rgba(110, 231, 183, 0.9);
  font-size: 13px;
  text-align: center;
}

.captured-label { font-size: 11px; color: var(--text-tertiary); margin-right: 4px; }
.captured-sep { color: rgba(255, 255, 255, 0.1); margin: 0 6px; }
.captured-piece { color: #f0f0f0; }
.captured-piece.opponent { color: #888; }

.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: min(100vw, 520px);
  min-height: 220px;
  justify-content: center;
  padding: 32px 22px;
  background: #0c1e2e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
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
