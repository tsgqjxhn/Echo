/**
 * 角色状态管理
 * 使用 Pinia
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ICharacter, CharacterFilter } from '@/types/character'
import { getCharacterService } from '@/services/character'

/**
 * 角色状态接口
 */
export interface CharacterState {
  characters: ICharacter[]
  loading: boolean
  error: string | null
  currentCharacter: ICharacter | null
}

/**
 * 角色 Store
 */
export const useCharacterStore = defineStore('character', () => {
  // 状态
  const characters = ref<ICharacter[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentCharacter = ref<ICharacter | null>(null)

  // 服务实例
  const characterService = getCharacterService()

  // 计算属性
  const favoriteCharacters = computed(() => {
    return characters.value.filter((c: ICharacter) => c.isFavorite)
  })

  const characterCount = computed(() => {
    return characters.value.length
  })

  const favoriteCount = computed(() => {
    return favoriteCharacters.value.length
  })

  // 方法
  /**
   * 加载角色列表
   */
  async function loadCharacters(filter?: CharacterFilter) {
    loading.value = true
    error.value = null

    try {
      const result = await characterService.getList(filter)
      characters.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载角色列表失败'
      console.error('加载角色列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取角色详情
   */
  async function getCharacterById(id: string): Promise<ICharacter | null> {
    loading.value = true
    error.value = null

    try {
      const character = await characterService.getById(id)
      currentCharacter.value = character
      return character
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取角色详情失败'
      console.error('获取角色详情失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建角色
   */
  async function createCharacter(characterData: Partial<ICharacter>): Promise<string> {
    loading.value = true
    error.value = null

    try {
      const id = await characterService.create(characterData as ICharacter)
      await loadCharacters()
      return id
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建角色失败'
      console.error('创建角色失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新角色
   */
  async function updateCharacter(character: ICharacter): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const result = await characterService.update(character)
      await loadCharacters()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新角色失败'
      console.error('更新角色失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除角色
   */
  async function deleteCharacter(id: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const result = await characterService.delete(id)
      await loadCharacters()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除角色失败'
      console.error('删除角色失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换收藏状态
   */
  async function toggleFavorite(id: string): Promise<boolean> {
    try {
      const isFavorite = await characterService.toggleFavorite(id)
      // 更新本地状态
      const index = characters.value.findIndex((c: ICharacter) => c.id === id)
      if (index >= 0) {
        characters.value[index].isFavorite = isFavorite
      }
      if (currentCharacter.value?.id === id) {
        currentCharacter.value.isFavorite = isFavorite
      }
      return isFavorite
    } catch (err) {
      error.value = err instanceof Error ? err.message : '切换收藏状态失败'
      console.error('切换收藏状态失败:', err)
      throw err
    }
  }

  /**
   * 搜索角色
   */
  async function searchCharacters(keyword: string) {
    loading.value = true
    error.value = null

    try {
      const result = await characterService.search(keyword)
      characters.value = result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '搜索角色失败'
      console.error('搜索角色失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 清除当前角色
   */
  function clearCurrentCharacter() {
    currentCharacter.value = null
  }

  /**
   * 清除错误
   */
  function clearError() {
    error.value = null
  }

  return {
    // 状态
    characters,
    loading,
    error,
    currentCharacter,
    // 计算属性
    favoriteCharacters,
    characterCount,
    favoriteCount,
    // 方法
    loadCharacters,
    getCharacterById,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    toggleFavorite,
    searchCharacters,
    clearCurrentCharacter,
    clearError
  }
})
