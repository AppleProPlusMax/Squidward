const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "data", "catalog.js")
const OUT = path.join(ROOT, "data", "items.js")
const HERO_LIMIT = 15

const GATED = {
  金铲铲: "海牛阿福的勇士",
  终极九头蛇: "终极九头蛇",
  虚空献祭: "艾卡西亚的陷落",
  沃格勒特的巫师帽: "沃格勒特的巫师帽"
}

function get(url) {
  return execFileSync("curl.exe", ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "40", url], {
    maxBuffer: 50 * 1024 * 1024
  }).toString("utf8")
}

function readCatalog() {
  const raw = fs.readFileSync(CATALOG, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  return JSON.parse(raw)
}

function grade(win) {
  if (win >= 56) return "SS"
  if (win >= 53) return "S"
  if (win >= 50) return "A"
  if (win >= 47) return "B"
  return "C"
}

function number(text) {
  const match = String(text || "").match(/[\d.]+/)
  return match ? Number(match[0]) : 0
}

function count(text) {
  const digits = String(text || "").replace(/[^\d]/g, "")
  return digits ? Number(digits) : 0
}

function stripTags(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function parseDescription(html) {
  const text = String(html || "").replace(/<flavorText>[\s\S]*?<\/flavorText>/g, "")
  const statsHtml = (text.match(/<stats>([\s\S]*?)<\/stats>/) || [])[1] || ""
  const stats = statsHtml
    .split(/<br\s*\/?>/i)
    .map((line) => stripTags(line.replace(/<\/attention>/g, "</attention> ")).replace(/\s+/g, " "))
    .filter(Boolean)
  const effect = stripTags(
    text
      .replace(/<stats>[\s\S]*?<\/stats>/, "")
      .replace(/<passive>([\s\S]*?)<\/passive>/g, "【$1】")
      .replace(/<active>([\s\S]*?)<\/active>/g, "【$1】")
  )
  return { stats, effect }
}

function parseSummary(html) {
  const body = (html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || ""
  const rows = {}
  const re = /<tr>([\s\S]*?)<\/tr>/g
  let match
  while ((match = re.exec(body))) {
    const cells = []
    const cellRe = /<td>([\s\S]*?)<\/td>/g
    let cell
    while ((cell = cellRe.exec(match[1]))) cells.push(cell[1].replace(/<[^>]+>/g, "").trim())
    if (cells.length < 3) continue
    rows[cells[0]] = {
      score: number((cells[1].match(/HexScore\s*[\d.]+/) || [""])[0]),
      winRate: number((cells[1].match(/胜率\s*[\d.]+%/) || [""])[0]),
      games: count((cells[1].match(/样本\s*[\d,]+/) || [""])[0]),
      heroCount: count(cells[2])
    }
  }
  return rows
}

function main() {
  const catalog = readCatalog()
  const items = {}
  const users = {}
  let version = ""
  catalog.champions.forEach((champ) => {
    const hit = String(champ.icon || "").match(/cdn\/([\d.]+)\//)
    if (hit && !version) version = hit[1]
    ;(champ.items || []).forEach((item) => {
      const id = (String(item.icon || "").match(/\/item\/(\d+)\.png/) || [])[1]
      if (id && !items[id]) items[id] = { id, name: item.name, icon: item.icon }
      ;(users[item.name] = users[item.name] || []).push({
        key: champ.key,
        title: champ.title,
        icon: champ.icon,
        winRate: item.winRate,
        score: item.score,
        games: item.games,
        grade: grade(item.winRate)
      })
    })
  })
  if (!version) throw new Error("no ddragon version in catalog")

  const dd = JSON.parse(get("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/zh_CN/item.json")).data
  const ddByName = {}
  Object.keys(dd).forEach((id) => {
    const name = dd[id].name
    if (!ddByName[name] || (dd[id].maps && dd[id].maps["12"])) ddByName[name] = id
  })
  function ddIcon(id) {
    return "https://ddragon.leagueoflegends.com/cdn/" + version + "/img/item/" + id + ".png"
  }

  const summary = parseSummary(get("https://hexdata.com.cn/items"))

  const hexByItem = {}
  catalog.augments.forEach((hex) => {
    Object.keys(GATED).forEach((name) => {
      if (hex.name.indexOf(GATED[name]) >= 0 && !hexByItem[name]) {
        hexByItem[name] = { id: hex.id, name: hex.name, icon: hex.icon, rarity: hex.rarity || 0 }
      }
    })
  })

  const out = {}
  const failed = []
  Object.keys(items).forEach((id) => {
    const base = items[id]
    const ddId = dd[id] ? id : ddByName[base.name]
    const info = ddId ? dd[ddId] : null
    const parsed = parseDescription(info && info.description)
    const from = ((info && info.from) || [])
      .filter((part) => dd[part])
      .map((part) => ({ name: dd[part].name, icon: ddIcon(part) }))
    const stat = summary[base.name] || {}
    const heroes = (users[base.name] || [])
      .slice()
      .sort((a, b) => b.score - a.score || b.games - a.games)
      .slice(0, HERO_LIMIT)

    if (!info) failed.push(base.name + " no ddragon")
    if (!stat.winRate) failed.push(base.name + " no summary")
    out[id] = {
      id,
      name: base.name,
      icon: base.icon,
      plaintext: (info && info.plaintext) || "",
      gold: (info && info.gold && info.gold.total) || 0,
      stats: parsed.stats,
      effect: parsed.effect,
      from,
      grade: stat.winRate ? grade(stat.winRate) : "",
      winRate: stat.winRate || 0,
      score: stat.score || 0,
      games: stat.games || 0,
      heroCount: stat.heroCount || 0,
      requires: hexByItem[base.name] || null,
      heroes
    }
  })

  if (failed.length) console.log("failed", failed.length, failed.join(" | "))
  if (failed.length > 5) {
    console.error("too many items without data")
    process.exit(1)
  }
  fs.writeFileSync(OUT, "export default " + JSON.stringify(out) + ";\n")
  console.log("wrote", Object.keys(out).length, "items", fs.statSync(OUT).size, "bytes")
}

main()
