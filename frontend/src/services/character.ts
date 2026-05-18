import type { ICharacter } from '@/types/character'
import { NotFoundError, ValidationError } from './errors'
import { getStorageDriver, type StorageDriver } from './storage'
import { deleteCharacterProfileJSON, saveCharacterProfileJSON } from './character-profile-json'
import { deleteCompressedCharacterPrompts } from './character-prompt-compression'
import { isRemoteAssetURL, uploadAsset } from './files'

/**
 * 上传角色媒体资产（头像、封面、语音样本）
 * 如果是本地临时路径或 base64，则上传到服务器并返回相对路径
 * 如果已经是远程 URL 或相对路径，则原样返回
 */
async function uploadCharacterMedia(character: Partial<ICharacter>): Promise<void> {
  const fields: Array<{ key: 'avatar' | 'coverImage' | 'voiceSample'; type: 'avatar' | 'cover' | 'voice' }> = [
    { key: 'avatar', type: 'avatar' },
    { key: 'coverImage', type: 'cover' },
    { key: 'voiceSample', type: 'voice' },
  ]

  for (const { key, type } of fields) {
    const value = character[key]
    if (!value) continue
    // 已经是相对路径或远程 URL，跳过
    if (!isRemoteAssetURL(value)) continue
    // data URL 或 blob URL 需要上传
    try {
      const relativePath = await uploadAsset(value, type)
      ;(character as Record<string, string>)[key] = relativePath
    } catch (err) {
      console.warn(`Failed to upload ${key}:`, err)
      // 上传失败时保留原值，避免阻断保存流程
    }
  }
}

