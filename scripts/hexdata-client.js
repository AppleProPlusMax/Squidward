// Hexdata 抓取客户端：gzip 传输、按版本缓存、ETag 条件请求、限流时按服务器要求等待后续跑。
// 所有请求串行，两次网络请求之间至少间隔 HEXDATA_GAP 秒（默认 2）。
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const CACHE_ROOT = path.join(ROOT, "data", ".hexdata")
const BASE = "https://hexdata.com.cn"
const GAP_MS = Number(process.env.HEXDATA_GAP || 2) * 1000
const MAX_ATTEMPTS = 12
const REFRESH = process.argv.includes("--refresh")
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (personal use; hex-aram-helper)",
  "Accept-Encoding": "gzip, br"
}

let lastRequestAt = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function politeGap() {
  const wait = lastRequestAt + GAP_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
}

function retryAfter(res, body) {
  const header = Number(res.headers.get("retry-after"))
  if (header > 0) return header
  const hit = String(body).match(/"retryAfterSeconds"\s*:\s*(\d+)/)
  return hit ? Number(hit[1]) : 0
}

function readMeta(file) {
  try {
    return JSON.parse(fs.readFileSync(file + ".meta", "utf8"))
  } catch (err) {
    return {}
  }
}

/**
 * 取一个 URL 的文本。
 * - cacheFile：有缓存且未加 --refresh 时直接读缓存，不发请求；加 --refresh 时带 ETag 发条件请求，304 则复用缓存。
 * - isValid(body)：判断响应是否是想要的内容，不是就当作被限流处理。
 */
async function fetchText(url, { cacheFile, isValid = () => true } = {}) {
  const cached = cacheFile && fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, "utf8") : null
  if (cached && isValid(cached) && !REFRESH) return cached

  const meta = cached ? readMeta(cacheFile) : {}
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await politeGap()
    const headers = Object.assign({}, HEADERS)
    if (cached && meta.etag) headers["If-None-Match"] = meta.etag
    if (cached && meta.lastModified) headers["If-Modified-Since"] = meta.lastModified

    let res
    let body = ""
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(60000) })
      if (res.status === 304 && cached) return cached
      body = await res.text()
    } catch (err) {
      const wait = Math.min(60, 5 * attempt)
      console.log("  network error:", err.message, "- retry in", wait, "s")
      await sleep(wait * 1000)
      continue
    }

    if (res.ok && isValid(body)) {
      if (cacheFile) {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
        fs.writeFileSync(cacheFile, body)
        fs.writeFileSync(
          cacheFile + ".meta",
          JSON.stringify({ url, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") })
        )
      }
      return body
    }

    const wait = retryAfter(res, body) || Math.min(120, 10 * attempt)
    console.log("  rate limited (" + res.status + "), waiting", wait + 1, "s then continue:", url)
    await sleep((wait + 1) * 1000)
  }
  if (cached) return cached
  throw new Error("giving up after " + MAX_ATTEMPTS + " attempts: " + url)
}

async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options))
}

/** 当前 Hexdata 版本号和数据日期，来自 robots.txt 允许访问的 ai-summary.json */
async function getReport() {
  const summary = await fetchJson(BASE + "/data/ai-summary.json")
  return { patch: summary.reportPatch, date: summary.reportDate }
}

function patchDir(patch) {
  return path.join(CACHE_ROOT, patch)
}

function heroPageFile(patch, id) {
  return path.join(patchDir(patch), "heroes", id + ".json")
}

function hasHeroPage(patch, id) {
  const file = heroPageFile(patch, id)
  return fs.existsSync(file) && fs.statSync(file).size > 1000
}

function readHeroPage(patch, id) {
  return hasHeroPage(patch, id) ? JSON.parse(fs.readFileSync(heroPageFile(patch, id), "utf8")) : null
}

/** 下载（或复用缓存）一批英雄的「英雄 × 海克斯 × 装备」数据，串行、自动等待限流 */
async function ensureHeroPages(patch, ids) {
  const todo = REFRESH ? ids : ids.filter((id) => !hasHeroPage(patch, id))
  console.log("hero pages: cached", ids.length - todo.length, "/", ids.length, ", to fetch", todo.length)
  for (let i = 0; i < todo.length; i += 1) {
    await fetchText(BASE + "/data/hero-augment-items/" + todo[i] + ".json", {
      cacheFile: heroPageFile(patch, todo[i]),
      isValid: (body) => body.indexOf('"itemStats"') >= 0
    })
    if ((i + 1) % 10 === 0 || i + 1 === todo.length) console.log("  fetched", i + 1, "/", todo.length)
  }
}

/** 取 Hexdata 的列表页（/heroes、/augments、/items），按版本缓存 */
async function fetchListPage(patch, name) {
  return fetchText(BASE + "/" + name, {
    cacheFile: path.join(patchDir(patch), "pages", name + ".html"),
    isValid: (body) => body.indexOf("<tbody>") >= 0 && !/"retryAfterSeconds"/.test(body)
  })
}

/** 非 Hexdata 的普通 JSON（OP.GG、Data Dragon），不做缓存 */
async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(res.status + " " + url)
  return res.json()
}

/** Data Dragon 最新版本号 */
async function latestDdragon() {
  return (await getJson("https://ddragon.leagueoflegends.com/api/versions.json"))[0]
}

module.exports = {
  getReport,
  ensureHeroPages,
  readHeroPage,
  hasHeroPage,
  fetchListPage,
  getJson,
  latestDdragon
}
