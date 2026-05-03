/**
 * 角色卡导入服务
 * 支持 SillyTavern PNG 角色卡（tEXt/iTXt chunk）和 Character Card JSON（v1/v2/v3）
 */

import type {
  ICharacter,
  CharacterPersona,
  Lorebook,
  LorebookEntry,
} from '@/types/character'
import { generateUUID } from '@/utils/uuid'

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function readUint32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  )
}

function bytesToString(data: Uint8Array, start: number, end: number): string {
  let result = ''
  for (let i = start; i < end; i++) {
    result += String.fromCharCode(data[i])
  }
  return result
}

/* ── Chara Card 归一化类型 ── */

interface CharaCardNormalized {
  name: string
  description?: string
  personality?: string
  scenario?: string
  first_mes?: string
  mes_example?: string
  creator_notes?: string
  system_prompt?: string
  post_history_instructions?: string
  alternate_greetings?: string[]
  tags?: string[]
  creator?: string
  character_version?: string
  extensions?: Record<string, unknown>
  character_book?: {
    name?: string
    description?: string
    entries?: Array<{
      keys?: string[]
      secondary_keys?: string[]
      content?: string
      name?: string
      enabled?: boolean
      insertion_order?: number
      case_sensitive?: boolean
      priority?: number
      constant?: boolean
      [key: string]: unknown
    }>
    [key: string]: unknown
  }
}

function normalizeCharaCard(raw: Record<string, unknown>): CharaCardNormalized {
  const data: Record<string, unknown> =
    raw.data && typeof raw.data === 'object'
      ? (raw.data as Record<string, unknown>)
      : raw
  return data as unknown as CharaCardNormalized
}

function detectSpec(raw: Record<string, unknown>): 'v1' | 'v2' | 'v3' {
  if (raw.spec === 'chara_card_v3') return 'v3'
  if (raw.spec === 'chara_card_v2' || (raw.data && typeof raw.data === 'object')) return 'v2'
  return 'v1'
}

/* ── 构建内部字段 ── */

function buildSettings(data: CharaCardNormalized): string {
  const parts: string[] = []
  if (data.description?.trim()) parts.push(data.description.trim())
  if (data.personality?.trim()) parts.push(`性格：${data.personality.trim()}`)
  if (data.scenario?.trim()) parts.push(`场景：${data.scenario.trim()}`)
  if (data.mes_example?.trim()) parts.push(`示例对话：\n${data.mes_example.trim()}`)
  if (data.system_prompt?.trim()) parts.push(`系统提示：\n${data.system_prompt.trim()}`)
  if (data.post_history_instructions?.trim())
    parts.push(`后历史指令：\n${data.post_history_instructions.trim()}`)
  return parts.join('\n\n')
}

function buildPersona(data: CharaCardNormalized): CharacterPersona | undefined {
  const anchor = data.description?.trim().split(/[.。？!！\n]/)[0]?.slice(0, 150) || data.name || ''
  const traitsRaw = data.personality || ''
  const voice = ''
  if (!anchor && !traitsRaw && !voice) return undefined
  const traits = traitsRaw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    anchor,
    traits: traits.length ? traits : [],
    voice,
  }
}

function buildLorebook(data: CharaCardNormalized): Lorebook | undefined {
  if (!data.character_book?.entries?.length) return undefined
  const entries: LorebookEntry[] = data.character_book.entries
    .filter((e) => e.content?.trim())
    .map((e, idx) => ({
      id: generateUUID(),
      keywords: e.keys?.filter((k): k is string => typeof k === 'string' && !!k) || [],
      content: e.content!.trim(),
      order: typeof e.insertion_order === 'number' ? e.insertion_order : idx,
      enabled: e.enabled !== false,
      position: 0,
      depth: 0,
      role: 'system',
    }))
  if (entries.length === 0) return undefined
  return {
    entries,
    scanRange: 100,
  }
}

function charaCardToICharacter(
  raw: Record<string, unknown>,
  imageDataUrl?: string,
): ICharacter {
  const data = normalizeCharaCard(raw)
  const now = Date.now()
  const spec = detectSpec(raw)

  if (!data.name?.trim()) {
    throw new Error('角色卡缺少名称字段')
  }

  const settings = buildSettings(data)

  const character: ICharacter = {
    id: generateUUID(),
    name: data.name.trim(),
    avatar: imageDataUrl || undefined,
    description: data.description?.trim() || '',
    greeting: data.first_mes?.trim() || undefined,
    settings,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    mode: 'free-dialogue',
    category: '综合',
    subCategory: '角色扮演',
    sourceType: 'document-import',
    sourceName:
      data.creator?.trim() ||
      (spec === 'v1' ? 'Character Card v1' : spec === 'v2' ? 'Character Card v2' : 'Character Card v3'),
    tags: data.tags?.filter((t): t is string => typeof t === 'string') || [],
    personality: data.personality?.trim() || undefined,
    scenario: data.scenario?.trim() || undefined,
    exampleDialogue: data.mes_example?.trim() || undefined,
    persona: buildPersona(data),
    lorebook: buildLorebook(data),
    alternateGreetings:
      data.alternate_greetings?.filter(
        (g): g is string => typeof g === 'string' && !!g.trim(),
      ) || undefined,
  }

  return character
}

