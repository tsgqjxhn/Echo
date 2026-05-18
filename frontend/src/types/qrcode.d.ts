declare module 'qrcode' {
  export function toDataURL(
    text: string,
    options?: {
      width?: number
      margin?: number
      color?: {
        dark?: string
        light?: string
      }
    }
  ): Promise<string>
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: Record<string, unknown>
  ): Promise<void>
}
