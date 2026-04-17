export interface ICharacter {
  id: string
  name: string
  avatar?: string
  background?: string
  description: string
  greeting?: string
  settings: string
  isFavorite: boolean
  createdAt: number
  updatedAt: number
  mode?: 'challenge-dialogue' | 'free-dialogue' | 'group-chat' | 'group-challenge'
  category?: string
  subCategory?: string
  avatarTone?: string
  backgroundImage?: string
  personality?: string
  behavior?: string
  values?: string
  members?: string[]
  tags?: string[]
  sourceType?: 'manual' | 'document-import' | 'builtin-story'
  sourceName?: string
}

export interface CreateCharacterRequest {
  name: string
  avatar?: string
  background?: string
  description: string
  greeting?: string
  settings: string
  mode?: ICharacter['mode']
  category?: string
  subCategory?: string
  avatarTone?: string
  backgroundImage?: string
  personality?: string
  behavior?: string
  values?: string
  members?: string[]
  tags?: string[]
  sourceType?: ICharacter['sourceType']
  sourceName?: string
}

export interface UpdateCharacterRequest extends CreateCharacterRequest {
  id: string
}

export interface CharacterFilter {
  favorite?: boolean
  keyword?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'name'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface CharacterValidationResult {
  valid: boolean
  errors: string[]
}
