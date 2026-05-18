<template>
  <div class="cut-rope-game">
    <header class="game-head">
      <div class="title-block">
        <strong>糖果绳索</strong>
        <span>{{ activeLevel.title }} · {{ statusText }}</span>
      </div>
      <button type="button" class="soft-btn" @click="restartLevel">重来</button>
    </header>

    <section class="score-row">
      <div class="score-card primary">
        <span>得分</span>
        <strong>{{ totalScore }}</strong>
      </div>
      <div class="score-card">
        <span>星星</span>
        <strong>{{ collectedStars }}/{{ activeLevel.stars.length }}</strong>
      </div>
      <div class="score-card">
        <span>剩余</span>
        <strong>{{ timeLeft }}s</strong>
      </div>
      <div class="score-card">
        <span>关卡</span>
        <strong>{{ levelIndex + 1 }}/{{ LEVELS.length }}</strong>
      </div>
    </section>

    <section class="playfield-wrap">
      <svg
        class="playfield"
        viewBox="0 0 360 520"
        role="application"
        aria-label="割绳子游戏区域"
        @pointerdown="startSlice"
        @pointermove="moveSlice"
        @pointerup="endSlice"
        @pointercancel="endSlice"
      >
        <defs>
          <radialGradient id="candyGloss" cx="34%" cy="28%" r="72%">
            <stop offset="0%" stop-color="#fecdd3" />
            <stop offset="48%" stop-color="#fb7185" />
            <stop offset="100%" stop-color="#be123c" />
          </radialGradient>
          <linearGradient id="goalGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#22c55e" />
          </linearGradient>
        </defs>

        <rect width="360" height="520" rx="24" class="field-bg" />
        <path class="field-grid" d="M32 84H328M32 168H328M32 252H328M32 336H328M32 420H328M90 38V482M180 38V482M270 38V482" />

        <g class="goal">
          <circle :cx="activeLevel.goal.x" :cy="activeLevel.goal.y" :r="activeLevel.goal.radius + 10" />
          <circle class="goal-mouth" :cx="activeLevel.goal.x" :cy="activeLevel.goal.y" :r="activeLevel.goal.radius" />
          <path
            :d="`M ${activeLevel.goal.x - 18} ${activeLevel.goal.y - 4} Q ${activeLevel.goal.x} ${activeLevel.goal.y + 14} ${activeLevel.goal.x + 18} ${activeLevel.goal.y - 4}`"
            class="goal-smile"
          />
        </g>

        <g>
          <rect
            v-for="obstacle in activeLevel.obstacles"
            :key="`${obstacle.x}-${obstacle.y}`"
            class="obstacle"
            :x="obstacle.x"
            :y="obstacle.y"
            :width="obstacle.width"
            :height="obstacle.height"
            rx="8"
          />
        </g>

        <g>
          <circle
            v-for="bumper in activeLevel.bumpers"
            :key="`${bumper.x}-${bumper.y}`"
            class="bumper"
            :cx="bumper.x"
            :cy="bumper.y"
            :r="bumper.radius"
          />
        </g>

        <g>
          <g v-for="(star, index) in activeLevel.stars" :key="index" :class="{ collected: starCollected[index] }">
            <path class="star-halo" :d="starPath(star.x, star.y, 17, 8)" />
            <path class="star-core" :d="starPath(star.x, star.y, 12, 5.5)" />
          </g>
        </g>

        <g>
          <g v-for="rope in activeRopes" :key="rope.id" class="rope-group">
            <line class="rope-hit" :x1="rope.anchor.x" :y1="rope.anchor.y" :x2="candy.x" :y2="candy.y" @click.stop="cutRope(rope.id)" />
            <line class="rope-line" :x1="rope.anchor.x" :y1="rope.anchor.y" :x2="candy.x" :y2="candy.y" />
            <circle class="anchor" :cx="rope.anchor.x" :cy="rope.anchor.y" r="8" />
            <line
              class="anchor-spoke"
              :x1="rope.anchor.x - 5"
              :y1="rope.anchor.y"
              :x2="rope.anchor.x + 5"
              :y2="rope.anchor.y"
              :transform="`rotate(${pulleyRotation(rope)} ${rope.anchor.x} ${rope.anchor.y})`"
            />
          </g>
        </g>

        <g class="candy" :class="{ delivered: result === 'won' }">
          <circle :cx="candy.x" :cy="candy.y" :r="activeLevel.candy.radius + 5" class="candy-shadow" />
          <circle :cx="candy.x" :cy="candy.y" :r="activeLevel.candy.radius" class="candy-body" />
          <circle :cx="candy.x - 6" :cy="candy.y - 7" r="5" class="candy-shine" />
          <path :d="`M ${candy.x - 11} ${candy.y + 2} Q ${candy.x} ${candy.y + 12} ${candy.x + 11} ${candy.y + 2}`" class="candy-smile" />
        </g>

        <line
          v-if="sliceLine"
          class="slice-line"
          :x1="sliceLine.x1"
          :y1="sliceLine.y1"
          :x2="sliceLine.x2"
          :y2="sliceLine.y2"
        />
      </svg>

      <div v-if="isFinished" class="result-layer">
        <div class="result-card">
          <strong>{{ result === 'won' ? '糖果送达' : '本关失败' }}</strong>
          <p>{{ result === 'won' ? '糖果落进口袋，星星也被点亮了。' : '糖果没有进袋，调整切绳顺序再试一次。' }}</p>
          <div class="result-meta">
            <span>本关得分</span>
            <b>{{ levelScore }}</b>
          </div>
          <div class="result-actions">
            <button type="button" class="soft-btn" @click="restartLevel">重来</button>
            <button v-if="result === 'won'" type="button" class="primary-btn" @click="nextLevel">下一关</button>
          </div>
        </div>
      </div>
    </section>

    <section class="rope-panel">
      <button
        v-for="rope in activeLevel.ropes"
        :key="rope.id"
        type="button"
        class="rope-btn"
        :class="{ cut: !rope.active }"
        :disabled="!rope.active || isFinished"
        @click="cutRope(rope.id)"
      >
        {{ rope.active ? `切断 ${rope.id.toUpperCase()}` : `${rope.id.toUpperCase()} 已断` }}
      </button>
    </section>

    <footer class="game-foot">
      <span>划过绳子或点按绳子都可切断</span>
      <span>{{ activeLevel.hint }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

interface Point {
  x: number
  y: number
}

interface RopeState {
  id: string
  anchor: Point
  baseAnchor?: Point
  length: number
  active: boolean
  motion?: AnchorMotion
}

interface AnchorMotion {
  amplitudeX?: number
  amplitudeY?: number
  speed: number
  phase: number
}

interface Obstacle {
  x: number
  y: number
  width: number
  height: number
}

interface Bumper {
  x: number
  y: number
  radius: number
  power: number
}

interface CutRopeLevel {
  id: number
  title: string
  hint: string
  candy: Point & { radius: number }
  initialVelocity: Point
  ropes: RopeState[]
  goal: Point & { radius: number }
  stars: Point[]
  obstacles: Obstacle[]
  bumpers: Bumper[]
  moveLimit: number
  timeLimit: number
}

type GameResult = 'playing' | 'won' | 'lost'

const LEVELS: CutRopeLevel[] = [
  {
    id: 1,
    title: '摆起来再切',
    hint: '糖果已经偏在绳子一侧，等它摆到口袋上方再切。',
    candy: { x: 126, y: 164, radius: 18 },
    initialVelocity: { x: 1.1, y: 0 },
    ropes: [{ id: 'r1', anchor: { x: 184, y: 72 }, length: 110, active: true }],
    goal: { x: 232, y: 430, radius: 34 },
    stars: [
      { x: 148, y: 238 },
      { x: 214, y: 312 },
      { x: 236, y: 380 },
    ],
    obstacles: [],
    bumpers: [],
    moveLimit: 1,
    timeLimit: 45,
  },
  {
    id: 2,
    title: '双绳释放',
    hint: '先断一根绳制造摆动，再在合适角度断第二根。',
    candy: { x: 180, y: 166, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 112, y: 82 }, length: 104, active: true },
      { id: 'r2', anchor: { x: 248, y: 82 }, length: 104, active: true },
    ],
    goal: { x: 272, y: 420, radius: 34 },
    stars: [
      { x: 205, y: 232 },
      { x: 242, y: 314 },
      { x: 272, y: 372 },
    ],
    obstacles: [{ x: 88, y: 306, width: 120, height: 16 }],
    bumpers: [],
    moveLimit: 2,
    timeLimit: 50,
  },
  {
    id: 3,
    title: '弹跳垫',
    hint: '让糖果落到弹跳垫上，借反弹越过挡板。',
    candy: { x: 112, y: 156, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 78, y: 78 }, length: 92, active: true },
      { id: 'r2', anchor: { x: 220, y: 70 }, length: 132, active: true },
    ],
    goal: { x: 180, y: 432, radius: 34 },
    stars: [
      { x: 122, y: 246 },
      { x: 208, y: 306 },
      { x: 180, y: 382 },
    ],
    obstacles: [
      { x: 178, y: 248, width: 130, height: 16 },
      { x: 48, y: 350, width: 114, height: 16 },
    ],
    bumpers: [{ x: 262, y: 360, radius: 23, power: 1.18 }],
    moveLimit: 2,
    timeLimit: 55,
  },
  {
    id: 4,
    title: '移动吊点',
    hint: '上方吊点会左右移动，等摆幅够大时切断。',
    candy: { x: 180, y: 176, radius: 18 },
    initialVelocity: { x: 0.2, y: 0 },
    ropes: [
      {
        id: 'r1',
        anchor: { x: 180, y: 70 },
        length: 112,
        active: true,
        motion: { amplitudeX: 48, speed: 0.034, phase: 0 },
      },
    ],
    goal: { x: 94, y: 426, radius: 34 },
    stars: [
      { x: 138, y: 220 },
      { x: 106, y: 314 },
      { x: 94, y: 382 },
    ],
    obstacles: [
      { x: 142, y: 326, width: 148, height: 16 },
    ],
    bumpers: [{ x: 64, y: 350, radius: 20, power: 1.08 }],
    moveLimit: 1,
    timeLimit: 55,
  },
  {
    id: 5,
    title: '三绳转向',
    hint: '先切左绳，再切上绳，最后放开右绳让糖果落向右侧口袋。',
    candy: { x: 190, y: 170, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 102, y: 78 }, length: 126, active: true },
      { id: 'r2', anchor: { x: 236, y: 80 }, length: 102, active: true },
      { id: 'r3', anchor: { x: 296, y: 172 }, length: 108, active: true },
    ],
    goal: { x: 320, y: 432, radius: 34 },
    stars: [
      { x: 220, y: 238 },
      { x: 282, y: 318 },
      { x: 320, y: 384 },
    ],
    obstacles: [
      { x: 42, y: 286, width: 168, height: 16 },
      { x: 190, y: 370, width: 96, height: 16 },
    ],
    bumpers: [{ x: 310, y: 270, radius: 22, power: 1.12 }],
    moveLimit: 3,
    timeLimit: 60,
  },
  {
    id: 6,
    title: '钟摆连跳',
    hint: '先切 R1，等糖果被 R2 摆到右侧高点后再切 R2。',
    candy: { x: 84, y: 160, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      {
        id: 'r1',
        anchor: { x: 112, y: 68 },
        length: 100,
        active: true,
        motion: { amplitudeX: 34, amplitudeY: 10, speed: 0.04, phase: 1.2 },
      },
      { id: 'r2', anchor: { x: 238, y: 104 }, length: 166, active: true },
    ],
    goal: { x: 322, y: 438, radius: 34 },
    stars: [
      { x: 118, y: 246 },
      { x: 218, y: 318 },
      { x: 322, y: 392 },
    ],
    obstacles: [
      { x: 58, y: 320, width: 128, height: 16 },
    ],
    bumpers: [
      { x: 96, y: 386, radius: 22, power: 1.2 },
      { x: 236, y: 350, radius: 24, power: 1.16 },
    ],
    moveLimit: 2,
    timeLimit: 65,
  },
  {
    id: 7,
    title: '右侧直落',
    hint: '等糖果晃到右边，切绳后让它贴着右侧落袋。',
    candy: { x: 248, y: 158, radius: 18 },
    initialVelocity: { x: 0.8, y: 0 },
    ropes: [{ id: 'r1', anchor: { x: 204, y: 70 }, length: 102, active: true }],
    goal: { x: 310, y: 430, radius: 34 },
    stars: [
      { x: 258, y: 236 },
      { x: 298, y: 320 },
      { x: 310, y: 382 },
    ],
    obstacles: [{ x: 70, y: 316, width: 150, height: 16 }],
    bumpers: [],
    moveLimit: 1,
    timeLimit: 48,
  },
  {
    id: 8,
    title: '左袋双摆',
    hint: '先切右绳，等糖果向左摆，再切左绳。',
    candy: { x: 180, y: 166, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 96, y: 82 }, length: 118, active: true },
      { id: 'r2', anchor: { x: 254, y: 82 }, length: 118, active: true },
    ],
    goal: { x: 82, y: 426, radius: 35 },
    stars: [
      { x: 150, y: 236 },
      { x: 98, y: 318 },
      { x: 82, y: 382 },
    ],
    obstacles: [{ x: 178, y: 300, width: 120, height: 16 }],
    bumpers: [{ x: 70, y: 354, radius: 22, power: 1.1 }],
    moveLimit: 2,
    timeLimit: 58,
  },
  {
    id: 9,
    title: '弹垫折返',
    hint: '让糖果先碰右侧弹跳垫，再折回中间袋子。',
    candy: { x: 132, y: 154, radius: 18 },
    initialVelocity: { x: 0.9, y: 0 },
    ropes: [{ id: 'r1', anchor: { x: 184, y: 68 }, length: 116, active: true }],
    goal: { x: 178, y: 434, radius: 36 },
    stars: [
      { x: 196, y: 232 },
      { x: 270, y: 318 },
      { x: 178, y: 386 },
    ],
    obstacles: [
      { x: 52, y: 294, width: 118, height: 16 },
      { x: 184, y: 370, width: 92, height: 16 },
    ],
    bumpers: [{ x: 298, y: 332, radius: 24, power: 1.2 }],
    moveLimit: 1,
    timeLimit: 56,
  },
  {
    id: 10,
    title: '三点开锁',
    hint: '从左到右切绳，最后借右侧弹跳垫进袋。',
    candy: { x: 182, y: 164, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 86, y: 80 }, length: 130, active: true },
      { id: 'r2', anchor: { x: 184, y: 64 }, length: 102, active: true },
      { id: 'r3', anchor: { x: 282, y: 84 }, length: 128, active: true },
    ],
    goal: { x: 304, y: 430, radius: 36 },
    stars: [
      { x: 206, y: 236 },
      { x: 284, y: 312 },
      { x: 304, y: 382 },
    ],
    obstacles: [{ x: 58, y: 308, width: 164, height: 16 }],
    bumpers: [{ x: 314, y: 340, radius: 22, power: 1.14 }],
    moveLimit: 3,
    timeLimit: 64,
  },
  {
    id: 11,
    title: '移动单摆',
    hint: '移动吊点会带出摆幅，等糖果靠近左路时切断。',
    candy: { x: 190, y: 178, radius: 18 },
    initialVelocity: { x: -0.2, y: 0 },
    ropes: [
      {
        id: 'r1',
        anchor: { x: 188, y: 70 },
        length: 118,
        active: true,
        motion: { amplitudeX: 46, speed: 0.032, phase: 0.4 },
      },
    ],
    goal: { x: 76, y: 430, radius: 35 },
    stars: [
      { x: 144, y: 244 },
      { x: 94, y: 324 },
      { x: 76, y: 384 },
    ],
    obstacles: [{ x: 144, y: 348, width: 150, height: 16 }],
    bumpers: [{ x: 62, y: 358, radius: 21, power: 1.08 }],
    moveLimit: 1,
    timeLimit: 60,
  },
  {
    id: 12,
    title: '双垫连跳',
    hint: '先断上绳，再断侧绳，利用两块弹跳垫连跳。',
    candy: { x: 154, y: 158, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 154, y: 66 }, length: 92, active: true },
      { id: 'r2', anchor: { x: 270, y: 126 }, length: 142, active: true },
    ],
    goal: { x: 288, y: 432, radius: 36 },
    stars: [
      { x: 154, y: 244 },
      { x: 232, y: 322 },
      { x: 288, y: 386 },
    ],
    obstacles: [{ x: 72, y: 304, width: 128, height: 16 }],
    bumpers: [
      { x: 92, y: 376, radius: 22, power: 1.18 },
      { x: 244, y: 354, radius: 23, power: 1.14 },
    ],
    moveLimit: 2,
    timeLimit: 66,
  },
  {
    id: 13,
    title: '右墙反弹',
    hint: '让糖果从右侧反弹回来，切点稍晚更稳。',
    candy: { x: 236, y: 150, radius: 18 },
    initialVelocity: { x: 0.95, y: 0 },
    ropes: [{ id: 'r1', anchor: { x: 190, y: 64 }, length: 106, active: true }],
    goal: { x: 150, y: 432, radius: 36 },
    stars: [
      { x: 274, y: 232 },
      { x: 210, y: 314 },
      { x: 150, y: 386 },
    ],
    obstacles: [
      { x: 54, y: 310, width: 112, height: 16 },
      { x: 188, y: 378, width: 120, height: 16 },
    ],
    bumpers: [{ x: 318, y: 330, radius: 24, power: 1.18 }],
    moveLimit: 1,
    timeLimit: 58,
  },
  {
    id: 14,
    title: '交叉双绳',
    hint: '先切左上绳，等糖果被右绳拉住后再释放。',
    candy: { x: 178, y: 166, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 88, y: 72 }, length: 130, active: true },
      { id: 'r2', anchor: { x: 286, y: 104 }, length: 150, active: true },
    ],
    goal: { x: 304, y: 434, radius: 36 },
    stars: [
      { x: 206, y: 250 },
      { x: 278, y: 322 },
      { x: 304, y: 388 },
    ],
    obstacles: [
      { x: 42, y: 286, width: 142, height: 16 },
      { x: 198, y: 358, width: 86, height: 16 },
    ],
    bumpers: [{ x: 312, y: 292, radius: 21, power: 1.1 }],
    moveLimit: 2,
    timeLimit: 64,
  },
  {
    id: 15,
    title: '中心窄道',
    hint: '让糖果垂直通过窄道，过早切会撞到横梁。',
    candy: { x: 182, y: 152, radius: 18 },
    initialVelocity: { x: 0.45, y: 0 },
    ropes: [{ id: 'r1', anchor: { x: 158, y: 66 }, length: 96, active: true }],
    goal: { x: 184, y: 436, radius: 35 },
    stars: [
      { x: 176, y: 238 },
      { x: 184, y: 318 },
      { x: 184, y: 390 },
    ],
    obstacles: [
      { x: 44, y: 292, width: 112, height: 16 },
      { x: 208, y: 292, width: 108, height: 16 },
      { x: 44, y: 370, width: 108, height: 16 },
      { x: 214, y: 370, width: 102, height: 16 },
    ],
    bumpers: [],
    moveLimit: 1,
    timeLimit: 55,
  },
  {
    id: 16,
    title: '三绳右摆',
    hint: '先断中绳，保留右绳形成摆动，再释放进右袋。',
    candy: { x: 198, y: 164, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 110, y: 82 }, length: 128, active: true },
      { id: 'r2', anchor: { x: 198, y: 68 }, length: 96, active: true },
      { id: 'r3', anchor: { x: 304, y: 92 }, length: 126, active: true },
    ],
    goal: { x: 322, y: 432, radius: 34 },
    stars: [
      { x: 226, y: 238 },
      { x: 304, y: 318 },
      { x: 322, y: 384 },
    ],
    obstacles: [{ x: 62, y: 328, width: 180, height: 16 }],
    bumpers: [{ x: 318, y: 270, radius: 22, power: 1.16 }],
    moveLimit: 3,
    timeLimit: 68,
  },
  {
    id: 17,
    title: '移动门梁',
    hint: '上方吊点移动时会打开路线，等糖果向右下方走再切。',
    candy: { x: 176, y: 174, radius: 18 },
    initialVelocity: { x: 0.2, y: 0 },
    ropes: [
      {
        id: 'r1',
        anchor: { x: 176, y: 70 },
        length: 112,
        active: true,
        motion: { amplitudeX: 52, amplitudeY: 8, speed: 0.03, phase: 1.1 },
      },
    ],
    goal: { x: 296, y: 430, radius: 36 },
    stars: [
      { x: 226, y: 242 },
      { x: 276, y: 320 },
      { x: 296, y: 384 },
    ],
    obstacles: [
      { x: 48, y: 306, width: 126, height: 16 },
      { x: 206, y: 356, width: 94, height: 16 },
    ],
    bumpers: [{ x: 322, y: 344, radius: 22, power: 1.12 }],
    moveLimit: 1,
    timeLimit: 62,
  },
  {
    id: 18,
    title: '双绳下坠',
    hint: '先切短绳让糖果贴右侧，最后切长绳直落。',
    candy: { x: 220, y: 162, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 144, y: 72 }, length: 118, active: true },
      { id: 'r2', anchor: { x: 284, y: 78 }, length: 100, active: true },
    ],
    goal: { x: 322, y: 434, radius: 34 },
    stars: [
      { x: 250, y: 240 },
      { x: 314, y: 318 },
      { x: 322, y: 386 },
    ],
    obstacles: [
      { x: 44, y: 290, width: 146, height: 16 },
      { x: 188, y: 382, width: 94, height: 16 },
    ],
    bumpers: [{ x: 318, y: 286, radius: 23, power: 1.14 }],
    moveLimit: 2,
    timeLimit: 64,
  },
  {
    id: 19,
    title: '左侧回旋',
    hint: '利用左侧弹跳垫把糖果弹回中心，再落进口袋。',
    candy: { x: 118, y: 154, radius: 18 },
    initialVelocity: { x: -0.65, y: 0 },
    ropes: [{ id: 'r1', anchor: { x: 172, y: 64 }, length: 112, active: true }],
    goal: { x: 198, y: 436, radius: 36 },
    stars: [
      { x: 98, y: 238 },
      { x: 132, y: 326 },
      { x: 198, y: 390 },
    ],
    obstacles: [
      { x: 178, y: 292, width: 128, height: 16 },
      { x: 50, y: 382, width: 92, height: 16 },
    ],
    bumpers: [{ x: 54, y: 330, radius: 24, power: 1.18 }],
    moveLimit: 1,
    timeLimit: 60,
  },
  {
    id: 20,
    title: '终局连摆',
    hint: '先解左侧，再解上方，最后用右绳摆到最右侧口袋。',
    candy: { x: 184, y: 164, radius: 18 },
    initialVelocity: { x: 0, y: 0 },
    ropes: [
      { id: 'r1', anchor: { x: 80, y: 86 }, length: 132, active: true },
      { id: 'r2', anchor: { x: 184, y: 60 }, length: 104, active: true },
      { id: 'r3', anchor: { x: 314, y: 92 }, length: 148, active: true },
    ],
    goal: { x: 324, y: 438, radius: 34 },
    stars: [
      { x: 218, y: 238 },
      { x: 300, y: 318 },
      { x: 324, y: 392 },
    ],
    obstacles: [
      { x: 46, y: 298, width: 142, height: 16 },
      { x: 202, y: 366, width: 92, height: 16 },
    ],
    bumpers: [
      { x: 318, y: 276, radius: 22, power: 1.16 },
      { x: 86, y: 378, radius: 22, power: 1.1 },
    ],
    moveLimit: 3,
    timeLimit: 72,
  },
]

