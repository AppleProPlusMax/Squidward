// ARAMKit (https://data.aramkit.cn) 数据客户端：
// 直接拉取静态 CDN 上的结构化 JSON（16.21+ 最新版本），按版本缓存在 data/.aramkit/<patch>/。
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const CACHE_ROOT = path.join(ROOT, "data", ".aramkit")
const BASE = "https://data.aramkit.cn"
const CONCURRENCY = Number(process.env.ARAMKIT_CONCURRENCY || 6)
const MAX_ATTEMPTS = 6
const REFRESH = process.argv.includes("--refresh")
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (personal use; hex-aram-helper)",
  "Accept-Encoding": "gzip, br"
}

const RARITY_MAP = {
  silver: 1,
  gold: 4,
  prismatic: 8
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson(url, { cacheFile } = {}) {
  if (cacheFile && !REFRESH && fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 20) {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"))
  }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(45000) })
      if (!res.ok) throw new Error("HTTP " + res.status)
      const text = await res.text()
      const data = JSON.parse(text)
      if (cacheFile) {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
        fs.writeFileSync(cacheFile, text)
      }
      return data
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw new Error(err.message + ": " + url)
      await sleep(500 * attempt)
    }
  }
}

function patchDir(patch) {
  return path.join(CACHE_ROOT, patch)
}

/** 读取最新版本信息（如 16.21） */
async function getReport() {
  const ver = await fetchJson(BASE + "/data/versions.json")
  const row = (ver.versions || []).find((item) => item.version === ver.latest) || ver.versions[0]
  if (!row) throw new Error("no version found in versions.json")
  const dir = patchDir(row.version)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "version.json"), JSON.stringify(row, null, 2))
  return {
    patch: row.version,
    date: row.dataDate,
    dataPath: row.dataPath,
    resourcePath: row.resourcePath,
    allMatches: row.allMatches || 0
  }
}

function readCachedReport(patch) {
  const file = path.join(patchDir(patch), "version.json")
  if (!fs.existsSync(file)) return null
  const row = JSON.parse(fs.readFileSync(file, "utf8"))
  return {
    patch: row.version,
    date: row.dataDate,
    dataPath: row.dataPath,
    resourcePath: row.resourcePath,
    allMatches: row.allMatches || 0
  }
}

/** 拉取（并按版本缓存）英雄/海克斯/装备排行榜与中文静态资源 */
async function fetchOverview(report) {
  const info = report.dataPath ? report : readCachedReport(report.patch || report) || (await getReport())
  const dir = path.join(patchDir(info.patch), "overview")
  const dp = BASE + "/" + info.dataPath + "/stats/all"
  const rp = BASE + "/" + info.resourcePath + "/zh-CN/resources"
  const [champRes, augRes, itemRes, champRank, augRank, itemRank] = await Promise.all([
    fetchJson(rp + "/champions.json", { cacheFile: path.join(dir, "res-champions.json") }),
    fetchJson(rp + "/augments.json", { cacheFile: path.join(dir, "res-augments.json") }),
    fetchJson(rp + "/items.json", { cacheFile: path.join(dir, "res-items.json") }),
    fetchJson(dp + "/champion-rankings.json", { cacheFile: path.join(dir, "champion-rankings.json") }),
    fetchJson(dp + "/augment-rankings.json", { cacheFile: path.join(dir, "augment-rankings.json") }),
    fetchJson(dp + "/item-rankings.json", { cacheFile: path.join(dir, "item-rankings.json") })
  ])
  return { champRes, augRes, itemRes, champRank, augRank, itemRank }
}

function heroPageFile(patch, id) {
  return path.join(patchDir(patch), "heroes", id + ".json")
}

function hasHeroPage(patch, id) {
  const file = heroPageFile(patch, id)
  return fs.existsSync(file) && fs.statSync(file).size > 200
}

function readHeroPage(patch, id) {
  return hasHeroPage(patch, id) ? JSON.parse(fs.readFileSync(heroPageFile(patch, id), "utf8")) : null
}

