import { useRouter } from 'vue-router'

/** 角色创建/编辑页共享导航 */
export function useCharacterEditor() {
  const router = useRouter()

  function goBack(fallback = '/character') {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return { goBack }
}
