const fs = require("fs")
const path = require("path")
const hexdata = require("./hexdata-client")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "src", "pages", "champion", "catalog.js")
const ITEMS = path.join(ROOT, "src", "pages", "item", "items.js")
const GEAR = path.join(ROOT, "src", "pages", "champion", "gear.js")
const MATCHUPS = path.join(ROOT, "src", "pages", "champion", "matchups.js")
const GEAR_LIMIT = 12
const PLAN_LIMIT = 6
const MIN_GEAR_GAMES = 20000
const MIN_PLAN_GAMES = 1000

function read(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  return JSON.parse(raw)
}

function winRate(row) {
  return row.games ? Math.round(row.wins / row.games * 1000) / 10 : 0
}

async function main() {
  const catalog = read(CATALOG)
  const patch = catalog.patch
  const items = read(ITEMS)
  const itemById = {}
  Object.values(items).forEach((item) => {
    itemById[item.id] = item
  })
  const augmentName = {}
  catalog.augments.forEach((hex) => {
    augmentName[String(hex.id)] = hex.name
  })

  // 一般 fetch-hexdata.js 已经下好，这里只补缺
  await hexdata.ensureHeroPages(patch, catalog.champions.map((champ) => champ.id))

  const gear = {}
  const matchups = {}
  const ready = []
  catalog.champions.forEach((champ) => {
    const page = hexdata.readHeroPage(patch, champ.id)
    if (!page) return
    ready.push(champ.key)

    const ranked = (page.itemStats || [])
      .filter((row) => itemById[row.itemId])
      .map((row) => ({
        id: String(row.itemId),
        name: itemById[row.itemId].name,
        icon: itemById[row.itemId].icon,
        winRate: winRate(row),
        games: row.games
      }))
      .sort((a, b) => b.games - a.games)
    const solid = ranked.filter((row) => row.games >= MIN_GEAR_GAMES)
    gear[champ.key] = (solid.length >= GEAR_LIMIT ? solid : ranked).slice(0, GEAR_LIMIT)

    const shown = new Set((champ.augments || []).map((item) => item.name))
    const byAugment = {}
    ;(page.augments || []).forEach((group) => {
      if (!shown.has(augmentName[group.augmentId])) return
      byAugment[group.augmentId] = (group.items || [])
        .filter((row) => itemById[row.itemId] && row.games >= MIN_PLAN_GAMES)
        .map((row) => ({
          id: String(row.itemId),
          name: itemById[row.itemId].name,
          icon: itemById[row.itemId].icon,
          winRate: winRate(row),
          games: row.games
        }))
        .sort((a, b) => b.games - a.games)
        .slice(0, PLAN_LIMIT)
    })
    matchups[champ.key] = byAugment
  })

  if (ready.length < catalog.champions.length - 5) {
    console.log("partial", ready.length, "of", catalog.champions.length, "heroes, rerun to continue")
  }
  fs.writeFileSync(GEAR, "export default " + JSON.stringify(gear) + ";\n")
  fs.writeFileSync(MATCHUPS, "export default " + JSON.stringify(matchups) + ";\n")
  console.log("gear", fs.statSync(GEAR).size, "bytes, matchups", fs.statSync(MATCHUPS).size, "bytes")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