const PHYSICS = {
  gravity: 0.2,
  damping: 1,
  bounce: 1,
  ropeStiffness: 1,
  maxSpeed: 12,
}

const SCORING = {
  baseWin: 800,
  star: 200,
  unusedCut: 150,
  remainingTime: 5,
}

const SAVE_KEY = 'echo-cut-rope-progress-v1'

const levelIndex = ref(0)
const levelState = ref<CutRopeLevel>(cloneLevel(LEVELS[0]))
const totalScore = ref(0)
const levelScore = ref(0)
const timeLeft = ref(45)
const cutsUsed = ref(0)
const result = ref<GameResult>('playing')
const starCollected = ref<boolean[]>([])
const sliceLine = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

const candy = reactive({
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
})

let frameId = 0
let timerId: ReturnType<typeof window.setInterval> | null = null
let sliceStart: Point | null = null
let frameTick = 0

const activeLevel = computed(() => levelState.value)
const activeRopes = computed(() => activeLevel.value.ropes.filter(rope => rope.active))
const isFinished = computed(() => result.value !== 'playing')
const collectedStars = computed(() => starCollected.value.filter(Boolean).length)
const statusText = computed(() => {
  if (result.value === 'won') return '成功送达'
  if (result.value === 'lost') return '糖果掉落'
  if (activeRopes.value.length === 0) return '糖果自由下落中'
  return '切断绳子，让糖果进袋'
})

