/**
 * 聊天功能类型定义
 */

import type { ICharacter } from './character'

/**
 * 消息类型枚举
 */
export enum MessageType {
  /** 文字消息 */
  TEXT = 'text',
  /** 图片消息 */
  IMAGE = 'image',
  /** 语音消息 */
  AUDIO = 'audio'
}

/**
 * Token 使用统计
 */
export interface TokenUsage {
  /** 提示词 Token 数 */
  promptTokens: number
  /** 完成 Token 数 */
  completionTokens: number
  /** 总 Token 数 */
  totalTokens: number
}

/**
 * 聊天消息接口
 */
export interface IMessage {
  /** 消息 ID - UUID v4 */
  id: string
  /** 会话 ID */
  sessionId: string
  /** 消息角色：user 用户 / assistant AI */
  role: 'user' | 'assistant'
  /** 内容类型 */
  contentType: MessageType
  /** 消息内容 */
  content: string
  /** 是否点赞 */
  isLiked: boolean
  /** 时间戳 (毫秒) */
  timestamp: number
  /** Token 使用统计 */
  tokenUsage?: TokenUsage
  /** 关联资源 ID */
  assetId?: string
}

/**
 * 聊天会话接口
 */
export interface IChatSession {
  /** 会话 ID - UUID v4 */
  id: string
  /** 角色 ID */
  characterId: string
  /** 创建时间戳 (毫秒) */
  createdAt: number
  /** 更新时间戳 (毫秒) */
  updatedAt: number
  /** 消息数量 */
  messageCount: number
  /** 会话标题 */
  title?: string
  /** 会话模式 */
  mode?: string
}

/**
 * 聊天上下文
 */
export interface ChatContext {
  /** 系统提示词 */
  systemPrompt: string
  /** 消息历史 */
  messages: ChatMessage[]
  /** 历史之后的角色维持提醒 */
  postHistoryPrompt?: string
  /** 角色信息 */
  character?: ICharacter
}

/**
 * 聊天消息（用于 API 请求）
 */
export interface ChatMessage {
  /** 角色 */
  role: 'user' | 'assistant' | 'system'
  /** 内容 */
  content: string | ChatContentPart[]
}

/**
 * 多模态内容部分
 */
export interface ChatContentPart {
  /** 类型 */
  type: 'text' | 'image_url'
  /** 文本内容 */
  text?: string
  /** 图片 URL */
  image_url?: {
    url: string
  }
}

/**
 * 流式响应数据块
 */
export interface ChatChunk {
  /** 内容片段 */
  content: string
  /** 是否为第一个片段 */
  isFirst: boolean
  /** 结束原因 */
  finishReason?: string
  /** Token 使用统计 */
  usage?: TokenUsage
}

/**
 * 创建消息请求
 */
export interface CreateMessageRequest {
  sessionId: string
  role: 'user' | 'assistant'
  contentType: MessageType
  content: string
}

/**
 * 消息列表筛选条件
 */
export interface MessageFilter {
  /** 会话 ID */
  sessionId: string
  /** 消息类型 */
  contentType?: MessageType
  /** 是否只看点赞 */
  likedOnly?: boolean
  /** 页码 */
  page?: number
  /** 每页数量 */
  pageSize?: number
}

/**
 * 语音消息数据
 */
export interface VoiceMessageData {
  /** 音频路径 */
  audioPath: string
  /** 转换文本 */
  text: string
  /** 时长 (秒) */
  duration?: number
}

/**
 * 图片消息数据
 */
export interface ImageMessageData {
  /** 图片路径 */
  imagePath: string
  /** 图片描述 */
  description?: string
}
