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

const OPGG_ITEM_PREFIX = "https://opgg-static.akamaized.net/meta/images/lol/latest/item/"

function read(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  return JSON.parse(raw)
}

function winRate(row) {
  if (row.winRate) return Math.round(row.winRate * 1000) / 10
  return row.games ? Math.round((row.wins / row.games) * 1000) / 10 : 0
}

function compactIcon(url) {
  const s = String(url || "")
  if (s.startsWith(OPGG_ITEM_PREFIX) && s.endsWith(".png")) {
    return "#" + s.slice(OPGG_ITEM_PREFIX.length, -4)
  }
  return s
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

  await hexdata.ensureHeroPages(
    patch,
    catalog.champions.map((champ) => champ.id)
  )

  const itemDict = {}
  function registerItem(ref) {
    const id = String(ref.id)
    if (!itemDict[id]) {
      itemDict[id] = [ref.name, compactIcon(ref.icon)]
    }
    return id
  }

  const rawGear = {}
  const rawMatchups = {}
  const ready = []
  catalog.champions.forEach((champ) => {
    const page = hexdata.readHeroPage(patch, champ.id)
    if (!page) return
    ready.push(champ.key)

    const ranked = (page.itemStats || [])
      .filter((row) => itemById[String(row.itemId)])
      .map((row) => {
        const ref = itemById[String(row.itemId)]
        const id = registerItem(ref)
        return [id, winRate(row), row.games]
      })
      .sort((a, b) => b[2] - a[2])
    const solid = ranked.filter((row) => row[2] >= MIN_GEAR_GAMES)
    rawGear[champ.key] = (solid.length >= GEAR_LIMIT ? solid : ranked).slice(0, GEAR_LIMIT)

    const shown = new Set((champ.augments || []).map((item) => item.name))
    const byAugment = {}
    ;(page.augments || []).forEach((group) => {
      if (!shown.has(augmentName[String(group.augmentId)])) return
      const allItems = (group.items || [])
        .filter((row) => itemById[String(row.itemId)] && row.games > 0)
        .map((row) => {
          const ref = itemById[String(row.itemId)]
          const id = registerItem(ref)
          return { id, games: row.games }
        })
        .sort((a, b) => b.games - a.games)
      const solidPlan = allItems.filter((row) => row.games >= MIN_PLAN_GAMES)
      byAugment[group.augmentId] = (solidPlan.length >= PLAN_LIMIT ? solidPlan : allItems)
        .slice(0, PLAN_LIMIT)
        .map((row) => row.id)
    })
    rawMatchups[champ.key] = byAugment
  })

  if (ready.length < catalog.champions.length - 5) {
    console.log("partial", ready.length, "of", catalog.champions.length, "heroes, rerun to continue")
  }

  const gearCode = `const P = ${JSON.stringify(OPGG_ITEM_PREFIX)};
const I = ${JSON.stringify(itemDict)};
const R = ${JSON.stringify(rawGear)};
const G = {};
for (const k in R) {
  G[k] = R[k].map((e) => {
    const m = I[e[0]] || ["", ""];
    const ic = m[1].startsWith("#") ? P + m[1].slice(1) + ".png" : m[1];
    return { id: e[0], name: m[0], icon: ic, winRate: e[1], games: e[2] };
  });
}
export default G;
`

  const matchupsCode = `const P = ${JSON.stringify(OPGG_ITEM_PREFIX)};
const I = ${JSON.stringify(itemDict)};
const R = ${JSON.stringify(rawMatchups)};
const M = {};
for (const k in R) {
  const byAug = R[k];
  const out = {};
  for (const a in byAug) {
    out[a] = byAug[a].map((id) => {
      const m = I[id] || ["", ""];
      const ic = m[1].startsWith("#") ? P + m[1].slice(1) + ".png" : m[1];
      return { id, name: m[0], icon: ic };
    });
  }
  M[k] = out;
}
export default M;
`

  fs.writeFileSync(GEAR, gearCode)
  fs.writeFileSync(MATCHUPS, matchupsCode)
  console.log("gear", fs.statSync(GEAR).size, "bytes, matchups", fs.statSync(MATCHUPS).size, "bytes")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
