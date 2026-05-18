import type { DialogueSegment } from '@/data/story'
import { loadStoryLibrary } from './story-conversations'

export interface StoryRuntimePayload {
  title: string
  characterName: string
  segments: DialogueSegment[]
}

function cloneSegments(segments: DialogueSegment[]): DialogueSegment[] {
  return segments.map(segment => ({
    ...segment,
    messages: segment.messages.map(message => ({ ...message })),
    options: segment.options.map(option => ({
      ...option,
      branchMessages: option.branchMessages.map(message => ({ ...message })),
    })),
  }))
}

export async function fetchDefaultStory(): Promise<StoryRuntimePayload> {
  const story = loadStoryLibrary()
  const segments = story.conversations.flatMap(conversation => cloneSegments(conversation.segments))

  return {
    title: story.storyName,
    characterName: story.characterName || '',
    segments,
  }
}
