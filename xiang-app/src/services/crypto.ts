/**
 * 加密服务
 * 使用 AES 加密算法对敏感数据（如 API 密钥）进行加密存储
 */

import CryptoJS from 'crypto-js';

/**
 * 加密密钥（实际项目中应该使用更安全的方式管理密钥）
 * 在 UniApp 中，可以使用应用级别的常量
 */
const ENCRYPTION_KEY = 'xiang-app-secret-key-2024';

/**
 * 加密服务类
 */
class CryptoService {
  /**
   * 加密文本
   * @param text 要加密的文本
   * @returns 加密后的字符串（Base64 编码）
   */
  async encrypt(text: string): Promise<string> {
    try {
      const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error('[CryptoService] 加密失败:', error);
      throw new Error('数据加密失败');
    }
  }

  /**
   * 解密文本
   * @param encryptedText 要解密的加密文本
   * @returns 解密后的原始文本
   */
  async decrypt(encryptedText: string): Promise<string> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
      const originalText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!originalText) {
        throw new Error('解密结果为空');
      }
      
      return originalText;
    } catch (error) {
      console.error('[CryptoService] 解密失败:', error);
      throw new Error('数据解密失败');
    }
  }

  /**
   * 生成随机密钥
   * @param length 密钥长度
   * @returns 随机生成的密钥字符串
   */
  generateSecretKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 计算哈希值（用于数据完整性校验）
   * @param data 要计算哈希的数据
   * @returns SHA256 哈希值
   */
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }
}

// 导出单例
export const cryptoService = new CryptoService();

// 导出类供测试使用
export { CryptoService };
