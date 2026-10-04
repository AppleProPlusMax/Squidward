const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "src", "pages", "champion", "catalog.js")
const OUT = path.join(ROOT, "src", "pages", "augment", "augments.js")
const IDS = path.join(ROOT, "src", "pages", "champion", "augment-ids.js")

const GATED = {
  金铲铲: "海牛阿福的勇士",
  终极九头蛇: "终极九头蛇",
  虚空献祭: "艾卡西亚的陷落",
  沃格勒特的巫师帽: "沃格勒特的巫师帽"
}

function get(url) {
  return execFileSync("curl.exe", ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "40", url], {
    maxBuffer: 20 * 1024 * 1024
  }).toString("utf8")
}

function sleep(seconds) {
  if (seconds <= 0) return
  execFileSync("powershell", ["-Command", "Start-Sleep -Seconds " + seconds], { stdio: "ignore" })
}

function getPage(url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const html = get(url)
    const limited = html.match(/"retryAfterSeconds"\s*:\s*(\d+)/)
    if (!limited && html.indexOf("<tbody>") >= 0) return html
    const wait = limited ? Number(limited[1]) + 1 : 4
    console.log("wait", wait, url)
    sleep(wait)
  }
  return ""
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

function cleanDesc(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function parseHeroes(html) {
  const body = (html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || ""
  const rows = []
  const re = /<tr>([\s\S]*?)<\/tr>/g
  let match
  while ((match = re.exec(body))) {
    const link = match[1].match(/<a href="\/hero\/(\d+)-([^"]+)">([^<]*)<\/a>/)
    if (!link) continue
    const cells = []
    const cellRe = /<td>([\s\S]*?)<\/td>/g
    let cell
    while ((cell = cellRe.exec(match[1]))) cells.push(cell[1].replace(/<[^>]+>/g, "").trim())
    rows.push({
      key: link[2],
      title: link[3].trim(),
      score: number(cells[1]),
      winRate: number(cells[2]),
      games: count(cells[3])
    })
  }
  return rows
}

function main() {
  const catalog = readCatalog()
  const champions = {}
  const itemIcon = {}
  catalog.champions.forEach((champ) => {
    champions[champ.key] = champ
    ;(champ.items || []).forEach((item) => {
      if (item.icon) itemIcon[item.name] = item.icon
    })
  })

  const opgg = JSON.parse(get("https://lol-api-champion.op.gg/api/meta/aram-augments?hl=zh_CN")).data
  const descByName = {}
  opgg.forEach((item) => {
    if (item.name) descByName[item.name] = cleanDesc(item.desc || item.tooltip)
  })
  function descOf(name) {
    if (descByName[name]) return descByName[name]
    const hit = Object.keys(descByName)
      .filter((key) => key && name.endsWith(key))
      .sort((a, b) => b.length - a.length)[0]
    return hit ? descByName[hit] : ""
  }

  const list = get("https://hexdata.com.cn/augments")
  const slugs = {}
  const linkRe = /href="\/augment\/((\d+)-[^"]+)"/g
  let match
  while ((match = linkRe.exec(list))) slugs[match[2]] = match[1]

  const out = {}
  const failed = []
  catalog.augments.forEach((hex, index) => {
    const slug = slugs[String(hex.id)]
    if (!slug) {
      failed.push(hex.name + " no slug")
      return
    }
    const html = getPage("https://hexdata.com.cn/augment/" + slug)
    sleep(2)
    if (!html) {
      failed.push(hex.name + " empty")
      return
    }
    const meta = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ""
    const heroes = parseHeroes(html).map((row) => {
      const champ = champions[row.key] || {}
      return {
        key: row.key,
        title: champ.title || row.title,
        icon: champ.icon || "",
        winRate: row.winRate,
        score: row.score,
        games: row.games,
        grade: grade(row.winRate)
      }
    })
    const items = Object.keys(GATED)
      .filter((name) => hex.name.indexOf(GATED[name]) >= 0)
      .map((name) => ({ name, icon: itemIcon[name] || "" }))
    out[hex.id] = {
      id: hex.id,
      name: hex.name,
      icon: hex.icon,
      rarity: hex.rarity || 0,
      grade: hex.grade,
      winRate: hex.winRate,
      pickRate: number((meta.match(/选取率\s*[\d.]+%/) || [""])[0]),
      score: number((meta.match(/综合评分\s*[\d.]+/) || [""])[0]),
      games: count((meta.match(/样本\s*[\d,]+/) || [""])[0]),
      heroCount: number((meta.match(/覆盖\s*\d+\s*位英雄/) || [""])[0]),
      desc: descOf(hex.name),
      items,
      heroes
    }
    if ((index + 1) % 10 === 0) console.log("augments", index + 1)
  })

  if (failed.length) console.log("failed", failed.length, failed.join(" | "))
  const total = Object.keys(out).length
  if (total < catalog.augments.length - 5) {
    console.error("only", total, "augment pages parsed")
    process.exit(1)
  }
  fs.writeFileSync(OUT, "export default " + JSON.stringify(out) + ";\n")
  const ids = {}
  Object.keys(out).forEach((id) => {
    ids[out[id].name] = id
  })
  fs.writeFileSync(IDS, "export default " + JSON.stringify(ids) + ";\n")
  console.log("wrote", total, "augments", fs.statSync(OUT).size, "bytes")
}

main()
