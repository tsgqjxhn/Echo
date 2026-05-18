import re

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

path = 'frontend/src/pages/character/edit.vue'
content = read_file(path)

# 1. 添加 GroupMemberSection 导入
old_import = "import MultimediaSettings from '@/components/CharacterForm/MultimediaSettings.vue'"
new_import = """import MultimediaSettings from '@/components/CharacterForm/MultimediaSettings.vue'
import GroupMemberSection from '@/components/CharacterForm/GroupMemberSection.vue'
import { isMultiplayerCategory } from '@/data/taxonomy'"""
content = content.replace(old_import, new_import)

# 2. 添加 GroupMember 到类型导入
old_type_import = "import type { ICharacter, CharacterPersona, Lorebook, LorebookEntry, DepthPrompt, EmotionAnimation } from '@/types/character'"
new_type_import = "import type { ICharacter, CharacterPersona, Lorebook, LorebookEntry, DepthPrompt, EmotionAnimation, GroupMember } from '@/types/character'"
content = content.replace(old_type_import, new_type_import)

# 3. 添加 members 到 expandedCards
old_expanded = """const expandedCards = reactive<Record<string, boolean>>({
  base: true,
  prompt: true,
  persona: false,
  lorebook: false,
  worldBooks: false,
  depthPrompt: false,
  altGreetings: false,
  media: false,
  chatParams: false,
  gameData: false,
  multimedia: false,
})"""
new_expanded = """const expandedCards = reactive<Record<string, boolean>>({
  base: true,
  prompt: true,
  persona: false,
  lorebook: false,
  worldBooks: false,
  depthPrompt: false,
  altGreetings: false,
  media: false,
  chatParams: false,
  gameData: false,
  multimedia: false,
  members: false,
})"""
content = content.replace(old_expanded, new_expanded)

# 4. 添加 structuredMembers 到 form (在 gameData 后面)
old_gameData = "  gameData: '',\n  // 保留原始值"
new_gameData = """  gameData: '',
  structuredMembers: [] as GroupMember[],
  // 保留原始值"""
content = content.replace(old_gameData, new_gameData)

# 5. 添加 isMultiplayer 计算属性 (在 resolvedModeLabel 后面)
old_modeLabel = """const resolvedModeLabel = computed(() => {
  switch (resolvedMode.value) {
    case 'challenge-dialogue': return '闯关式对话'
    case 'group-chat': return '群聊'
    case 'group-challenge': return '群聊闯关'
    case 'free-dialogue':
    default: return '自由对话'
  }
})"""
new_modeLabel = """const resolvedModeLabel = computed(() => {
  switch (resolvedMode.value) {
    case 'challenge-dialogue': return '闯关式对话'
    case 'group-chat': return '群聊'
    case 'group-challenge': return '群聊闯关'
    case 'free-dialogue':
    default: return '自由对话'
  }
})

const isMultiplayer = computed(() => isMultiplayerCategory(form.category))"""
content = content.replace(old_modeLabel, new_modeLabel)

# 6. 在基础信息卡片后面添加群成员配置卡片
# 找到"<!-- 提示词核心 -->"并在此之前插入
old_prompt_core = "        <!-- 提示词核心 -->"
new_prompt_core = """        <!-- 群成员配置 -->
        <div v-if="isMultiplayer" class="config-card" :class="{ filled: form.structuredMembers.length > 0 }" @click="toggleCard('members')">
          <div class="card-header">
            <span class="card-emoji">👥</span>
            <div class="card-meta">
              <span class="card-title">群成员配置</span>
              <span class="card-status">{{ form.structuredMembers.length }} 位成员</span>
            </div>
          </div>
          <div v-if="expandedCards.members" class="card-body" @click.stop>
            <GroupMemberSection
              :meta-fields="[]"
              :advanced-fields="[]"
              :model-value="{}"
              :initial-members="form.structuredMembers"
              @update:model-value="() => {}"
              @update:members="form.structuredMembers = $event"
            />
            <button type="button" class="collapse-btn" @click.stop="toggleCard('members')">收起</button>
          </div>
        </div>

        <!-- 提示词核心 -->"""
content = content.replace(old_prompt_core, new_prompt_core)

# 7. 在 loadCharacter 中加载 structuredMembers (在 form.gameData 后面)
old_load_end = """  form.gameData = c.gameData || ''
  form.personality = c.personality"""
new_load_end = """  form.gameData = c.gameData || ''
  form.structuredMembers = c.structuredMembers ? JSON.parse(JSON.stringify(c.structuredMembers)) : []
  form.personality = c.personality"""
content = content.replace(old_load_end, new_load_end)

# 8. 在自动展开卡片部分添加 members
old_auto_expand = """  expandedCards.gameData = !!(c.gameData)
  expandedCards.chatParams = !!(c.chatParams?.overrideGlobal)"""
new_auto_expand = """  expandedCards.gameData = !!(c.gameData)
  expandedCards.members = !!(c.structuredMembers?.length)
  expandedCards.chatParams = !!(c.chatParams?.overrideGlobal)"""
content = content.replace(old_auto_expand, new_auto_expand)

# 9. 在 buildPreviewCharacter 中添加 structuredMembers
old_preview = """    chatParams: buildChatParams(),
    multimedia: hasMultimedia.value ? JSON.parse(JSON.stringify(form.multimedia)) : undefined,
  }"""
new_preview = """    chatParams: buildChatParams(),
    multimedia: hasMultimedia.value ? JSON.parse(JSON.stringify(form.multimedia)) : undefined,
    structuredMembers: form.structuredMembers.length ? JSON.parse(JSON.stringify(form.structuredMembers)) : undefined,
  }"""
content = content.replace(old_preview, new_preview)

# 10. 在 onSubmit 中添加 structuredMembers
old_submit = """      gameData: form.gameData || undefined,
      chatParams: buildChatParams(),"""
new_submit = """      gameData: form.gameData || undefined,
      structuredMembers: form.structuredMembers.length ? JSON.parse(JSON.stringify(form.structuredMembers)) : undefined,
      chatParams: buildChatParams(),"""
content = content.replace(old_submit, new_submit)

write_file(path, content)
print("edit.vue modified successfully")
