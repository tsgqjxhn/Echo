/**
 * API Key 加密工具
 * 使用设备级密钥进行 AES 加密，确保密钥不硬编码
 */

import CryptoJS from 'crypto-js'
import { generateUUID } from '@/utils/uuid'

const DEVICE_ID_KEY = 'echo_device_id'
const ENC_PREFIX = 'enc:'

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const newId = generateUUID()
    localStorage.setItem(DEVICE_ID_KEY, newId)
    return newId
  } catch {
    // fallback for environments without localStorage
    return fallbackDeviceKey()
  }
}

function fallbackDeviceKey(): string {
  const raw = (typeof navigator !== 'undefined' ? navigator.userAgent : '') + 'echo_salt_v2'
  return CryptoJS.SHA256(raw).toString(CryptoJS.enc.Hex).slice(0, 32)
}

function deriveKey(password?: string): string {
  const deviceId = password || getOrCreateDeviceId()
  return CryptoJS.SHA256(deviceId + '_echo_key_derivation').toString(CryptoJS.enc.Hex).slice(0, 32)
}

export function encryptApiKey(plainText: string, password?: string): string {
  if (!plainText) return plainText
  if (plainText.startsWith(ENC_PREFIX)) return plainText
  const key = deriveKey(password)
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()
  return ENC_PREFIX + encrypted
}

export function decryptApiKey(cipherText: string, password?: string): string {
  if (!cipherText) return cipherText
  if (!cipherText.startsWith(ENC_PREFIX)) return cipherText
  const key = deriveKey(password)
  const payload = cipherText.slice(ENC_PREFIX.length)
  try {
    const decrypted = CryptoJS.AES.decrypt(payload, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })
    const result = decrypted.toString(CryptoJS.enc.Utf8)
    if (!result) throw new Error('解密结果为空')
    return result
  } catch (e) {
    console.error('[crypto] API Key 解密失败:', e)
    return cipherText
  }
}

export function isEncryptedApiKey(value: string): boolean {
  return !!value && value.startsWith(ENC_PREFIX)
}

// 兼容性：保留旧的 CryptoService 类，供其他可能使用的地方引用
class CryptoService {
  async encrypt(text: string): Promise<string> {
    return encryptApiKey(text)
  }

  async decrypt(encryptedText: string): Promise<string> {
    return decryptApiKey(encryptedText)
  }

  generateSecretKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  hash(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex)
  }
}

export const cryptoService = new CryptoService()
export { CryptoService }
