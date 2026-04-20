/**
 * AI 角色实体类
 */

import type { ICharacter, CreateCharacterRequest, CharacterValidationResult } from '@/types/character'
import { generateUUID } from '@/utils/uuid'

/**
 * AI 角色实体类
 */
export class Character implements ICharacter {
  id: string = ''
  name: string = ''
  avatar?: string
  background?: string
  description: string = ''
  greeting?: string
  settings: string = ''
  isFavorite: boolean = false
  createdAt: number = 0
  updatedAt: number = 0

  /**
   * 构造函数
   */
  constructor(data?: Partial<Character>) {
    if (data) {
      Object.assign(this, data)
    }
  }

  /**
   * 验证角色数据有效性
   * @returns 验证结果
   */
  validate(): CharacterValidationResult {
    const errors: string[] = []

    // 验证名称
    if (!this.name || this.name.trim().length === 0) {
      errors.push('角色名称不能为空')
    } else if (this.name.length > 50) {
      errors.push('角色名称不能超过 50 个字符')
    }

    // 验证描述
    if (!this.description || this.description.trim().length === 0) {
      errors.push('角色描述不能为空')
    } else if (this.description.length > 1000) {
      errors.push('角色描述不能超过 1000 个字符')
    }

    // 验证设定
    if (!this.settings || this.settings.trim().length === 0) {
      errors.push('总体设定不能为空')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      background: this.background,
      description: this.description,
      greeting: this.greeting,
      settings: this.settings,
      isFavorite: this.isFavorite,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * 从 JSON 对象创建角色
   */
  static fromJSON(data: object): Character {
    return new Character(data)
  }

  /**
   * 创建空角色实例
   */
  static createEmpty(): Character {
    return new Character({
      id: generateUUID(),
      name: '',
      description: '',
      settings: '',
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }

  /**
   * 从创建请求创建角色
   */
  static createFromRequest(request: CreateCharacterRequest): Character {
    return new Character({
      id: generateUUID(),
      name: request.name,
      avatar: request.avatar,
      background: request.background,
      description: request.description,
      greeting: request.greeting,
      settings: request.settings,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }
}
