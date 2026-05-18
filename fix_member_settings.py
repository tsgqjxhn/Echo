import re

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

path = 'frontend/src/components/CharacterForm/GroupMemberSection.vue'
content = read_file(path)

# 1. 添加 DepthPrompt 和 EmotionAnimation 类型导入
old_import = "import type { GroupMember, CharacterMultimedia } from '@/types/character'"
new_import = "import type { GroupMember, CharacterMultimedia, DepthPrompt, EmotionAnimation } from '@/types/character'"
content = content.replace(old_import, new_import)

# 2. 在简单配置中保留现有字段
# 3. 在深度配置中增加更多字段
old_deep_fields = """        <!-- 深度配置 -->
        <div v-else class="member-fields deep">
          <div class="field-item">
            <label class="field-label">名字</label>
            <input v-model="member.name" type="text" class="field-input" maxlength="20" placeholder="成员名字" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">性格</label>
            <textarea v-model="member.personality" class="field-textarea" maxlength="500" placeholder="详细描述角色的性格特征、行为模式和心理状态" @input="emitMembers"></textarea>
          </div>
          <div class="field-item">
            <label class="field-label">说话风格</label>
            <textarea v-model="member.speakingStyle" class="field-textarea" maxlength="500" placeholder="例如：喜欢用网络用语、说话简洁、爱用反问句" @input="emitMembers"></textarea>
          </div>
          <div class="field-item">
            <label class="field-label">角色设定</label>
            <textarea v-model="member.settings" class="field-textarea" maxlength="2000" placeholder="完整的角色设定，包括背景故事、动机、人际关系等" @input="emitMembers"></textarea>
          </div>
          <!-- 成员多模态设置 -->
          <div class="member-multimedia">
            <button type="button" class="mm-toggle" @click="toggleMemberMultimedia(idx)">
              🎭 多模态 {{ member._mmExpanded ? '▲' : '▼' }}
            </button>
            <div v-if="member._mmExpanded" class="mm-body">
              <label class="mm-row">
                <span>语音</span>
                <input v-model="member.multimedia!.voice.enabled" type="checkbox" @change="emitMembers" />
              </label>
              <div v-if="member.multimedia!.voice.enabled" class="mm-sub">
                <input v-model="member.multimedia!.voice.voiceName" type="text" class="field-input" placeholder="音色名称" @input="emitMembers" />
                <input v-model="member.multimedia!.voice.voiceId" type="text" class="field-input" placeholder="音色ID" @input="emitMembers" />
              </div>
              <div class="mm-row">
                <span>头像</span>
                <button type="button" class="avatar-btn" @click="uploadMemberAvatar(idx)">上传</button>
                <button v-if="member.multimedia!.image.avatar" type="button" class="avatar-btn remove" @click="member.multimedia!.image.avatar = ''; emitMembers()">移除</button>
              </div>
              <div v-if="member.multimedia!.image.avatar" class="mm-preview"><img :src="member.multimedia!.image.avatar" alt="头像" /></div>
            </div>
          </div>
        </div>"""

new_deep_fields = """        <!-- 深度配置 -->
        <div v-else class="member-fields deep">
          <div class="field-item">
            <label class="field-label">名字</label>
            <input v-model="member.name" type="text" class="field-input" maxlength="20" placeholder="成员名字" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">一句话描述</label>
            <input v-model="member.description" type="text" class="field-input" maxlength="200" placeholder="例如：喜欢捉弄人的毒舌学姐" @input="emitMembers" />
          </div>
          <!-- 结构化人设 -->
          <div class="field-item">
            <label class="field-label">身份锚点</label>
            <input v-model="memberPersonaAnchor(idx)" type="text" class="field-input" placeholder="核心身份声明" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">性格特质</label>
            <input v-model="memberPersonaTraits(idx)" type="text" class="field-input" placeholder="用逗号分隔，如：冷静,直接,情感稳定" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">交流风格</label>
            <input v-model="memberPersonaVoice(idx)" type="text" class="field-input" placeholder="说话方式、语气、口头禅等" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">场景设定</label>
            <input v-model="memberScenario(idx)" type="text" class="field-input" placeholder="对话发生的时间、地点、背景" @input="emitMembers" />
          </div>
          <div class="field-item">
            <label class="field-label">角色设定</label>
            <textarea v-model="member.settings" class="field-textarea" maxlength="2000" placeholder="完整的角色设定，包括背景故事、动机、人际关系等" @input="emitMembers"></textarea>
          </div>
          <!-- 深度提示 -->
          <div class="field-item">
            <label class="field-label">深度提示</label>
            <input v-model="memberDepthPrompt(idx)" type="text" class="field-input" placeholder="注入到指定深度的提示内容" @input="emitMembers" />
          </div>
          <!-- 备选开场白 -->
          <div class="field-item">
            <label class="field-label">备选开场白</label>
            <input v-model="memberAltGreetings(idx)" type="text" class="field-input" placeholder="用 | 分隔多个开场白" @input="emitMembers" />
          </div>
          <!-- 成员多模态设置 -->
          <div class="member-multimedia">
            <button type="button" class="mm-toggle" @click="toggleMemberMultimedia(idx)">
              🎭 多模态 {{ member._mmExpanded ? '▲' : '▼' }}
            </button>
            <div v-if="member._mmExpanded" class="mm-body">
              <label class="mm-row">
                <span>语音</span>
                <input v-model="member.multimedia!.voice.enabled" type="checkbox" @change="emitMembers" />
              </label>
              <div v-if="member.multimedia!.voice.enabled" class="mm-sub">
                <input v-model="member.multimedia!.voice.voiceName" type="text" class="field-input" placeholder="音色名称" @input="emitMembers" />
                <input v-model="member.multimedia!.voice.voiceId" type="text" class="field-input" placeholder="音色ID" @input="emitMembers" />
              </div>
              <div class="mm-row">
                <span>头像</span>
                <button type="button" class="avatar-btn" @click="uploadMemberAvatar(idx)">上传</button>
                <button v-if="member.multimedia!.image.avatar" type="button" class="avatar-btn remove" @click="member.multimedia!.image.avatar = ''; emitMembers()">移除</button>
              </div>
              <div v-if="member.multimedia!.image.avatar" class="mm-preview"><img :src="member.multimedia!.image.avatar" alt="头像" /></div>
              <div class="mm-row">
                <span>聊天背景</span>
                <button type="button" class="avatar-btn" @click="uploadMemberChatBg(idx)">上传</button>
                <button v-if="member.multimedia!.image.chatBackground" type="button" class="avatar-btn remove" @click="member.multimedia!.image.chatBackground = ''; emitMembers()">移除</button>
              </div>
            </div>
          </div>
        </div>"""
