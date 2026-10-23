const fs = require("fs")
const path = require("path")
const { pickItemIcons } = require("./item-icons")
const hexdata = require("./hexdata-client")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "src", "pages", "champion", "catalog.js")
const OUT = path.join(ROOT, "src", "pages", "item", "items.js")
const HERO_LIMIT = 12
const MIN_GAMES = 2000
const MIN_HEROES = 8

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

function iconIdOf(icon) {
  return (String(icon || "").match(/\/item\/(\d+)\.png/) || [])[1] || ""
}

async function main() {
  const catalog = readCatalog()
  const overview = await hexdata.fetchOverview({ patch: catalog.patch })
  const opggItems = (await hexdata.getJson("https://lol-api-champion.op.gg/api/meta/items?hl=zh_CN")).data
  const iconByName = pickItemIcons(opggItems)

  const items = {}
  const iconIdByAramId = {}
  const summaryByName = {}

  let version = ""
  catalog.champions.forEach((champ) => {
    const hit = String(champ.icon || "").match(/cdn\/([\d.]+)\//)
    if (hit && !version) version = hit[1]
    ;(champ.items || []).forEach((item) => {
      const id = iconIdOf(item.icon)
      if (id && !items[id]) items[id] = { id, name: item.name, icon: item.icon }
    })
  })
  if (!version) version = await hexdata.latestDdragon()

  ;((overview.itemRank && overview.itemRank.all) || []).forEach((row) => {
    const resItem = overview.itemRes && overview.itemRes[String(row.id)]
    const name = resItem && resItem.name
    if (!name) return
    const icon = iconByName[name] || ""
    const id = iconIdOf(icon) || String(row.id)
    iconIdByAramId[String(row.id)] = id
    if (!items[id]) items[id] = { id, name, icon }
    summaryByName[name] = {
      score: hexdata.scoreOf(row.winRate, row.sampleCount),
      winRate: Math.round((row.winRate || 0) * 1000) / 10,
      games: row.sampleCount || 0
    }
  })

  Object.keys(overview.itemRes || {}).forEach((aramId) => {
    if (iconIdByAramId[aramId]) return
    const name = overview.itemRes[aramId] && overview.itemRes[aramId].name
    const icon = name && iconByName[name]
    const id = iconIdOf(icon)
    if (id) iconIdByAramId[aramId] = id
  })

  const dd = (await hexdata.getJson("https://ddragon.leagueoflegends.com/cdn/" + version + "/data/zh_CN/item.json")).data
  const ddByName = {}
  Object.keys(dd).forEach((id) => {
    const name = dd[id].name
    if (!ddByName[name] || (dd[id].maps && dd[id].maps["12"])) ddByName[name] = id
  })
  function ddIcon(id) {
    return "https://ddragon.leagueoflegends.com/cdn/" + version + "/img/item/" + id + ".png"
  }

  const champions = {}
  catalog.champions.forEach((champ) => {
    champions[champ.key] = champ
  })

  const hexByItem = {}
  catalog.augments.forEach((hex) => {
    Object.keys(GATED).forEach((name) => {
      if (hex.name.indexOf(GATED[name]) >= 0 && !hexByItem[name]) {
        hexByItem[name] = { id: hex.id, name: hex.name, icon: hex.icon, rarity: hex.rarity || 0 }
      }
    })
  })

  const failed = []
  const ids = Object.keys(items)
  const heroesByItem = {}
  catalog.champions.forEach((champ) => {
    const page = hexdata.readHeroPage(catalog.patch, champ.id)
    if (!page) return
    ;(page.itemStats || []).forEach((row) => {
      const id = iconIdByAramId[String(row.itemId)] || String(row.itemId)
      if (!items[id] || !row.games) return
      if (!heroesByItem[id]) heroesByItem[id] = []
      const wr01 = row.winRate || row.wins / row.games
      heroesByItem[id].push({
        key: champ.key,
        score: hexdata.scoreOf(wr01, row.games),
        winRate: Math.round(wr01 * 1000) / 10,
        pickRate: champ.games ? Math.round(row.games / champ.games * 1000) / 10 : 0,
        games: row.games
      })
    })
  })

  const out = {}
  ids.forEach((id) => {
    const base = items[id]
    const ddId = dd[id] ? id : ddByName[base.name]
    const info = ddId ? dd[ddId] : null
    const parsed = parseDescription(info && info.description)
    const from = ((info && info.from) || [])
      .filter((part) => dd[part])
      .map((part) => ({ name: dd[part].name, icon: ddIcon(part) }))
    const page = heroesByItem[id] || []
    const rows = page.filter((row) => champions[row.key])
    rows.sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    const solid = rows.filter((row) => row.games >= MIN_GAMES)
    const heroes = (solid.length >= MIN_HEROES ? solid : rows)
      .slice(0, HERO_LIMIT)
      .map((row) => ({
        key: row.key,
        title: champions[row.key].title,
        icon: champions[row.key].icon,
        winRate: row.winRate,
        pickRate: row.pickRate,
        score: row.score,
        games: row.games,
        grade: grade(row.winRate)
      }))

    const stat = summaryByName[base.name] || {}
    const totalGames = stat.games || rows.reduce((sum, row) => sum + row.games, 0)
    const winRate =
      stat.winRate ||
      (totalGames
        ? Math.round((rows.reduce((sum, row) => sum + row.games * row.winRate, 0) / totalGames) * 10) / 10
        : 0)
    const score = stat.score || hexdata.scoreOf(winRate / 100, totalGames)

    if (!info) failed.push(base.name + " no ddragon")
    if (!winRate) failed.push(base.name + " no summary")
    if (!rows.length) failed.push(base.name + " no page")
    out[id] = {
      id,
      name: base.name,
      icon: base.icon,
      plaintext: (info && info.plaintext) || "",
      gold: (info && info.gold && info.gold.total) || 0,
      stats: parsed.stats,
      effect: parsed.effect,
      from,
      grade: winRate ? grade(winRate) : "",
      winRate: winRate || 0,
      score: score || 0,
      games: totalGames || 0,
      heroCount: rows.length,
      requires: hexByItem[base.name] || null,
      heroes
    }
  })

  if (failed.length) console.log("failed", failed.length, failed.join(" | "))
  const fetched = ids.filter((id) => (heroesByItem[id] || []).length > 0).length
  fs.writeFileSync(OUT, "export default " + JSON.stringify(out) + ";\n")
  if (fetched < ids.length - 5) {
    console.error("only", fetched, "item pages fetched, rerun to continue")
    process.exit(1)
  }
  console.log("wrote", Object.keys(out).length, "items", fs.statSync(OUT).size, "bytes")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
