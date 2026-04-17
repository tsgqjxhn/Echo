import {
  PART_ONE_IMPORTED_CHARACTER,
  PART_ONE_IMPORTED_SEGMENTS,
  PART_ONE_IMPORTED_TITLE,
  type ImportedDialogueChoiceOption,
  type ImportedDialogueMessage,
  type ImportedDialogueRole,
  type ImportedDialogueSegment,
  type ImportedDialogueVariant,
} from './dialogue-part-one.generated'

export type DialogueRole = ImportedDialogueRole
export type DialogueVariant = ImportedDialogueVariant
export type DialogueMessage = ImportedDialogueMessage
export type DialogueChoiceOption = ImportedDialogueChoiceOption
export type DialogueMessageSegment = ImportedDialogueSegment & { kind: 'messages' }
export type DialogueChoiceSegment = ImportedDialogueSegment & { kind: 'choice' }
export type DialogueSegment = DialogueMessageSegment | DialogueChoiceSegment

export const PART_ONE_TITLE = PART_ONE_IMPORTED_TITLE
export const PART_ONE_CHARACTER_NAME = PART_ONE_IMPORTED_CHARACTER
export const PART_ONE_SEGMENTS: DialogueSegment[] = PART_ONE_IMPORTED_SEGMENTS
