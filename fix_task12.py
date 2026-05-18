import re

def remove_block(content, start_marker, end_marker):
    """Remove a block from start_marker to end_marker (inclusive)."""
    idx1 = content.find(start_marker)
    if idx1 < 0:
        return content
    idx2 = content.find(end_marker, idx1)
    if idx2 < 0:
        return content
    return content[:idx1] + content[idx2 + len(end_marker):]

# 1. user-info.vue
with open('frontend/src/pages/settings/user-info.vue', 'r', encoding='utf-8') as f:
    s = f.read()
# Delete corePrompt textarea block (lines 57-65)
s = remove_block(s, '      <label class="field">\n        <span>软件底层规范提示词</span>', '      </label>\n\n')
# Remove corePrompt from formData
s = s.replace("  corePrompt: ''\n", '')
# Remove corePrompt from onMounted
s = s.replace("  formData.value.corePrompt = userStore.userInfo?.corePrompt || ''\n", '')
# Remove corePrompt from save
s = s.replace("      corePrompt: formData.value.corePrompt.trim(),\n", '')
with open('frontend/src/pages/settings/user-info.vue', 'w', encoding='utf-8') as f:
    f.write(s)
print('user-info.vue done')

# 2. global-prompt.vue - rewrite completely
new_global_prompt = '''<template>
  <div class="global-prompt-page">
    <header class="page-header">
      <button type="button" class="back-btn" aria-label="返回" @click="router.back()">
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14.5 5.5L8 12l6.5 6.5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.2"
          />
        </svg>
      </button>
      <h1 class="page-title">配置全局提示词</h1>
      <span class="header-placeholder" aria-hidden="true"></span>
    </header>

    <section class="content-card">
      <label class="field">
        <span>全局提示词</span>
        <textarea
          v-model="formData.globalPrompt"
          maxlength="3000"
          rows="10"
          placeholder="请输入全局提示词"
        />
      </label>

      <div class="action-row">
        <button type="button" class="ghost-btn" @click="formData.globalPrompt = ''">清空</button>
        <button type="button" class="primary-btn" :disabled="saving" @click="savePrompt">
          {{ saving ? '保存中...' : '保存提示词' }}
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

onMounted(async () => {
  await userStore.loadUserInfo()
  formData.value.globalPrompt = userStore.globalPrompt
})

async function savePrompt() {
  saving.value = true
  try {
    await userStore.updateGlobalPrompt(formData.value.globalPrompt.trim())
    uni.showToast({ title: '提示词已保存', icon: 'success' })
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
  padding: 0 0 100px;
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
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  gap: 10px;
  min-height: calc(env(safe-area-inset-top, 0px) + 44px);
  padding: calc(env(safe-area-inset-top, 0px) + 4px) 12px 6px;
  border: none;
  border-bottom: 1px solid var(--top-bar-border);
  border-radius: 0;
  background: var(--top-bar-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(28px) saturate(1.45);
  -webkit-backdrop-filter: blur(28px) saturate(1.45);
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--top-bar-highlight);
  pointer-events: none;
}

.page-title {
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
}

.header-placeholder {
  display: block;
  width: 48px;
  height: 48px;
}

.ghost-btn,
.primary-btn {
  min-height: 46px;
  border-radius: 18px;
  font: inherit;
  cursor: pointer;
  transition:
    transform var(--transition-base),
    border-color var(--transition-base),
    background var(--transition-base),
    color var(--transition-base);
}

.ghost-btn {
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.primary-btn {
  padding: 0 18px;
  border: none;
  background: linear-gradient(135deg, #4a90d9, #356fb7);
  color: #f7fbff;
  font-weight: 600;
}

.back-btn {
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-primary);
  box-shadow: none;
  cursor: pointer;
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.back-btn:hover {
  opacity: 0.78;
}

.back-btn:active {
  transform: scale(0.95);
}

.back-icon {
  width: 22px;
  height: 22px;
  overflow: visible;
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
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
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 640px) {
  .action-row {
    flex-direction: column;
  }

  .page-header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .content-card {
    width: calc(100% - 20px);
  }
}
</style>
'''
with open('frontend/src/pages/settings/global-prompt.vue', 'w', encoding='utf-8') as f:
    f.write(new_global_prompt)
