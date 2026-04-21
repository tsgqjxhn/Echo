import type { Router } from 'vue-router'
import type { ICharacter } from '@/types/character'
import { getStorageDriver } from '@/services/storage'
import {
  ECHO_STORY_CHARACTER_ID,
  ensureStoryCharacter,
  loadStoryLibrary
} from '@/services/story-conversations'

export async function getSwitchableLocalCharacters(excludeCharacterIds: string[] = []): Promise<ICharacter[]> {
  const storage = getStorageDriver()
  const excluded = new Set(excludeCharacterIds.filter(Boolean))

  const storyLibrary = loadStoryLibrary()
  await ensureStoryCharacter(storyLibrary.characterName).catch(() => undefined)

  const characters = await storage.getAllCharacters()
  return characters.filter(character => {
    if (!character?.id || excluded.has(character.id)) {
      return false
    }

    return true
  })
}

export async function pickRandomLocalCharacter(excludeCharacterIds: string[] = []): Promise<ICharacter | null> {
  const candidates = await getSwitchableLocalCharacters(excludeCharacterIds)
  if (candidates.length === 0) {
    return null
  }

  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index]
}

export async function switchToRandomLocalCharacter(
  router: Router,
  options: {
    excludeCharacterIds?: string[]
    replace?: boolean
  } = {}
): Promise<ICharacter | null> {
  const character = await pickRandomLocalCharacter(options.excludeCharacterIds || [])
  if (!character) {
    return null
  }

  const navigate = options.replace ? router.replace : router.push
  if (character.id === ECHO_STORY_CHARACTER_ID || character.sourceType === 'builtin-story') {
    await navigate('/dialogue')
    return character
  }

  await navigate(`/chat/${encodeURIComponent(character.id)}`)
  return character
}
