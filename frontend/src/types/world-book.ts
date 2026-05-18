/**
 * World Book（世界书）— 独立命名的可复用知识库
 * 与 Lorebook（角色内嵌知识库）并列，一个角色可绑定多个世界书
 */

export interface WorldBookEntry {
  id: string
  keywords: string[]
  content: string
  order: number
  enabled: boolean
  /** 位置: 0=before, 1=after, 2=EMTop, 3=EMBottom, 4=ANTop, 5=ANBottom, 6=atDepth, 7=outlet */
  position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  depth: number
  /** 0=system, 1=user, 2=assistant */
  role: 0 | 1 | 2
  /** 触发概率 0-100，默认 100 */
  probability: number
  /** 注释/备注 */
  comment?: string
  /** 词条类型 */
  type?: 'profile' | 'world_info' | 'dialogue' | 'style'
  /** 绑定的角色 ID（空 = 全局） */
  characterId?: string
  /** 动态角色注释/心理锚点 */
  dynamicAnchor?: string
  /** 用户画像与长期关系演算 */
  userPersona?: string
  /** 契合度/联结度指标 0-100 */
  compatibilityScore?: number
  /** 当前关系阶段 */
  relationshipStage?: 'stranger' | 'familiar' | 'trusted' | 'intimate' | 'hostile' | 'reconciled'
  /** 关系阶段触发条件 */
  relationshipTrigger?: string
}

export interface WorldBook {
  id: string
  name: string
  /** 世界书描述 */
  description?: string
  entries: WorldBookEntry[]
  /** 扫描消息范围，默认 100 */
  scanRange: number
}
