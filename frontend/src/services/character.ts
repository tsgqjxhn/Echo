import { Character } from '@/entity/character'
import type { CharacterFilter, CharacterValidationResult, ICharacter } from '@/types/character'
import { NotFoundError, ValidationError } from './errors'
import { getStorageDriver, type StorageDriver } from './storage'

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

    const nextCharacter = Character.createEmpty()
    Object.assign(nextCharacter, character)
    nextCharacter.createdAt = Date.now()
    nextCharacter.updatedAt = Date.now()

    await this.storage.saveCharacter(nextCharacter)
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
    await this.storage.saveCharacter(character)
    this.eventBus.emit('character:updated', { id: character.id })
    return true
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id)
    if (!existing) {
      throw new NotFoundError('角色不存在')
    }

    await this.storage.deleteCharacter(id)
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
        const leftValue = left[sortBy] || 0
        const rightValue = right[sortBy] || 0
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
