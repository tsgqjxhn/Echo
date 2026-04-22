import xingAvatarW from '@/static/images/story/星.webp'
import blurAvatar from '@/static/images/story/模糊轮廓头像.webp'
import shortHairAvatar from '@/static/images/story/短发头像.webp'
import questionAvatar from '@/static/images/story/问号头像.webp'
import theatreScene from '@/static/images/story/剧院高空俯拍.webp'
import cybercafeAlley from '@/static/images/story/废弃网吧巷子.webp'
import classroomScene from '@/static/images/story/惨白教室内部.webp'
import deskScene from '@/static/images/story/沈岚桌面俯拍.webp'
import dockScene from '@/static/images/story/码头暗紫色海面.webp'
import rainyPark from '@/static/images/story/雨夜公园长椅远景.webp'
import arenaScene from '@/static/images/story/零号机地下竞技场.webp'
import courseManual from '@/static/images/story/残缺的课程手册.webp'
import transferDoc from '@/static/images/story/素体移交同意书.webp'
import secretFile from '@/static/images/story/绝密档案照片.webp'

export interface GalleryItem {
  id: string
  src: string
  title: string
  category: 'avatar' | 'scene' | 'item'
}

export const GALLERY_ITEMS: GalleryItem[] = [
  { id: 'avatar-xing', src: xingAvatarW, title: '星', category: 'avatar' },
  { id: 'avatar-blur', src: blurAvatar, title: '模糊轮廓', category: 'avatar' },
  { id: 'avatar-short-hair', src: shortHairAvatar, title: '短发', category: 'avatar' },
  { id: 'avatar-question', src: questionAvatar, title: '???', category: 'avatar' },
  { id: 'scene-theatre', src: theatreScene, title: '剧院高空俯拍', category: 'scene' },
  { id: 'scene-cybercafe', src: cybercafeAlley, title: '废弃网吧巷子', category: 'scene' },
  { id: 'scene-classroom', src: classroomScene, title: '惨白教室内部', category: 'scene' },
  { id: 'scene-desk', src: deskScene, title: '沈岚桌面俯拍', category: 'scene' },
  { id: 'scene-dock', src: dockScene, title: '码头暗紫色海面', category: 'scene' },
  { id: 'scene-rainy-park', src: rainyPark, title: '雨夜公园长椅远景', category: 'scene' },
  { id: 'scene-arena', src: arenaScene, title: '零号机地下竞技场', category: 'scene' },
  { id: 'item-manual', src: courseManual, title: '残缺的课程手册', category: 'item' },
  { id: 'item-transfer', src: transferDoc, title: '素体移交同意书', category: 'item' },
  { id: 'item-secret', src: secretFile, title: '绝密档案照片', category: 'item' },
]

export { xingAvatarW as xingAvatarWebp }

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
