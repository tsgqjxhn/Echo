/**
 * 《问道长生》Phaser 3 重构版 —— 通用工具函数
 * Phase 1: 核心基础设施
 *
 * 本文件提供游戏各模块共享的纯函数工具方法。
 * 不包含任何状态或副作用（除 generateId 外）。
 */

/**
 * 将数值限制在 [min, max] 范围内
 * @param value 输入值
 * @param min 最小值
 * @param max 最大值
 * @returns 裁剪后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 * 在 a 和 b 之间按 t 比例取值
 * @param a 起始值
 * @param b 结束值
 * @param t 插值系数 0-1
 * @returns 插值结果
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * 大数字格式化
 * 将大数值转换为带单位后缀的字符串（K/M/B）
 * @param n 输入数值
 * @param fractionDigits 小数位数，默认 1
 * @returns 格式化后的字符串，如 "1.5K"、"3.2M"
 */
export function formatNumber(n: number, fractionDigits: number = 1): string {
  if (n === 0) return '0';
  const absN = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (absN < 1000) {
    return `${sign}${absN.toFixed(fractionDigits).replace(/\.0+$/, '')}`;
  }
  if (absN < 1_000_000) {
    return `${sign}${(absN / 1000).toFixed(fractionDigits)}K`;
  }
  if (absN < 1_000_000_000) {
    return `${sign}${(absN / 1_000_000).toFixed(fractionDigits)}M`;
  }
  return `${sign}${(absN / 1_000_000_000).toFixed(fractionDigits)}B`;
}

/**
 * 深拷贝
 * 使用结构化克隆算法实现对象的深度复制
 * 注意：不支持函数、DOM节点、Symbol 等不可序列化类型
 * @param obj 任意对象
 * @returns 深拷贝后的新对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }
  if (obj instanceof Object) {
    const cloned = {} as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
    return cloned as T;
  }
  return obj;
}

/**
 * 生成简单唯一ID
 * 基于时间戳和随机数，非加密安全但足够游戏内使用
 * @param prefix 可选前缀
 * @returns 唯一标识字符串
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 加权随机选择
 * 根据权重从选项列表中随机选取一项
 * @param items 带权重的选项数组
 * @returns 被选中的值
 * @throws 当权重总和小于等于0时抛出错误
 */
export function weightedRandom<T>(items: { weight: number; value: T }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    throw new Error('[weightedRandom] 权重总和必须大于0');
  }

  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item.value;
    }
  }

  // 浮点精度保护，返回最后一项
  return items[items.length - 1].value;
}

/**
 * 根据对象路径获取嵌套值
 * 安全访问深层属性，路径不存在时返回 undefined
 * @param obj 目标对象
 * @param path 点分隔的路径，如 "cultivation.exp"
 * @returns 路径对应的值，或 undefined
 */
export function getByPath<T = unknown>(obj: Record<string, unknown>, path: string): T | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
}

/**
 * 根据对象路径设置嵌套值
 * 自动创建中间不存在的对象层级
 * @param obj 目标对象
 * @param path 点分隔的路径
 * @param value 要设置的值
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * 随机整数 [min, max]
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 * @returns 范围内的随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 从数组中随机选取一个元素
 * @param arr 输入数组
 * @returns 随机选中的元素
 */
export function randomPick<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error('[randomPick] 不能从空数组中选取元素');
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 防抖函数
 * 延迟执行，若在延迟期间再次调用则重置计时器
 * @param fn 目标函数
 * @param delay 延迟毫秒数
 * @returns 防抖包装后的函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 * 限制函数在指定时间间隔内最多执行一次
 * @param fn 目标函数
 * @param interval 间隔毫秒数
 * @returns 节流包装后的函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn(...args);
    }
  };
}