onMounted(() => {
  levelIndex.value = loadSavedLevelIndex()
  restartLevel()
})

onBeforeUnmount(() => {
  stopLoops()
})

function restartLevel() {
  stopLoops()
  const level = cloneLevel(LEVELS[levelIndex.value])
  levelState.value = level
  candy.x = level.candy.x
  candy.y = level.candy.y
  candy.prevX = level.candy.x - level.initialVelocity.x
  candy.prevY = level.candy.y - level.initialVelocity.y
  starCollected.value = level.stars.map(() => false)
  cutsUsed.value = 0
  levelScore.value = 0
  timeLeft.value = level.timeLimit
  result.value = 'playing'
  sliceLine.value = null
  frameTick = 0
  startLoops()
}

function nextLevel() {
  levelIndex.value = Math.min(levelIndex.value + 1, LEVELS.length - 1)
  saveLevelIndex(levelIndex.value)
  restartLevel()
}

function startLoops() {
  frameId = window.requestAnimationFrame(step)
  timerId = window.setInterval(() => {
    if (result.value !== 'playing') return
    timeLeft.value = Math.max(0, timeLeft.value - 1)
    if (timeLeft.value === 0) finish('lost')
  }, 1000)
}

function stopLoops() {
  if (frameId) window.cancelAnimationFrame(frameId)
  if (timerId) window.clearInterval(timerId)
  frameId = 0
  timerId = null
}

