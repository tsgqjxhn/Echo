import type { UserInfo } from '@/types/user'
import { storageDriver } from './storage'
import { apiConfigService } from './api-config'

const DEFAULT_USER_INFO: Required<Pick<UserInfo, 'name' | 'globalPrompt' | 'fortuneCoins' | 'chatLevel' | 'gameLevel'>> = {
  name: '',
  globalPrompt: '',
  fortuneCoins: 0,
  chatLevel: 1,
  gameLevel: 1
}

class UserService {
  async getUserInfo(): Promise<UserInfo> {
    const storedInfo = await storageDriver.getUserInfo()

    return {
      ...DEFAULT_USER_INFO,
      ...storedInfo
    }
  }

  async updateUserInfo(info: Partial<UserInfo>): Promise<void> {
    const currentInfo = await this.getUserInfo()
    await storageDriver.saveUserInfo({
      ...currentInfo,
      ...info
    })
  }

  async updateUserName(name: string): Promise<void> {
    await this.updateUserInfo({ name })
  }

  async updateUserAvatar(avatar: string): Promise<void> {
    await this.updateUserInfo({ avatar })
  }

  async getGlobalPrompt(): Promise<string> {
    const info = await this.getUserInfo()
    return info.globalPrompt || ''
  }

  async updateGlobalPrompt(prompt: string): Promise<void> {
    await this.updateUserInfo({ globalPrompt: prompt })
  }

  async hasAPIKey(): Promise<boolean> {
    return apiConfigService.hasConfig()
  }

  async clearAllData(): Promise<void> {
    await storageDriver.clear()
  }
}

export const userService = new UserService()

export { UserService }