export interface CharacterFilter {
  favorite?: boolean
  keyword?: string
  sortBy?: keyof ICharacter
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface CharacterValidationResult {
  valid: boolean
  errors: string[]
}

function createEmptyCharacter(): ICharacter {
  const now = Date.now()
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${now}_${Math.random().toString(36).slice(2)}`,
    name: '',
    description: '',
    settings: '',
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  }
}

export interface EventBus {
  emit(event: string, data?: any): void
  on(event: string, callback: (data?: any) => void): void
  off(event: string, callback: (data?: any) => void): void
}

type CharacterFlagEndpoint = 'favorite' | 'friend' | 'like'

class SimpleEventBus implements EventBus {
  private events: Map<string, Set<(data?: any) => void>> = new Map()

  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  on(event: string, callback: (data?: any) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }

    this.events.get(event)!.add(callback)
  }

  off(event: string, callback: (data?: any) => void): void {
    this.events.get(event)?.delete(callback)
  }
}

export class CharacterService {
  private storage: StorageDriver
  private eventBus: EventBus

  constructor(storage?: StorageDriver, eventBus?: EventBus) {
    this.storage = storage || getStorageDriver()
    this.eventBus = eventBus || new SimpleEventBus()
  }

  async create(character: ICharacter): Promise<string> {
    const validation = this.validate(character)
    if (!validation.valid) {
      throw new ValidationError('角色数据校验失败', validation.errors)
    }

    const nextCharacter = createEmptyCharacter()
    Object.assign(nextCharacter, character)
    nextCharacter.createdAt = Date.now()
    nextCharacter.updatedAt = Date.now()

    await uploadCharacterMedia(nextCharacter)
    await this.storage.saveCharacter(nextCharacter)
    saveCharacterProfileJSON(nextCharacter)
    this.eventBus.emit('character:created', { id: nextCharacter.id })
    return nextCharacter.id
  }

  async update(character: ICharacter): Promise<boolean> {
    const validation = this.validate(character)
    if (!validation.valid) {
      throw new ValidationError('角色数据校验失败', validation.errors)
    }

    const existing = await this.getById(character.id)
    if (!existing) {
      throw new NotFoundError('角色不存在')
    }

    character.updatedAt = Date.now()
    await uploadCharacterMedia(character)
    await this.storage.saveCharacter(character)
    saveCharacterProfileJSON(character)
    void deleteCompressedCharacterPrompts(character.id).catch(() => undefined)
    this.eventBus.emit('character:updated', { id: character.id })
    return true
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id)
    if (!existing) {
      throw new NotFoundError('角色不存在')
    }

    await this.storage.deleteCharacter(id)
    deleteCharacterProfileJSON(id)
    void deleteCompressedCharacterPrompts(id).catch(() => undefined)
    this.eventBus.emit('character:deleted', { id })
    return true
  }

  async getById(id: string): Promise<ICharacter | null> {
    return this.storage.getCharacter(id)
  }

  async getList(filter?: CharacterFilter): Promise<ICharacter[]> {
    let characters = await this.storage.getAllCharacters()

    if (filter?.favorite !== undefined) {
      characters = characters.filter(character => character.isFavorite === filter.favorite)
    }

    if (filter?.keyword) {
      const keyword = filter.keyword.toLowerCase()
      characters = characters.filter(character =>
        character.name.toLowerCase().includes(keyword) ||
        character.description.toLowerCase().includes(keyword)
      )
    }

    if (filter?.sortBy) {
      const { sortBy, sortOrder } = filter
      characters.sort((left, right) => {
        const key = sortBy as keyof ICharacter
        const leftValue = (left[key] as unknown as number | string) || 0
        const rightValue = (right[key] as unknown as number | string) || 0
        const result = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
        return sortOrder === 'desc' ? -result : result
      })
    }

    if (filter?.page !== undefined && filter.pageSize) {
      const start = filter.page * filter.pageSize
      characters = characters.slice(start, start + filter.pageSize)
    }

    return characters
  }

  async search(keyword: string): Promise<ICharacter[]> {
    return this.getList({
      keyword,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    })
  }

  async toggleFavorite(id: string): Promise<boolean> {
    const character = await this.toggleCharacterFlag(id, 'favorite')
    this.eventBus.emit('character:favorite_toggled', {
      id,
      isFavorite: character.isFavorite,
    })
    return character.isFavorite
  }

  async toggleLike(id: string): Promise<boolean> {
    const character = await this.toggleCharacterFlag(id, 'like')
    return character.isLiked ?? false
  }

  async toggleFriend(id: string): Promise<boolean> {
    const character = await this.toggleCharacterFlag(id, 'friend')
    return character.isFriend ?? false
  }

  private async toggleCharacterFlag(id: string, endpoint: CharacterFlagEndpoint): Promise<ICharacter> {
    const character = await this.requireCharacter(id)
    character.updatedAt = Date.now()

    if (endpoint === 'favorite') {
      character.isFavorite = !character.isFavorite
    } else if (endpoint === 'like') {
      character.isLiked = !character.isLiked
    } else {
      character.isFriend = !character.isFriend
    }

    await this.storage.saveCharacter(character)
    saveCharacterProfileJSON(character)
    void deleteCompressedCharacterPrompts(character.id).catch(() => undefined)
    return character
  }

  private async requireCharacter(id: string): Promise<ICharacter> {
    const character = await this.getById(id)
    if (!character) {
      throw new NotFoundError('角色不存在')
    }

    return character
  }

  private validate(character: ICharacter): CharacterValidationResult {
    const errors: string[] = []

    if (!character.name || character.name.trim().length === 0) {
      errors.push('角色名称不能为空')
    } else if (character.name.length > 50) {
      errors.push('角色名称不能超过 50 个字符')
    }

    if (!character.description || character.description.trim().length === 0) {
      errors.push('角色描述不能为空')
    } else if (character.description.length > 1000) {
      errors.push('角色描述不能超过 1000 个字符')
    }

    if (!character.settings || character.settings.trim().length === 0) {
      errors.push('角色设定不能为空')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  getEventBus(): EventBus {
    return this.eventBus
  }
}

let characterServiceInstance: CharacterService | null = null

export function getCharacterService(): CharacterService {
  if (!characterServiceInstance) {
    characterServiceInstance = new CharacterService()
  }

  return characterServiceInstance
}
