import re

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. 修复 character.ts 类型文件 - 添加丢失的类型
path = 'frontend/src/types/character.ts'
content = read_file(path)

# 在 UpdateCharacterRequest 之前添加 CharacterValidationResult 和 CharacterFilter
old_end = """export interface UpdateCharacterRequest extends CreateCharacterRequest {
  id: string
}"""
new_end = """export interface CharacterFilter {
  category?: string
  subCategory?: string
  tags?: string[]
  mode?: CharacterMode
  isFavorite?: boolean
  sourceType?: ICharacter['sourceType']
  search?: string
}

export interface CharacterValidationResult {
  valid: boolean
  errors: string[]
}

export interface UpdateCharacterRequest extends CreateCharacterRequest {
  id: string
}"""
content = content.replace(old_end, new_end)
write_file(path, content)
print("character.ts types added")

# 2. 修复 GroupMemberSection - 移除未使用的 DepthPrompt/EmotionAnimation 导入
path = 'frontend/src/components/CharacterForm/GroupMemberSection.vue'
content = read_file(path)
content = content.replace(
    "import type { GroupMember, CharacterMultimedia, DepthPrompt, EmotionAnimation } from '@/types/character'",
    "import type { GroupMember, CharacterMultimedia } from '@/types/character'"
)
write_file(path, content)
print("GroupMemberSection.vue import fixed")

# 3. 修复 user-info.vue - 移除 corePrompt 残留
path = 'frontend/src/pages/settings/user-info.vue'
content = read_file(path)
# 找到包含 corePrompt 的代码块并移除
content = content.replace(
    "  corePrompt: formData.corePrompt?.trim() || undefined,\n",
    ""
)
write_file(path, content)
print("user-info.vue corePrompt removed")

# 4. 修复 services/user.ts - 移除 corePrompt
path = 'frontend/src/services/user.ts'
content = read_file(path)
content = content.replace('"name" | "corePrompt" | "globalPrompt"', '"name" | "globalPrompt"')
write_file(path, content)
print("services/user.ts fixed")

# 5. 修复 taxonomy.ts - 在 isMultiplayerCategory 中使用 subCategory
path = 'frontend/src/data/taxonomy.ts'
content = read_file(path)
content = content.replace(
    "export function isMultiplayerCategory(category?: string | null, subCategory?: string | null): boolean {\n  return category === '多人' || category === '综合'\n}",
    "export function isMultiplayerCategory(category?: string | null, subCategory?: string | null): boolean {\n  return category === '多人' || category === '综合'\n}"
)
# subCategory 参数虽然没被使用但是 interface 的一部分，需要加 _ 前缀或直接使用
# 实际上 TS6133 是警告未使用变量，我们可以简单地在函数体中引用它
content = content.replace(
    "export function isMultiplayerCategory(category?: string | null, subCategory?: string | null): boolean {\n  return category === '多人' || category === '综合'\n}",
    "export function isMultiplayerCategory(category?: string | null, _subCategory?: string | null): boolean {\n  return category === '多人' || category === '综合'\n}"
)
write_file(path, content)
print("taxonomy.ts fixed")
