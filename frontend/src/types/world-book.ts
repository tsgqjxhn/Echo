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
}

export interface WorldBook {
  id: string
  name: string
  entries: WorldBookEntry[]
  /** 扫描消息范围，默认 100 */
  scanRange: number
}
