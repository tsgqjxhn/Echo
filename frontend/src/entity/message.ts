/**
 * 聊天消息实体类
 */

import type { IMessage, TokenUsage, VoiceMessageData, ImageMessageData } from '@/types/chat'
import { MessageType } from '@/types/chat'
import { generateUUID } from '@/utils/uuid'

/**
 * 聊天消息实体类
 */
export class Message implements IMessage {
  id: string = ''
  sessionId: string = ''
  role: 'user' | 'assistant' = 'user'
  contentType: MessageType = MessageType.TEXT
  content: string = ''
  isLiked: boolean = false
  timestamp: number = 0
  tokenUsage?: TokenUsage

  /**
   * 构造函数
   */
  constructor(data?: Partial<Message>) {
    if (data) {
      Object.assign(this, data)
    }
  }

  /**
   * 判断是否为用户消息
   */
  isUser(): boolean {
    return this.role === 'user'
  }

  /**
   * 判断是否为 AI 消息
   */
  isAssistant(): boolean {
    return this.role === 'assistant'
  }

  /**
   * 获取格式化时间
   */
  getFormattedTime(): string {
    const date = new Date(this.timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 今天内显示时分
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 显示日期
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  }

  /**
   * 获取语音消息数据
   */
  getVoiceData(): VoiceMessageData | null {
    if (this.contentType !== MessageType.AUDIO) {
      return null
    }
    try {
      return JSON.parse(this.content) as VoiceMessageData
    } catch {
      return null
    }
  }

  /**
   * 获取图片消息数据
   */
  getImageData(): ImageMessageData | null {
    if (this.contentType !== MessageType.IMAGE) {
      return null
    }
    try {
      return JSON.parse(this.content) as ImageMessageData
    } catch {
      // 兼容旧数据格式（直接存储路径）
      return { imagePath: this.content }
    }
  }

  /**
   * 获取纯文本内容
   */
  getTextContent(): string {
    if (this.contentType === MessageType.TEXT) {
      return this.content
    } else if (this.contentType === MessageType.AUDIO) {
      const voiceData = this.getVoiceData()
      return voiceData?.text || ''
    }
    return ''
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): object {
    return {
      id: this.id,
      sessionId: this.sessionId,
      role: this.role,
      contentType: this.contentType,
      content: this.content,
      isLiked: this.isLiked,
      timestamp: this.timestamp,
      tokenUsage: this.tokenUsage
    }
  }

  /**
   * 从 JSON 对象创建消息
   */
  static fromJSON(data: object): Message {
    return new Message(data)
  }

  /**
   * 创建文字消息
   */
  static createText(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Message {
    return new Message({
      id: generateUUID(),
      sessionId,
      role,
      contentType: MessageType.TEXT,
      content,
      isLiked: false,
      timestamp: Date.now()
    })
  }

  /**
   * 创建图片消息
   */
  static createImage(
    sessionId: string,
    role: 'user' | 'assistant',
    imagePath: string,
    description?: string
  ): Message {
    return new Message({
      id: generateUUID(),
      sessionId,
      role,
      contentType: MessageType.IMAGE,
      content: JSON.stringify({ imagePath, description } as ImageMessageData),
      isLiked: false,
      timestamp: Date.now()
    })
  }

  /**
   * 创建语音消息
   */
  static createVoice(
    sessionId: string,
    role: 'user' | 'assistant',
    audioPath: string,
    text: string,
    duration?: number
  ): Message {
    return new Message({
      id: generateUUID(),
      sessionId,
      role,
      contentType: MessageType.AUDIO,
      content: JSON.stringify({ audioPath, text, duration } as VoiceMessageData),
      isLiked: false,
      timestamp: Date.now()
    })
  }

  /**
   * 创建空消息（用于流式响应）
   */
  static createEmpty(sessionId: string): Message {
    return new Message({
      id: generateUUID(),
      sessionId,
      role: 'assistant',
      contentType: MessageType.TEXT,
      content: '',
      isLiked: false,
      timestamp: Date.now()
    })
  }
}