function step() {
  if (result.value !== 'playing') return

  frameTick++
  updateMovingAnchors()
  integrateCandy()
  applyRopeConstraints()
  collideBounds()
  collideObstacles()
  collideBumpers()
  collectStars()
  checkGoal()
  checkLost()

  frameId = window.requestAnimationFrame(step)
}

function integrateCandy() {
  const vx = clamp((candy.x - candy.prevX) * PHYSICS.damping, -PHYSICS.maxSpeed, PHYSICS.maxSpeed)
  const vy = clamp((candy.y - candy.prevY) * PHYSICS.damping + PHYSICS.gravity, -PHYSICS.maxSpeed, PHYSICS.maxSpeed)
  candy.prevX = candy.x
  candy.prevY = candy.y
  candy.x += vx
  candy.y += vy
}

function applyRopeConstraints() {
  for (let pass = 0; pass < 7; pass++) {
    for (const rope of activeRopes.value) {
      const dx = candy.x - rope.anchor.x
      const dy = candy.y - rope.anchor.y
      const distance = Math.max(0.01, Math.hypot(dx, dy))
      if (distance <= rope.length) continue

      const excess = (distance - rope.length) / distance
      candy.x -= dx * excess * PHYSICS.ropeStiffness
      candy.y -= dy * excess * PHYSICS.ropeStiffness
    }
  }
}

