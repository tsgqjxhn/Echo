import { openaiAdapter } from '../openai'

export const zhipuAdapter = {
  ...openaiAdapter,
  providerId: 'zhipu' as const,
}
