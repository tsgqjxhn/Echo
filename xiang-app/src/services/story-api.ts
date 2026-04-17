import type { DialogueSegment } from '@/data/story'
import { requestJSON } from './http'

interface StoryMessage {
  id: string
  role: 'me' | 'other' | 'system'
  text: string
  variant: 'message' | 'scene' | 'hint'
  delay: number
  typing: number
  hidden: boolean
}

interface StoryChoiceOption {
  id: string
  key: string
  text: string
  retry: boolean
  branchMessages: StoryMessage[]
}

interface StorySegmentResponse {
  id: string
  kind: 'messages' | 'choice'
  scene: string | null
  prompt: string | null
  messages: StoryMessage[]
  options: StoryChoiceOption[]
}

interface StoryResponse {
  id: string
  title: string
  characterName: string | null
  segments: StorySegmentResponse[]
}

export interface StoryRuntimePayload {
  title: string
  characterName: string
  segments: DialogueSegment[]
}

function mapSegment(segment: StorySegmentResponse): DialogueSegment {
  if (segment.kind === 'choice') {
    return {
      id: segment.id,
      kind: 'choice',
      scene: segment.scene ?? null,
      prompt: segment.prompt ?? null,
      messages: [],
      options: segment.options.map(option => ({
        id: option.id,
        key: option.key,
        text: option.text,
        retry: option.retry,
        branchMessages: option.branchMessages.map(message => ({
          id: message.id,
          role: message.role,
          text: message.text,
          variant: message.variant,
          delay: message.delay,
          typing: message.typing,
          hidden: message.hidden
        }))
      }))
    }
  }

  return {
    id: segment.id,
    kind: 'messages',
    scene: segment.scene ?? null,
    prompt: segment.prompt ?? null,
    messages: segment.messages.map(message => ({
      id: message.id,
      role: message.role,
      text: message.text,
      variant: message.variant,
      delay: message.delay,
      typing: message.typing,
      hidden: message.hidden
    })),
    options: []
  }
}

export async function fetchDefaultStory(): Promise<StoryRuntimePayload> {
  const story = await requestJSON<StoryResponse>('/api/story/default')
  return {
    title: story.title,
    characterName: story.characterName || '星',
    segments: story.segments.map(mapSegment)
  }
}