function updateMovingAnchors() {
  for (const rope of activeLevel.value.ropes) {
    const base = rope.baseAnchor || rope.anchor
    if (!rope.motion) {
      rope.anchor.x = base.x
      rope.anchor.y = base.y
      continue
    }

    const t = frameTick * rope.motion.speed + rope.motion.phase
    rope.anchor.x = base.x + Math.sin(t) * (rope.motion.amplitudeX || 0)
    rope.anchor.y = base.y + Math.cos(t * 0.8) * (rope.motion.amplitudeY || 0)
  }
}

function collideBounds() {
  const radius = activeLevel.value.candy.radius
  if (candy.x < radius) {
    candy.x = radius
    candy.prevX = candy.x + Math.abs(candy.x - candy.prevX) * PHYSICS.bounce
  }
  if (candy.x > 360 - radius) {
    candy.x = 360 - radius
    candy.prevX = candy.x - Math.abs(candy.x - candy.prevX) * PHYSICS.bounce
  }
  if (candy.y < radius) {
    candy.y = radius
    candy.prevY = candy.y + Math.abs(candy.y - candy.prevY) * PHYSICS.bounce
  }
}

function collideObstacles() {
  const radius = activeLevel.value.candy.radius
  for (const obstacle of activeLevel.value.obstacles) {
    const closestX = clamp(candy.x, obstacle.x, obstacle.x + obstacle.width)
    const closestY = clamp(candy.y, obstacle.y, obstacle.y + obstacle.height)
    const dx = candy.x - closestX
    const dy = candy.y - closestY
    const distance = Math.hypot(dx, dy)
    if (distance >= radius) continue

    const nx = distance === 0 ? 0 : dx / distance
    const ny = distance === 0 ? -1 : dy / distance
    const push = radius - distance + 0.5
    candy.x += nx * push
    candy.y += ny * push
    reflectVelocity(nx, ny, PHYSICS.bounce)
  }
}

