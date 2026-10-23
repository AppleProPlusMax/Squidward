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
const MIN_GEAR_GAMES = 2000
const MIN_PLAN_GAMES = 100

function read(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  return JSON.parse(raw)
}

function winRate(row) {
  if (row.winRate) return Math.round(row.winRate * 1000) / 10
  return row.games ? Math.round((row.wins / row.games) * 1000) / 10 : 0
}

async function main() {
  const catalog = read(CATALOG)
  const patch = catalog.patch
  const overview = await hexdata.fetchOverview({ patch })
  const items = read(ITEMS)
  const itemById = {}
  const itemByName = {}
  Object.values(items).forEach((item) => {
    itemById[String(item.id)] = item
    if (item.name) itemByName[item.name] = item
  })
  Object.keys(overview.itemRes || {}).forEach((aramId) => {
    if (itemById[aramId]) return
    const name = overview.itemRes[aramId] && overview.itemRes[aramId].name
    if (name && itemByName[name]) itemById[aramId] = itemByName[name]
  })

  const augmentName = {}
  catalog.augments.forEach((hex) => {
    augmentName[String(hex.id)] = hex.name
  })

  // 一般 fetch-hexdata.js 已经下好，这里只补缺
  await hexdata.ensureHeroPages(
    patch,
    catalog.champions.map((champ) => champ.id)
  )

  const gear = {}
  const matchups = {}
  const ready = []
  catalog.champions.forEach((champ) => {
    const page = hexdata.readHeroPage(patch, champ.id)
    if (!page) return
    ready.push(champ.key)

    const ranked = (page.itemStats || [])
      .filter((row) => itemById[String(row.itemId)])
      .map((row) => {
        const ref = itemById[String(row.itemId)]
        return {
          id: String(ref.id),
          name: ref.name,
          icon: ref.icon,
          winRate: winRate(row),
          games: row.games
        }
      })
      .sort((a, b) => b.games - a.games)
    const solid = ranked.filter((row) => row.games >= MIN_GEAR_GAMES)
    gear[champ.key] = (solid.length >= GEAR_LIMIT ? solid : ranked).slice(0, GEAR_LIMIT)

    const shown = new Set((champ.augments || []).map((item) => item.name))
    const byAugment = {}
    ;(page.augments || []).forEach((group) => {
      if (!shown.has(augmentName[String(group.augmentId)])) return
      const allItems = (group.items || [])
        .filter((row) => itemById[String(row.itemId)] && row.games > 0)
        .map((row) => {
          const ref = itemById[String(row.itemId)]
          return {
            id: String(ref.id),
            name: ref.name,
            icon: ref.icon,
            winRate: winRate(row),
            games: row.games
          }
        })
        .sort((a, b) => b.games - a.games)
      const solidPlan = allItems.filter((row) => row.games >= MIN_PLAN_GAMES)
      byAugment[group.augmentId] = (solidPlan.length >= PLAN_LIMIT ? solidPlan : allItems).slice(0, PLAN_LIMIT)
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
