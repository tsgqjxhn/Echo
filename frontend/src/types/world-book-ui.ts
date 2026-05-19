export interface WorldBookEntryUI {
  id: string
  keywords: string[]
  keywordInput: string
  content: string
  order: number
  enabled: boolean
  position: number
  depth: number
  role: number
  probability: number
  comment: string
  dynamicAnchor?: string
  userPersona?: string
  compatibilityScore?: number
  relationshipTrigger?: string
}

export interface WorldBookUI {
  id: string
  name: string
  entries: WorldBookEntryUI[]
  scanRange: number
  _expanded: boolean
}
