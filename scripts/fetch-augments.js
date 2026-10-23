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

function cleanDesc(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function main() {
  const catalog = readCatalog()
  const overview = await hexdata.fetchOverview({ patch: catalog.patch })
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
  const descById = {}
  opgg.forEach((item) => {
    const cleaned = cleanDesc(item.desc || item.tooltip)
    if (item.name) descByName[item.name] = cleaned
    if (item.id != null) descById[String(item.id)] = cleaned
  })

  function descOf(hex) {
    const aramTooltip =
      overview.augRes && overview.augRes[String(hex.id)]
        ? hexdata.formatTooltip(overview.augRes[String(hex.id)].tooltip)
        : ""
    if (aramTooltip) return aramTooltip
    if (descById[String(hex.id)]) return descById[String(hex.id)]
    if (descByName[hex.name]) return descByName[hex.name]
    const hit = Object.keys(descByName)
      .filter((key) => key && hex.name.endsWith(key))
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
  catalog.augments.forEach((hex) => {
    const heroes = []
    let games = 0
    pages.forEach(({ champ, page }) => {
      const row = (page.augments || []).find((item) => String(item.augmentId) === String(hex.id))
      if (!row || !row.games) return
      games += row.games
      const wr01 = row.winRate || row.wins / row.games
      const wr = Math.round(wr01 * 1000) / 10
      heroes.push({
        key: champ.key,
        title: champ.title,
        icon: champ.icon || "",
        winRate: wr,
        score: hexdata.scoreOf(wr01, row.games),
        games: row.games,
        grade: grade(wr)
      })
    })
    heroes.sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    const solid = heroes.filter((item) => item.games >= 500)
    const shown = (solid.length >= 8 ? solid : heroes).slice(0, 12)
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
      pickRate: hex.pickRate || (slotGames ? Math.round(games * 10000 / slotGames) / 10 : 0),
      score: hex.score || hexdata.scoreOf(hex.winRate / 100, hex.games || games),
      games: hex.games || games,
      heroCount: heroes.length,
      desc: descOf(hex),
      items,
      heroes: shown
    }
  })

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
