const fs = require("fs")
const path = require("path")
const hexdata = require("./hexdata-client")

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

async function main() {
  const catalog = readCatalog()
  const champions = {}
  const itemIcon = {}
  catalog.champions.forEach((champ) => {
    champions[champ.key] = champ
    ;(champ.items || []).forEach((item) => {
      if (item.icon) itemIcon[item.name] = item.icon
    })
  })

  const opgg = (await hexdata.getJson("https://lol-api-champion.op.gg/api/meta/aram-augments?hl=zh_CN")).data
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

  const pages = []
  catalog.champions.forEach((champ) => {
    const page = hexdata.readHeroPage(catalog.patch, champ.id)
    if (page) pages.push({ champ, page })
  })
  if (pages.length < catalog.champions.length - 5) {
    console.error("only", pages.length, "hero json files, run fetch-hexdata.js first")
    process.exit(1)
  }
  const slotGames = catalog.champions.reduce((sum, champ) => sum + (champ.games || 0), 0)

  const out = {}
  const failed = []
  catalog.augments.forEach((hex, index) => {
    const heroes = []
    let games = 0
    let wins = 0
    pages.forEach(({ champ, page }) => {
      const row = (page.augments || []).find((item) => String(item.augmentId) === String(hex.id))
      if (!row || !row.games) return
      games += row.games
      wins += row.wins || 0
      heroes.push({
        key: champ.key,
        title: champ.title,
        icon: champ.icon || "",
        winRate: Math.round(row.wins / row.games * 1000) / 10,
        score: 0,
        games: row.games,
        grade: grade(row.wins / row.games * 100)
      })
    })
    heroes.sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    const shown = heroes.filter((item) => item.games >= 1000).slice(0, 12)
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
      pickRate: slotGames ? Math.round(games * 10000 / slotGames) / 10 : 0,
      score: hex.score || 0,
      games,
      heroCount: heroes.length,
      desc: descOf(hex.name),
      items,
      heroes: shown
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

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