function collideBumpers() {
  const radius = activeLevel.value.candy.radius
  for (const bumper of activeLevel.value.bumpers) {
    const dx = candy.x - bumper.x
    const dy = candy.y - bumper.y
    const distance = Math.max(0.01, Math.hypot(dx, dy))
    const minDistance = radius + bumper.radius
    if (distance >= minDistance) continue

    const nx = dx / distance
    const ny = dy / distance
    const push = minDistance - distance + 0.8
    candy.x += nx * push
    candy.y += ny * push
    reflectVelocity(nx, ny, bumper.power)
  }
}

function collectStars() {
  const radius = activeLevel.value.candy.radius + 12
  activeLevel.value.stars.forEach((star, index) => {
    if (starCollected.value[index]) return
    if (Math.hypot(candy.x - star.x, candy.y - star.y) <= radius) {
      starCollected.value[index] = true
      levelScore.value += SCORING.star
    }
  })
}

function checkGoal() {
  const goal = activeLevel.value.goal
  if (Math.hypot(candy.x - goal.x, candy.y - goal.y) <= goal.radius - 4) {
    finish('won')
  }
}

function checkLost() {
  if (candy.y > 540) finish('lost')
}

function cutRope(ropeId: string) {
  if (result.value !== 'playing') return
  const rope = activeLevel.value.ropes.find(item => item.id === ropeId)
  if (!rope?.active) return
  rope.active = false
  cutsUsed.value++
}

