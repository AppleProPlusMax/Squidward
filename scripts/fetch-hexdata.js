const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const { pickItemIcons } = require("./item-icons")
const hexdata = require("./hexdata-client")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "src", "pages", "champion", "catalog.js")

function readCatalog() {
  try {
    const raw = fs.readFileSync(CATALOG, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
    return JSON.parse(raw)
  } catch (err) {
    return { champions: [], augments: [] }
  }
}

function grade(win) {
  if (win >= 56) return "SS"
  if (win >= 53) return "S"
  if (win >= 50) return "A"
  if (win >= 47) return "B"
  return "C"
}

async function main() {
  const report = await hexdata.getReport()
  const PATCH = await hexdata.latestDdragon()
  console.log("aramkit patch", report.patch, "date", report.date, "ddragon", PATCH)

  const overview = await hexdata.fetchOverview(report)
  const catalog = readCatalog()
  const championIcon = {}
  const augmentIcon = {}
  const itemIcon = {}

  catalog.champions.forEach((champ) => {
    championIcon[champ.key] = champ.icon
    ;(champ.augments || []).forEach((item) => {
      if (item.name && item.icon) augmentIcon[item.name] = item.icon
    })
  })
  catalog.augments.forEach((item) => {
    if (item.name && item.icon) augmentIcon[item.name] = item.icon
  })

  const itemMeta = (await hexdata.getJson("https://lol-api-champion.op.gg/api/meta/items?hl=zh_CN")).data
  Object.assign(itemIcon, pickItemIcons(itemMeta))
  const augmentMeta = (await hexdata.getJson("https://lol-api-champion.op.gg/api/meta/aram-augments?hl=zh_CN")).data
  const augmentRarity = {}
  const augmentIconById = {}
  const augmentRarityById = {}
  augmentMeta.forEach((item) => {
    if (item.rarity != null) {
      if (item.name) augmentRarity[item.name] = item.rarity
      if (item.id != null) augmentRarityById[String(item.id)] = item.rarity
    }
    if (item.largeIcon) {
      const url = item.largeIcon.includes("?") ? item.largeIcon : item.largeIcon + "?image=q_auto:good,f_png,w_128"
      if (item.name) augmentIcon[item.name] = url
      if (item.id != null) augmentIconById[String(item.id)] = url
    }
  })

  const championsJson = (
    await hexdata.getJson("https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/data/zh_CN/champion.json")
  ).data
  const ddByNumId = {}
  const tags = {}
  const spoken = {}
  const given = {}
  Object.keys(championsJson).forEach((id) => {
    const row = championsJson[id]
    const key = id.toLowerCase()
    ddByNumId[String(row.key)] = { id: Number(row.key), key, name: row.title, title: row.name }
    tags[key] = row.tags || []
    spoken[key] = row.name
    given[key] = row.title
    championIcon[key] = "https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/img/champion/" + id + ".png"
  })

  const itemName = {}
  Object.keys(overview.itemRes || {}).forEach((id) => {
    if (overview.itemRes[id] && overview.itemRes[id].name) {
      itemName[String(id)] = overview.itemRes[id].name
    }
  })
  itemMeta.forEach((entry) => {
    if (entry.id != null && entry.name && !itemName[String(entry.id)]) {
      itemName[String(entry.id)] = entry.name
    }
  })
  const ddItems = (
    await hexdata.getJson("https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/data/zh_CN/item.json")
  ).data
  Object.keys(ddItems).forEach((id) => {
    if (!itemName[id] && ddItems[id].name) itemName[id] = ddItems[id].name
  })

  function iconOf(name, id) {
    if (id != null && augmentIconById[String(id)]) return augmentIconById[String(id)]
    if (augmentIcon[name]) return augmentIcon[name]
    const hit = Object.keys(augmentIcon)
      .filter((key) => key && name.endsWith(key))
      .sort((a, b) => b.length - a.length)[0]
    return hit ? augmentIcon[hit] : ""
  }

  function rarityOf(name, id) {
    const resItem = id != null && overview.augRes && overview.augRes[String(id)]
    if (resItem && resItem.rarity) return hexdata.rarityCode(resItem.rarity)
    if (id != null && augmentRarityById[String(id)]) return augmentRarityById[String(id)]
    if (augmentRarity[name]) return augmentRarity[name]
    const hit = Object.keys(augmentRarity)
      .filter((key) => key && name.endsWith(key))
      .sort((a, b) => b.length - a.length)[0]
    return hit ? augmentRarity[hit] : 0
  }

  const augmentName = {}
  const augments = ((overview.augRank && overview.augRank.all) || [])
    .map((row) => {
      const info = (overview.augRes && overview.augRes[String(row.id)]) || {}
      const name = info.name
      if (!name) return null
      const winRate = Math.round((row.winRate || 0) * 1000) / 10
      augmentName[String(row.id)] = name
      return {
        id: Number(row.id),
        name,
        score: hexdata.scoreOf(row.winRate, row.sampleCount),
        winRate,
        pickRate: Math.round((row.pickRate || 0) * 1000) / 10,
        games: row.sampleCount || 0,
        rarity: rarityOf(name, row.id),
        icon: iconOf(name, row.id)
      }
    })
    .filter(Boolean)

  augments.sort((a, b) => b.winRate - a.winRate || b.games - a.games)
  augments.forEach((item, index) => {
    item.rank = index + 1
    item.grade = grade(item.winRate)
  })
  console.log("augments", augments.length, augments[0] && augments[0].name, augments[0] && augments[0].winRate)

  const listed = ((overview.champRank && overview.champRank.rows) || [])
    .map((row) => {
      const dd = ddByNumId[String(row.id)]
      if (!dd) return null
      return {
        id: Number(row.id),
        key: dd.key,
        name: dd.name,
        title: dd.title,
        winRate: Math.round((row.winRate || 0) * 1000) / 10,
        pickRate: Math.round((row.pickRate || 0) * 1000) / 10,
        games: row.sampleCount || 0
      }
    })
    .filter(Boolean)

  console.log("heroes", listed.length)
  if (listed.length < 150) {
    console.error("hero list too short")
    process.exit(1)
  }

  await hexdata.ensureHeroPages(report, listed.map((hero) => hero.id))

  const gatedNames = {
    金铲铲: true,
    终极九头蛇: true,
    虚空献祭: true,
    沃格勒特的巫师帽: true
  }
  const details = []
  const failed = []
  listed.forEach((hero) => {
    const page = hexdata.readHeroPage(report.patch, hero.id)
    if (!page) {
      failed.push(hero.key + " missing")
      return
    }
    const heroAugments = (page.augments || [])
      .map((row) => {
        const name = augmentName[String(row.augmentId)]
        if (!name || !row.games) return null
        return {
          id: row.augmentId,
          name,
          score: hexdata.scoreOf(row.winRate, row.games),
          winRate: Math.round((row.winRate || row.wins / row.games) * 1000) / 10,
          games: row.games
        }
      })
      .filter(Boolean)
    const solidAugments = heroAugments.filter((item) => item.games >= 1000)
    const rankedAugments = (solidAugments.length >= 8 ? solidAugments : heroAugments)
      .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
      .slice(0, 8)
    const namedItems = (page.itemStats || [])
      .map((row) => {
        const name = itemName[String(row.itemId)]
        if (!name || !row.games) return null
        return {
          name,
          score: hexdata.scoreOf(row.winRate, row.games),
          winRate: Math.round((row.winRate || row.wins / row.games) * 1000) / 10,
          games: row.games
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.games - a.games)
    const shop = namedItems.filter((item) => !gatedNames[item.name]).slice(0, 12)
    const rewards = namedItems.filter((item) => gatedNames[item.name] && !shop.some((entry) => entry.name === item.name))
    if (!rankedAugments.length) failed.push(hero.key + " empty")
    details.push({
      hero,
      augments: rankedAugments,
      items: shop.concat(rewards)
    })
  })

  if (failed.length) console.log("failed", failed.length, failed.slice(0, 12).join(" | "))
  const filled = details.filter((row) => row.augments.length).length
  if (filled < 150) {
    console.error("only", filled, "heroes have augments")
    process.exit(1)
  }

  const byWin = details.slice().sort((a, b) => b.hero.winRate - a.hero.winRate || b.hero.games - a.hero.games)
  const champions = byWin.map((row, index) => {
    const old = catalog.champions.find((item) => item.key === row.hero.key) || {}
    return {
      id: row.hero.id,
      key: row.hero.key,
      name: row.hero.name || old.name || given[row.hero.key] || row.hero.key,
      title: row.hero.title || old.title || spoken[row.hero.key] || row.hero.key,
      tags: tags[row.hero.key] || [],
      winRate: row.hero.winRate,
      pickRate: row.hero.pickRate,
      games: row.hero.games,
      grade: grade(row.hero.winRate),
      tierLabel: "",
      rank: index + 1,
      aliases: require("./champion-aliases")[row.hero.key] || [],
      icon: championIcon[row.hero.key] || old.icon || "",
      augments: row.augments.map((item) => ({
        name: item.name,
        score: item.score,
        winRate: item.winRate,
        games: item.games,
        grade: grade(item.winRate),
        icon: iconOf(item.name, item.id),
        rarity: rarityOf(item.name, item.id)
      })),
      items: row.items.map((item) => ({
        name: item.name,
        score: item.score,
        winRate: item.winRate,
        games: item.games,
        icon: itemIcon[item.name] || ""
      }))
    }
  })

  const next = {
    patch: report.patch,
    source: "ARAMKit",
    sourceUrl: "https://aramkit.cn",
    updatedAt: report.date,
    note: "胜率来自 ARAMKit " + report.patch + "（" + report.date + "），按英雄胜率排序。SS≥56%，S≥53%，A≥50%，B≥47%。",
    augments: augments.filter((item) => item.winRate > 0),
    champions
  }
  fs.writeFileSync(CATALOG, "export default " + JSON.stringify(next) + ";\n")
  writeGallery(next)
  const missingAug = champions.reduce((sum, champ) => sum + champ.augments.filter((item) => !item.icon).length, 0)
  const missingItem = champions.reduce((sum, champ) => sum + champ.items.filter((item) => !item.icon).length, 0)
  console.log("wrote", champions.length, "top", champions[0].title, champions[0].winRate)
  console.log("missing augment icons", missingAug, "missing item icons", missingItem)
  execFileSync(process.execPath, [path.join(__dirname, "build-search-index.js")], { stdio: "inherit" })
}

function writeGallery(catalog) {
  const gallery = {
    patch: catalog.patch,
    note: catalog.note,
    champions: catalog.champions.map((item) => ({
      key: item.key,
      name: item.name,
      title: item.title,
      tags: item.tags || [],
      winRate: item.winRate,
      grade: item.grade,
      rank: item.rank,
      icon: item.icon
    })),
    augments: catalog.augments.map((item) => ({
      id: item.id,
      name: item.name,
      winRate: item.winRate,
      grade: item.grade,
      icon: item.icon,
      rank: item.rank,
      rarity: item.rarity || 0
    }))
  }
  fs.writeFileSync(path.join(ROOT, "src", "common", "gallery.js"), "export default " + JSON.stringify(gallery) + ";\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
