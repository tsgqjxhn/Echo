import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { createServer } from 'node:http'

const projectRoot = resolve(import.meta.dirname, '..')
const distRoot = join(projectRoot, 'dist')
const port = Number.parseInt(process.env.PORT || '5173', 10)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function getFilePath(urlPath = '/') {
  const cleanPath = urlPath.split('?')[0].split('#')[0]
  const relativePath = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '')
  const normalizedPath = normalize(relativePath)
  const absolutePath = resolve(distRoot, normalizedPath)

  if (!absolutePath.startsWith(distRoot)) {
    return null
  }

  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
    return absolutePath
  }

  return join(distRoot, 'index.html')
}

const server = createServer((request, response) => {
  const filePath = getFilePath(request.url)

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not Found')
    return
  }

  const fileExtension = extname(filePath).toLowerCase()
  const contentType = mimeTypes[fileExtension] || 'application/octet-stream'

  response.writeHead(200, { 'Content-Type': contentType })
  createReadStream(filePath).pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`static-server:${port}\n`)
})

server.on('error', error => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`)
  process.exit(1)
})
