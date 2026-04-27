import { STORY_IMAGE_ASSETS, xingAvatarWebp, type StoryImageAsset } from './story-assets'

export type GalleryItem = StoryImageAsset

export const GALLERY_ITEMS: GalleryItem[] = STORY_IMAGE_ASSETS

export { xingAvatarWebp }

const GALLERY_PROGRESS_KEY = 'echo-gallery-unlocked'

export function getUnlockedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(GALLERY_PROGRESS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function saveUnlockedIds(ids: Set<string>): void {
  localStorage.setItem(GALLERY_PROGRESS_KEY, JSON.stringify([...ids]))
}

export function unlockGalleryItem(id: string): void {
  const ids = getUnlockedIds()
  if (ids.has(id)) return
  ids.add(id)
  saveUnlockedIds(ids)
}

export function unlockAllGalleryItems(): void {
  const ids = new Set(GALLERY_ITEMS.map(item => item.id))
  saveUnlockedIds(ids)
}

export function isGalleryItemUnlocked(id: string): boolean {
  return getUnlockedIds().has(id)
}
