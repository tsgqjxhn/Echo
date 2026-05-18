/**
 * Vue 全局属性类型声明
 */

export {}

declare module 'vue' {
  interface ComponentCustomProperties {
    /**
     * 全局翻译函数
     * 用法：{{ $t('中文原文') }}
     */
    $t: (key: string) => string
  }
}
