import re

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

path = 'frontend/src/services/chat.ts'
content = read_file(path)

# 在 buildSystemPrompt 的 Layer 3 之后、Layer 4 之前添加群成员设定层
# 定位 Layer 4 注释位置并插入
insert_marker = "    // Layer 4: User profile"
insert_code = """    // Layer 3.5: Group Members (for multiplayer / composite characters)
    if (character.structuredMembers && character.structuredMembers.length > 0) {
      const memberSections: string[] = []
      for (const member of character.structuredMembers) {
        if (member.isNarrator) {
          const narratorParts: string[] = []
          if (member.name) narratorParts.push(`旁白：${member.name}`)
          if (member.speakingStyle) narratorParts.push(`风格：${member.speakingStyle}`)
          if (narratorParts.length) memberSections.push(narratorParts.join(' | '))
          continue
        }
        const mparts: string[] = []
        if (member.name) mparts.push(`【${member.name}】`)
        if (member.description) mparts.push(`描述：${member.description}`)
        if (member.persona?.anchor) mparts.push(`身份：${member.persona.anchor}`)
        if (member.persona?.traits?.length) mparts.push(`特质：${member.persona.traits.join('、')}`)
        if (member.persona?.voice) mparts.push(`风格：${member.persona.voice}`)
        if (member.scenario) mparts.push(`场景：${member.scenario}`)
        if (member.settings) mparts.push(`设定：${member.settings}`)
        if (member.speakingStyle) mparts.push(`口吻：${member.speakingStyle}`)
        if (member.personality) mparts.push(`性格：${member.personality}`)
        if (member.depthPrompt?.prompt) mparts.push(`深度提示：${member.depthPrompt.prompt}`)
        if (mparts.length > 1) {
          memberSections.push(mparts.join('\\n'))
        }
      }
      if (memberSections.length) {
        sections.push(`【群成员设定】\\n${memberSections.join('\\n\\n')}`)
      }
    }

"""

if insert_marker in content:
    content = content.replace(insert_marker, insert_code + insert_marker)
    write_file(path, content)
    print("chat.ts modified successfully")
else:
    print("ERROR: Could not find insertion marker in chat.ts")
