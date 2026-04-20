<template>
  <div class="global-prompt-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">全局提示词</p>
        <h1>为所有会话补充统一约束</h1>
        <p class="header-copy">
          全局提示词会自动拼接到角色设定前，用于统一回复风格、长度或沟通规则。
        </p>
      </div>

      <button type="button" class="ghost-btn" @click="router.back()">返回</button>
    </header>

    <section class="content-card">
      <label class="field">
        <span>提示词内容</span>
        <textarea
          v-model="formData.globalPrompt"
          maxlength="1000"
          rows="10"
          placeholder="例如：请保持专业但友好的语气，优先给出清晰结论。"
        />
        <small>{{ formData.globalPrompt.length }} / 1000</small>
      </label>

      <div class="example-group">
        <p class="section-title">示例</p>
        <div class="example-list">
          <button
            v-for="example in examples"
            :key="example"
            type="button"
            class="example-chip"
            @click="useExample(example)"
          >
            {{ example }}
          </button>
        </div>
      </div>

      <div class="action-row">
        <button type="button" class="ghost-btn" @click="clearPrompt">清空</button>
        <button type="button" class="primary-btn" :disabled="saving" @click="saveGlobalPrompt">
          {{ saving ? '保存中…' : '保存提示词' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { uni } from '@/utils/uni-polyfill'

const router = useRouter()
const userStore = useUserStore()

const formData = ref({
  globalPrompt: ''
})

const saving = ref(false)
const examples = [
  '请用简洁清晰的方式回答，避免冗长铺垫。',
  '请保持专业但友好的语气，优先给出执行建议。',
  '请把复杂概念拆解成容易理解的步骤。',
  '回答时请保持客观中立，并明确说明不确定部分。'
]

onMounted(async () => {
  await userStore.loadUserInfo()
  formData.value.globalPrompt = userStore.globalPrompt
})

function useExample(example: string) {
  formData.value.globalPrompt = example
}

function clearPrompt() {
  formData.value.globalPrompt = ''
}

async function saveGlobalPrompt() {
  saving.value = true

  try {
    await userStore.updateGlobalPrompt(formData.value.globalPrompt.trim())
    uni.showToast({ title: '提示词已保存', icon: 'success' })
    router.back()
  } catch (error) {
    uni.showToast({
      title: (error as Error).message || '保存失败',
      icon: 'none'
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.global-prompt-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(ellipse at 15% 10%, rgba(52, 211, 153, 0.18) 0%, transparent 46%),
    radial-gradient(ellipse at 85% 88%, rgba(56, 189, 248, 0.14) 0%, transparent 40%),
    linear-gradient(180deg, #050d14 0%, #071520 52%, #0a1e2c 100%);
}

.page-header,
.content-card {
  border: 1px solid rgba(52, 211, 153, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.42);
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 28px;
  border-radius: 32px;
}

.eyebrow {
  color: var(--primary-color);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.page-header h1 {
  margin: 12px 0 10px;
  color: var(--text-primary);
  font-size: clamp(28px, 4vw, 38px);
}

.header-copy {
  max-width: 760px;
  color: var(--text-secondary);
  line-height: 1.8;
}

.ghost-btn,
.primary-btn {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 16px;
  cursor: pointer;
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 18px;
  padding: 28px;
  border-radius: 32px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--text-secondary);

  textarea {
    width: 100%;
    min-height: 220px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    resize: vertical;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-primary);
    font: inherit;
    line-height: 1.8;
  }

  small {
    color: var(--text-tertiary);
  }
}

.section-title {
  margin-bottom: 12px;
  color: var(--text-primary);
  font-size: 18px;
}

.example-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.example-chip {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  cursor: pointer;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #4a90d9, #356fb7);
  color: #f7fbff;
  font-weight: 600;
}

@media (max-width: 640px) {
  .global-prompt-page {
    padding: 16px;
  }

  .page-header,
  .action-row {
    flex-direction: column;
  }
}
</style>
