export type StoryImageCategory = 'avatar' | 'scene' | 'item'

export interface StoryImageAsset {
  id: string
  src: string
  title: string
  category: StoryImageCategory
  usage?: string
  day?: number
  dayLabel?: string
  aliases?: string[]
}

export interface StoryMomentAsset {
  id: string
  imageId: string
  src: string
  content: string
  day?: number
  dayLabel?: string
  trigger?: string
  purpose?: string
  description?: string
}

export const STORY_IMAGE_ASSETS: StoryImageAsset[] = []
export const STORY_MOMENT_ASSETS: StoryMomentAsset[] = []

export const STORY_IMAGE_ASSET_BY_ID = new Map<string, StoryImageAsset>()
export const STORY_MOMENT_ASSET_BY_ID = new Map<string, StoryMomentAsset>()

export function getStoryImageAsset(_idOrTitle: string): StoryImageAsset | null {
  return null
}

export function getStoryMomentAsset(_id: string): StoryMomentAsset | null {
  return null
}