print('global-prompt.vue done')

# 3. stores/user.ts
with open('frontend/src/stores/user.ts', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace("  const corePrompt = computed(() => userInfo.value?.corePrompt || '')\n", '')
s = s.replace("  const hasCorePrompt = computed(() => !!userInfo.value?.corePrompt?.trim())\n", '')
s = s.replace('''  async function updateCorePrompt(prompt: string) {
    await updateUserInfo({ corePrompt: prompt })
  }

''', '')
s = s.replace('    corePrompt,\n', '')
s = s.replace('    hasCorePrompt,\n', '')
s = s.replace('    updateCorePrompt,\n', '')
with open('frontend/src/stores/user.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('stores/user.ts done')

# 4. services/user.ts
with open('frontend/src/services/user.ts', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace("'corePrompt': '',\n  ", '')
s = s.replace('''  async getCorePrompt(): Promise<string> {
    const info = await this.getUserInfo()
    return info.corePrompt || ''
  }

  async updateCorePrompt(prompt: string): Promise<void> {
    await this.updateUserInfo({ corePrompt: prompt })
  }

''', '')
with open('frontend/src/services/user.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('services/user.ts done')

# 5. types/user.ts
with open('frontend/src/types/user.ts', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace('  corePrompt?: string\n', '')
with open('frontend/src/types/user.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('types/user.ts done')

# 6. services/chat.ts
with open('frontend/src/services/chat.ts', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace('corePrompt?: string; ', '')
s = s.replace("      .replace(/\\{\\{user\\.corePrompt\\}\\}/g, userInfo?.corePrompt || '')\n", '')
# Fix the userInfo condition - remove corePrompt check
s = s.replace("    if (userInfo?.name || userInfo?.corePrompt) {\n", "    if (userInfo?.name) {\n")
s = s.replace("        userInfo.name ? `用户名字：${userInfo.name}` : '',\n        userInfo.corePrompt || '',\n", "        userInfo.name ? `用户名字：${userInfo.name}` : '',\n")
with open('frontend/src/services/chat.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('services/chat.ts done')

# 7. services/prompt-assembler.ts
with open('frontend/src/services/prompt-assembler.ts', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace("    'user.corePrompt': params.userCorePrompt,\n", '')
with open('frontend/src/services/prompt-assembler.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('prompt-assembler.ts done')

# 8. types/prompt-template.ts
with open('frontend/src/types/prompt-template.ts', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace("  'user.corePrompt'?: string\n", '')
with open('frontend/src/types/prompt-template.ts', 'w', encoding='utf-8') as f:
    f.write(s)
print('prompt-template.ts done')

# 9. backend schemas
with open('backend/app/schemas/entities.py', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace('    corePrompt: str | None = None\n', '')
with open('backend/app/schemas/entities.py', 'w', encoding='utf-8') as f:
    f.write(s)
print('backend schemas done')

# 10. backend models
with open('backend/app/models/entities.py', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace('    core_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)\n', '')
with open('backend/app/models/entities.py', 'w', encoding='utf-8') as f:
    f.write(s)
print('backend models done')

# 11. backend user.py
with open('backend/app/api/routes/user.py', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace('        corePrompt=profile.core_prompt,\n', '')
s = s.replace('    profile.core_prompt = payload.corePrompt\n', '')
with open('backend/app/api/routes/user.py', 'w', encoding='utf-8') as f:
    f.write(s)
print('backend user.py done')

# 12. backend export_service.py
with open('backend/app/services/export_service.py', 'r', encoding='utf-8') as f:
    s = f.read()
s = s.replace('        "corePrompt": profile.core_prompt,\n', '')
s = s.replace('        profile.core_prompt = user.get("corePrompt")\n', '')
with open('backend/app/services/export_service.py', 'w', encoding='utf-8') as f:
    f.write(s)
print('backend export_service.py done')

print('\nALL TASK 12 DONE')
