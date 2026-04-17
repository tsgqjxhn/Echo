import {
  STORY_IMPORTED_CHARACTER,
  STORY_IMPORTED_SEGMENTS,
  STORY_IMPORTED_TITLE,
  type ImportedDialogueChoiceOption,
  type ImportedDialogueMessage,
  type ImportedDialogueRole,
  type ImportedDialogueSegment,
  type ImportedDialogueVariant,
} from './story.generated'

export type DialogueRole = ImportedDialogueRole
export type DialogueVariant = ImportedDialogueVariant
export type DialogueMessage = ImportedDialogueMessage
export type DialogueChoiceOption = ImportedDialogueChoiceOption
export type DialogueMessageSegment = ImportedDialogueSegment & { kind: 'messages' }
export type DialogueChoiceSegment = ImportedDialogueSegment & { kind: 'choice' }
export type DialogueSegment = DialogueMessageSegment | DialogueChoiceSegment

export const STORY_TITLE = STORY_IMPORTED_TITLE
export const STORY_CHARACTER_NAME = STORY_IMPORTED_CHARACTER
export const STORY_SEGMENTS: DialogueSegment[] = STORY_IMPORTED_SEGMENTS