content = content.replace(old_deep_fields, new_deep_fields)

# 4. 在 script 中添加辅助 computed/getter 函数
old_script_end = """function emitMembers() {
  emit('update:members', [...members.value])
}
</script>"""

new_script_end = """function memberPersonaAnchor(idx: number) {
  const m = members.value[idx]
  return computed({
    get: () => m.persona?.anchor || '',
    set: (v: string) => {
      if (!m.persona) m.persona = { anchor: '', traits: [], voice: '' }
      m.persona.anchor = v
      emitMembers()
    },
  })
}

function memberPersonaTraits(idx: number) {
  const m = members.value[idx]
  return computed({
    get: () => m.persona?.traits?.join('，') || '',
    set: (v: string) => {
      if (!m.persona) m.persona = { anchor: '', traits: [], voice: '' }
      m.persona.traits = v.split(/[,，]/).map(s => s.trim()).filter(Boolean)
      emitMembers()
    },
  })
}

function memberPersonaVoice(idx: number) {
  const m = members.value[idx]
  return computed({
    get: () => m.persona?.voice || '',
    set: (v: string) => {
      if (!m.persona) m.persona = { anchor: '', traits: [], voice: '' }
      m.persona.voice = v
      emitMembers()
    },
  })
}

function memberScenario(idx: number) {
  const m = members.value[idx]
  return computed({
    get: () => m.scenario || '',
    set: (v: string) => { m.scenario = v; emitMembers() },
  })
}

function memberDepthPrompt(idx: number) {
  const m = members.value[idx]
  return computed({
    get: () => m.depthPrompt?.prompt || '',
    set: (v: string) => {
      if (!m.depthPrompt) m.depthPrompt = { depth: 4, prompt: '', role: 'system' }
      m.depthPrompt.prompt = v
      emitMembers()
    },
  })
}

function memberAltGreetings(idx: number) {
  const m = members.value[idx]
  return computed({
    get: () => m.alternateGreetings?.join(' | ') || '',
    set: (v: string) => {
      m.alternateGreetings = v.split('|').map(s => s.trim()).filter(Boolean)
      emitMembers()
    },
  })
}

function uploadMemberChatBg(idx: number) {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: async (res: { tempFilePaths: string[] }) => {
      const path = res.tempFilePaths?.[0]
      if (!path) return
      members.value[idx].multimedia!.image.chatBackground = path
      emitMembers()
    },
  })
}

function emitMembers() {
  emit('update:members', [...members.value])
}
</script>"""
content = content.replace(old_script_end, new_script_end)

# 5. 修改 simple 配置中的 personality 输入框为 textarea
old_simple_personality = """          <div v-if="!member.isNarrator" class="field-item">
            <label class="field-label">性格标签</label>
            <input v-model="member.personality" type="text" class="field-input" maxlength="100" placeholder="例如：开朗、傲娇、冷静" @input="emitMembers" />
          </div>"""
new_simple_personality = """          <div v-if="!member.isNarrator" class="field-item">
            <label class="field-label">性格</label>
            <textarea v-model="member.personality" class="field-textarea" maxlength="500" placeholder="详细描述角色的性格特征、行为模式和心理状态" @input="emitMembers"></textarea>
          </div>"""
content = content.replace(old_simple_personality, new_simple_personality)

write_file(path, content)
print("GroupMemberSection.vue modified successfully")