async function fetchOneHeroPage(info, id) {
  const dp = BASE + "/" + info.dataPath + "/stats/all/champion-details/" + id
  const [detail, single] = await Promise.all([
    fetchJson(dp + ".json"),
    fetchJson(dp + "-single-augments.json")
  ])
  const singleMap = new Map((single.items || []).map((row) => [String(row.augmentId), row.all || []]))
  const compact = {
    augments: ((detail.augments && detail.augments.all) || []).map((row) => ({
      augmentId: row.id,
      games: row.sampleCount || 0,
      wins: Math.round((row.sampleCount || 0) * (row.winRate || 0)),
      winRate: row.winRate || 0,
      pickRate: row.pickRate || 0,
      items: (singleMap.get(String(row.id)) || []).slice(0, 18).map((item) => ({
        itemId: item.id,
        games: item.sampleCount || 0,
        wins: Math.round((item.sampleCount || 0) * (item.winRate || 0)),
        winRate: item.winRate || 0
      }))
    })),
    itemStats: ((detail.items && detail.items.unfiltered && detail.items.unfiltered.all) || []).map((item) => ({
      itemId: item.id,
      games: item.sampleCount || 0,
      wins: Math.round((item.sampleCount || 0) * (item.winRate || 0)),
      winRate: item.winRate || 0,
      pickRate: item.pickRate || 0
    }))
  }
  const file = heroPageFile(info.patch, id)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(compact))
}

/** 并发拉取所有英雄的「英雄 × 海克斯 × 装备」数据并写入本地精简缓存 */
async function ensureHeroPages(reportOrPatch, ids) {
  const info =
    typeof reportOrPatch === "object" && reportOrPatch.dataPath
      ? reportOrPatch
      : readCachedReport(reportOrPatch) || (await getReport())
  const todo = REFRESH ? ids.slice() : ids.filter((id) => !hasHeroPage(info.patch, id))
  console.log("hero pages: cached", ids.length - todo.length, "/", ids.length, ", to fetch", todo.length)
  if (!todo.length) return
  let cursor = 0
  let done = 0
  async function worker() {
    while (cursor < todo.length) {
      const id = todo[cursor++]
      await fetchOneHeroPage(info, id)
      done += 1
      if (done % 25 === 0 || done === todo.length) {
        console.log("  fetched", done, "/", todo.length)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, () => worker()))
}

/** 根据 95% Wilson 置信下界与对局样本量计算 0-100 综合评分 */
function scoreOf(winRate01, games) {
  const n = Number(games) || 0
  const p = Number(winRate01) || 0
  if (n <= 0 || p <= 0) return 0
  const z = 1.96
  const z2 = z * z
  const lower = (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n)
  const raw = 50 + (lower - 0.45) * 300 + Math.min(4, Math.log10(Math.max(10, n)) * 0.7)
  return Math.round(Math.max(40, Math.min(99, raw)) * 10) / 10
}

/** 将 ARAMKit 的结构化 tooltip 转为纯文本说明，去除对局内统计占位行 */
function formatTooltip(tooltip) {
  if (!tooltip || !Array.isArray(tooltip.blocks)) return ""
  return tooltip.blocks
    .map((block) => (block.spans || []).map((span) => span.text || "").join("").trim())
    .filter((line) => line && !line.includes("当前对局数值") && !line.includes("当前任务进度"))
    .join("\n\n")
}

function rarityCode(rarity) {
  if (typeof rarity === "number") return rarity
  return RARITY_MAP[String(rarity || "").toLowerCase()] || 0
}

/** 非 ARAMKit 的普通 JSON（OP.GG、Data Dragon） */
async function getJson(url) {
  return fetchJson(url)
}

/** Data Dragon 最新版本号 */
async function latestDdragon() {
  return (await getJson("https://ddragon.leagueoflegends.com/api/versions.json"))[0]
}

module.exports = {
  getReport,
  fetchOverview,
  ensureHeroPages,
  readHeroPage,
  hasHeroPage,
  scoreOf,
  formatTooltip,
  rarityCode,
  getJson,
  latestDdragon
}