function finish(nextResult: GameResult) {
  if (result.value !== 'playing') return
  result.value = nextResult
  stopLoops()
  if (nextResult !== 'won') return

  const unusedCut = Math.max(0, activeLevel.value.moveLimit - cutsUsed.value)
  const bonus = SCORING.baseWin + unusedCut * SCORING.unusedCut + timeLeft.value * SCORING.remainingTime
  levelScore.value += bonus
  totalScore.value += levelScore.value
  saveLevelIndex(Math.min(levelIndex.value + 1, LEVELS.length - 1))
}

function startSlice(event: PointerEvent) {
  const point = pointerToBoard(event)
  sliceStart = point
  sliceLine.value = { x1: point.x, y1: point.y, x2: point.x, y2: point.y }
}

function moveSlice(event: PointerEvent) {
  if (!sliceStart || !sliceLine.value) return
  const point = pointerToBoard(event)
  sliceLine.value = { ...sliceLine.value, x2: point.x, y2: point.y }
  for (const rope of activeRopes.value) {
    if (segmentsIntersect(sliceStart, point, rope.anchor, { x: candy.x, y: candy.y })) {
      cutRope(rope.id)
    }
  }
}

function endSlice() {
  sliceStart = null
  window.setTimeout(() => {
    sliceLine.value = null
  }, 80)
}