/* ── PNG 解析 ── */

/**
 * 解析 PNG 的 tEXt/iTXt chunk 中的 chara 数据
 */
export async function parsePngCharaChunk(arrayBuffer: ArrayBuffer): Promise<Record<string, unknown>> {
  const data = new Uint8Array(arrayBuffer)

  // Verify PNG signature
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) {
      throw new Error('不是有效的 PNG 文件')
    }
  }

  let offset = 8 // Skip signature
  let charaText: string | null = null

  // Walk through PNG chunks
  while (offset < data.length) {
    if (offset + 8 > data.length) break

    const length = readUint32(data, offset)
    const type = bytesToString(data, offset + 4, offset + 8)

    if (type === 'tEXt' || type === 'iTXt') {
      const chunkData = data.slice(offset + 8, offset + 8 + length)

      // Find null terminator separating keyword from text
      let nullIndex = -1
      for (let i = 0; i < chunkData.length; i++) {
        if (chunkData[i] === 0) {
          nullIndex = i
          break
        }
      }

      if (nullIndex !== -1) {
        const keyword = bytesToString(chunkData, 0, nullIndex)
        if (keyword === 'chara') {
          if (type === 'iTXt') {
            // iTXt: keyword \0 compression_flag compression_method language_tag \0 translated_keyword \0 text
            let textStart = nullIndex + 1
            // Skip compression flag + compression method (2 bytes)
            textStart += 2
            // Skip language tag (null-terminated)
            while (textStart < chunkData.length && chunkData[textStart] !== 0) textStart++
            textStart++ // skip null
            // Skip translated keyword (null-terminated)
            while (textStart < chunkData.length && chunkData[textStart] !== 0) textStart++
            textStart++ // skip null
            charaText = bytesToString(chunkData, textStart, chunkData.length)
          } else {
            charaText = bytesToString(chunkData, nullIndex + 1, chunkData.length)
          }
          break
        }
      }
    }

    // Move to next chunk: length + type(4) + data(length) + crc(4)
    offset += 12 + length
  }

  if (!charaText) {
    throw new Error('未找到角色卡数据，请确认是有效的 SillyTavern PNG 角色卡')
  }

  // Decode base64
  let jsonString: string
  try {
    jsonString = atob(charaText)
    // Handle UTF-8 encoding
    jsonString = decodeURIComponent(
      jsonString
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
  } catch {
    throw new Error('无法解码 PNG 中的角色卡数据')
  }

  try {
    return JSON.parse(jsonString) as Record<string, unknown>
  } catch {
    throw new Error('PNG 中的角色卡数据不是有效的 JSON')
  }
}

/**
 * 从 PNG 文件导入角色
 */
export async function importCharacterFromPng(file: File): Promise<ICharacter> {
  const buffer = await file.arrayBuffer()
  const raw = await parsePngCharaChunk(buffer)

  // Convert PNG to data URL for avatar
  const blob = new Blob([buffer], { type: 'image/png' })
  const imageDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })

  return charaCardToICharacter(raw, imageDataUrl)
}

/**
 * 从 JSON 文件导入角色
 */
export async function importCharacterFromJson(file: File): Promise<ICharacter> {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new Error('JSON 解析失败，请确认文件内容有效')
  }

  const hasData = raw.data && typeof raw.data === 'object'
  const hasName =
    typeof raw.name === 'string' ||
    (hasData && typeof (raw.data as Record<string, unknown>).name === 'string')

  if (!hasName) {
    throw new Error('无法识别的角色卡格式，目前支持 SillyTavern/Character Card v1/v2/v3')
  }

  return charaCardToICharacter(raw)
}

/**
 * 主入口：根据文件扩展名自动分发
 */
export async function importCharacterFromFile(file: File): Promise<ICharacter> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.png')) {
    return importCharacterFromPng(file)
  } else if (name.endsWith('.json')) {
    return importCharacterFromJson(file)
  } else {
    throw new Error('不支持的文件格式，请上传 .png 或 .json 文件')
  }
}
