function encodeSvg(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function getInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'A'
}

export function createSilverAvatarDataUrl(name: string): string {
  const initial = escapeXml(getInitial(name))
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="silverAvatar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f4f5f6" />
          <stop offset="35%" stop-color="#c5c9cf" />
          <stop offset="68%" stop-color="#8c939d" />
          <stop offset="100%" stop-color="#dfe2e7" />
        </linearGradient>
        <radialGradient id="shine" cx="30%" cy="24%" r="65%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.82)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="240" height="240" rx="120" fill="url(#silverAvatar)" />
      <circle cx="120" cy="120" r="108" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="3" />
      <ellipse cx="88" cy="74" rx="76" ry="54" fill="url(#shine)" />
      <text x="120" y="144" text-anchor="middle" font-size="86" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#20242a">${initial}</text>
    </svg>
  `

  return encodeSvg(svg)
}

export function createSilverBackdropDataUrl(title: string, subtitle: string): string {
  const safeTitle = escapeXml(title.trim() || '未命名角色')
  const safeSubtitle = escapeXml(subtitle.trim() || 'Silver Persona')
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="silverBackdrop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f4f5f6" />
          <stop offset="24%" stop-color="#b7bcc5" />
          <stop offset="56%" stop-color="#6f7782" />
          <stop offset="100%" stop-color="#d9dde2" />
        </linearGradient>
        <radialGradient id="glow" cx="24%" cy="18%" r="70%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.7)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="1200" height="720" rx="44" fill="#0a0b0d" />
      <rect x="18" y="18" width="1164" height="684" rx="38" fill="url(#silverBackdrop)" opacity="0.95" />
      <rect x="36" y="36" width="1128" height="648" rx="32" fill="none" stroke="rgba(255,255,255,0.36)" stroke-width="2" />
      <circle cx="300" cy="220" r="210" fill="url(#glow)" />
      <path d="M140 582C278 480 434 430 614 432c136 0 266 26 392 86" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="18" stroke-linecap="round" />
      <text x="96" y="160" font-size="88" font-family="Segoe UI, Arial, sans-serif" font-weight="700" fill="#101419">${safeTitle}</text>
      <text x="100" y="238" font-size="34" font-family="Segoe UI, Arial, sans-serif" fill="#232a32">${safeSubtitle}</text>
      <text x="100" y="620" font-size="30" font-family="Segoe UI, Arial, sans-serif" fill="#303741">Silver Generated Backdrop</text>
    </svg>
  `

  return encodeSvg(svg)
}