function pointerToBoard(event: PointerEvent): Point {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * 360,
    y: ((event.clientY - rect.top) / rect.height) * 520,
  }
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const ccw = (p1: Point, p2: Point, p3: Point) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x)
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)
}

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const radius = i % 2 === 0 ? outer : inner
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`)
  }
  return `M ${points.join(' L ')} Z`
}

function pulleyRotation(rope: RopeState): number {
  return (Math.atan2(candy.y - rope.anchor.y, candy.x - rope.anchor.x) * 180) / Math.PI
}

function loadSavedLevelIndex(): number {
  try {
    const rawValue = window.localStorage.getItem(SAVE_KEY)
    if (!rawValue) return 0

    const parsed = JSON.parse(rawValue) as { levelIndex?: unknown }
    return normalizeLevelIndex(parsed.levelIndex)
  } catch {
    return 0
  }
}

function saveLevelIndex(nextLevelIndex: number) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ levelIndex: normalizeLevelIndex(nextLevelIndex) }))
  } catch {
    // localStorage may be unavailable in private or embedded webviews.
  }
}

function normalizeLevelIndex(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.round(clamp(value, 0, LEVELS.length - 1))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function cloneLevel(level: CutRopeLevel): CutRopeLevel {
  return {
    ...level,
    candy: { ...level.candy },
    initialVelocity: { ...level.initialVelocity },
    goal: { ...level.goal },
    ropes: level.ropes.map(rope => ({
      ...rope,
      anchor: { ...rope.anchor },
      baseAnchor: { ...rope.anchor },
      motion: rope.motion ? { ...rope.motion } : undefined,
      active: true,
    })),
    stars: level.stars.map(star => ({ ...star })),
    obstacles: level.obstacles.map(obstacle => ({ ...obstacle })),
    bumpers: level.bumpers.map(bumper => ({ ...bumper })),
  }
}

function reflectVelocity(nx: number, ny: number, bounce: number) {
  const vx = clamp(candy.x - candy.prevX, -PHYSICS.maxSpeed, PHYSICS.maxSpeed)
  const vy = clamp(candy.y - candy.prevY, -PHYSICS.maxSpeed, PHYSICS.maxSpeed)
  const dot = vx * nx + vy * ny
  if (dot >= 0) return

  const nextVx = vx - (1 + bounce) * dot * nx
  const nextVy = vy - (1 + bounce) * dot * ny
  candy.prevX = candy.x - clamp(nextVx, -PHYSICS.maxSpeed, PHYSICS.maxSpeed)
  candy.prevY = candy.y - clamp(nextVy, -PHYSICS.maxSpeed, PHYSICS.maxSpeed)
}
</script>

<style lang="scss" scoped>
.cut-rope-game {
  width: min(460px, calc(100vw - 28px));
  color: var(--text-primary);
  user-select: none;
}

.game-head,
.score-row,
.rope-panel,
.game-foot {
  width: 100%;
}

.game-head {
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
    line-height: 1.45;
  }
}

.soft-btn,
.primary-btn,
.rope-btn {
  min-height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: transform var(--transition-base), background var(--transition-base), opacity var(--transition-base);

  &:active {
    transform: scale(0.96);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.soft-btn {
  flex: 0 0 auto;
  padding: 0 14px;
}

.score-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.score-card {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 7px;
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
  border-color: rgba(52, 211, 153, 0.22);
  background: rgba(52, 211, 153, 0.09);
}

.playfield-wrap {
  position: relative;
  width: 100%;
}

.playfield {
  display: block;
  width: 100%;
  aspect-ratio: 360 / 520;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  touch-action: none;
}

.field-bg {
  fill: rgba(7, 18, 34, 0.96);
  stroke: rgba(125, 211, 252, 0.13);
}

.field-grid {
  fill: none;
  stroke: rgba(255, 255, 255, 0.045);
  stroke-width: 1;
}

.goal circle:first-child {
  fill: url(#goalGlow);
  opacity: 0.12;
}

.goal-mouth {
  fill: rgba(14, 165, 233, 0.16);
  stroke: rgba(125, 211, 252, 0.48);
  stroke-width: 3;
}

.goal-smile {
  fill: none;
  stroke: rgba(187, 247, 208, 0.86);
  stroke-width: 4;
  stroke-linecap: round;
}

.obstacle {
  fill: rgba(148, 163, 184, 0.52);
  stroke: rgba(255, 255, 255, 0.16);
  stroke-width: 1;
}

.bumper {
  fill: rgba(251, 146, 60, 0.28);
  stroke: rgba(253, 186, 116, 0.82);
  stroke-width: 3;
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.22));
}

.star-halo {
  fill: rgba(250, 204, 21, 0.12);
}

.star-core {
  fill: #facc15;
  stroke: rgba(255, 255, 255, 0.7);
  stroke-width: 1.2;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.collected .star-core,
.collected .star-halo {
  opacity: 0.18;
}

.rope-hit {
  stroke: transparent;
  stroke-width: 22;
  cursor: pointer;
}

.rope-line {
  pointer-events: none;
  stroke: #f5deb3;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 8 4;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.4));
}

.anchor {
  pointer-events: none;
  fill: #94a3b8;
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 2;
}

.anchor-spoke {
  pointer-events: none;
  stroke: rgba(15, 23, 42, 0.82);
  stroke-width: 2;
  stroke-linecap: round;
}

.candy-shadow {
  fill: rgba(0, 0, 0, 0.18);
}

.candy-body {
  fill: url(#candyGloss);
  stroke: rgba(255, 255, 255, 0.72);
  stroke-width: 2;
  filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.3));
}

.candy-shine {
  fill: rgba(255, 255, 255, 0.7);
}

.candy-smile {
  fill: none;
  stroke: rgba(255, 255, 255, 0.76);
  stroke-width: 2;
  stroke-linecap: round;
}

.candy.delivered {
  animation: candyPop 0.32s ease both;
}

.slice-line {
  pointer-events: none;
  stroke: rgba(250, 250, 250, 0.88);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 7 6;
}

.result-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.66);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.result-card {
  width: min(320px, calc(100% - 32px));
  padding: 22px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.95);
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

.result-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);

  b {
    color: var(--text-primary);
  }
}

.result-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.primary-btn {
  background: var(--interactive-gradient);
  color: #fff;
}

.rope-panel {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
  scrollbar-width: none;
}

.rope-panel::-webkit-scrollbar {
  display: none;
}

.rope-btn {
  flex: 1;
  min-width: 104px;
  padding: 0 12px;
}

.rope-btn.cut {
  text-decoration: line-through;
}

.game-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.game-foot span {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
}

@keyframes candyPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.14); }
  100% { transform: scale(1); }
}

@media (max-width: 560px) {
  .cut-rope-game {
    width: calc(100vw - 24px);
  }

  .score-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-actions {
    grid-template-columns: 1fr;
  }
}
</style>
