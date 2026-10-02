const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")
const { pickItemIcons } = require("./item-icons")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "data", "catalog.js")
const PATCH = "16.19.1"

function get(url) {
  return execFileSync(
    "curl.exe",
    ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "40", url],
    { maxBuffer: 20 * 1024 * 1024 }
  ).toString("utf8")
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

function percent(text) {
  const match = String(text).match(/([\d.]+)\s*%/)
  return match ? Number(match[1]) : 0
}

function count(text) {
  const digits = String(text).replace(/[^\d]/g, "")
  return digits ? Number(digits) : 0
}

function grade(win) {
  if (win >= 56) return "SS"
  if (win >= 53) return "S"
  if (win >= 50) return "A"
  if (win >= 47) return "B"
  return "C"
}

function parseRows(html) {
  const rows = []
  const re = /<tr>([\s\S]*?)<\/tr>/g
  let match
  while ((match = re.exec(html))) rows.push(match[1])
  return rows
}

function cellText(row) {
  const cells = []
  const re = /<td>([\s\S]*?)<\/td>/g
  let match
  while ((match = re.exec(row))) cells.push(match[1].replace(/<[^>]+>/g, "").trim())
  return cells
}

function cellLink(row) {
  const match = row.match(/<a href="([^"]+)">([^<]*)<\/a>/)
  return match ? { href: match[1], text: match[2].trim() } : null
}

function parseHeroList(html) {
  const heroes = []
  parseRows(html).forEach((row) => {
    const link = cellLink(row)
    if (!link || link.href.indexOf("/hero/") !== 0) return
    const cells = cellText(row)
    const slug = link.href.split("/").pop()
    const key = slug.replace(/^\d+-/, "")
    const id = Number(slug.split("-")[0])
    heroes.push({
      id,
      key,
      slug,
      label: link.text,
      winRate: percent(cells[1] || ""),
      games: count((cells[1] || "").split("样本").pop())
    })
  })
  return heroes
}

function parseBlurb(html) {
  const paragraph = (html.match(/<p>Patch[\s\S]*?<\/p>/) || [""])[0].replace(/<[^>]+>/g, "")
  if (paragraph.indexOf("选取率") >= 0) return paragraph
  const meta = html.match(/<meta name="description" content="([^"]*)"/)
  return meta ? meta[1] : paragraph
}

function parseStatTable(html) {
  const tables = []
  const re = /<tbody>([\s\S]*?)<\/tbody>/g
  let match
  while ((match = re.exec(html))) tables.push(match[1])
  return tables.map((body) =>
    parseRows(body)
      .map((row) => {
        const link = cellLink(row)
        const cells = cellText(row)
        if (!link) return null
        return {
          href: link.href,
          name: link.text,
          score: Number(cells[1]) || 0,
          winRate: percent(cells[2] || ""),
          games: count(cells[3] || "")
        }
      })
      .filter(Boolean)
  )
}

function main() {
  const catalog = readCatalog()
  const championIcon = {}
  const augmentIcon = {}
  const itemIcon = {}
  catalog.champions.forEach((champ) => {
    championIcon[champ.key] = champ.icon
    ;(champ.augments || []).forEach((item) => {
      if (item.name && item.icon) augmentIcon[item.name] = item.icon
    })
    ;(champ.cores || []).forEach((row) => {
      row.forEach((item) => {
        if (item.name && item.icon) itemIcon[item.name] = item.icon
      })
    })
  })
  catalog.augments.forEach((item) => {
    if (item.name && item.icon) augmentIcon[item.name] = item.icon
  })

  const itemMeta = JSON.parse(get("https://lol-api-champion.op.gg/api/meta/items?hl=zh_CN")).data
  Object.assign(itemIcon, pickItemIcons(itemMeta))
  const augmentMeta = JSON.parse(get("https://lol-api-champion.op.gg/api/meta/aram-augments?hl=zh_CN")).data
  const augmentRarity = {}
  augmentMeta.forEach((item) => {
    if (!item.name) return
    if (item.rarity != null) augmentRarity[item.name] = item.rarity
    if (!item.largeIcon) return
    const url = item.largeIcon.includes("?") ? item.largeIcon : item.largeIcon + "?image=q_auto:good,f_png,w_128"
    augmentIcon[item.name] = url
  })

  const championsJson = JSON.parse(
    get("https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/data/zh_CN/champion.json")
  ).data
  const tags = {}
  const spoken = {}
  Object.keys(championsJson).forEach((id) => {
    const row = championsJson[id]
    const key = id.toLowerCase()
    tags[key] = row.tags || []
    spoken[key] = row.title
    championIcon[key] = championIcon[key] || "https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/img/champion/" + id + ".png"
  })

  console.log("fetch hero list")
  const listed = parseHeroList(get("https://hexdata.com.cn/heroes"))
  console.log("heroes", listed.length)
  if (listed.length < 150) {
    console.error("hero list too short")
    process.exit(1)
  }

  const details = []
  const failed = []
  let done = 0
  listed.forEach((hero) => {
    let html = ""
    try {
      html = getPage("https://hexdata.com.cn/hero/" + hero.slug)
      sleep(2)
      const tables = parseStatTable(html)
      const blurb = parseBlurb(html)
      const pick = percent((blurb.match(/选取率\s*[\d.]+%/) || [""])[0])
      const tierMatch = blurb.match(/层级\s*(T\d|OP)/)
      const augments = (tables[0] || []).slice(0, 8)
      if (!augments.length) failed.push(hero.key + " empty")
      details.push({
        hero,
        pickRate: pick,
        tierLabel: tierMatch ? tierMatch[1] : "",
        augments,
        items: (tables[1] || []).slice(0, 12)
      })
    } catch (err) {
      failed.push(hero.key + " " + err.message)
    }
    done += 1
    if (done % 20 === 0) console.log("pages", done)
  })

  if (failed.length) console.log("failed", failed.length, failed.slice(0, 12).join(" | "))
  const filled = details.filter((row) => row.augments.length && row.pickRate).length
  if (filled < 150) {
    console.error("only", filled, "heroes have both a pick rate and augments")
    process.exit(1)
  }

  const byWin = details.slice().sort((a, b) => b.hero.winRate - a.hero.winRate || b.hero.games - a.hero.games)
  const champions = byWin.map((row, index) => {
    const old = catalog.champions.find((item) => item.key === row.hero.key) || {}
    return {
      id: row.hero.id,
      key: row.hero.key,
      name: old.name || spoken[row.hero.key] || row.hero.key,
      title: old.title || row.hero.label,
      tags: tags[row.hero.key] || [],
      winRate: row.hero.winRate,
      pickRate: row.pickRate,
      games: row.hero.games,
      grade: grade(row.hero.winRate),
      tierLabel: row.tierLabel,
      rank: index + 1,
      aliases: require("./champion-aliases")[row.hero.key] || [],
      icon: championIcon[row.hero.key] || old.icon || "",
      augments: row.augments.map((item) => ({
        name: item.name,
        score: item.score,
        winRate: item.winRate,
        games: item.games,
        grade: grade(item.winRate),
        icon: iconOf(item.name)
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

  function iconOf(name) {
    if (augmentIcon[name]) return augmentIcon[name]
    const hit = Object.keys(augmentIcon)
      .filter((key) => key && name.endsWith(key))
      .sort((a, b) => b.length - a.length)[0]
    return hit ? augmentIcon[hit] : ""
  }

  function rarityOf(name) {
    if (augmentRarity[name]) return augmentRarity[name]
    const hit = Object.keys(augmentRarity)
      .filter((key) => key && name.endsWith(key))
      .sort((a, b) => b.length - a.length)[0]
    return hit ? augmentRarity[hit] : 0
  }

  console.log("fetch augment list")
  const augmentRows = parseRows(get("https://hexdata.com.cn/augments"))
  const augments = []
  augmentRows.forEach((row) => {
    const link = cellLink(row)
    if (!link || link.href.indexOf("/augment/") !== 0) return
    const cells = cellText(row)
    const id = Number(link.href.split("/").pop().split("-")[0])
    const summary = cells[1] || ""
    augments.push({
      id,
      name: link.text,
      score: Number((summary.match(/综合评分\s*([\d.]+)/) || [])[1]) || 0,
      winRate: percent((summary.match(/胜率\s*[\d.]+%/) || [""])[0]),
      rarity: rarityOf(link.text),
      icon: iconOf(link.text)
    })
  })
  augments.sort((a, b) => b.winRate - a.winRate)
  augments.forEach((item, index) => {
    item.rank = index + 1
    item.grade = grade(item.winRate)
  })
  console.log("augments", augments.length, augments[0] && augments[0].name, augments[0] && augments[0].winRate)

  const next = {
    patch: "16.19",
    source: "Hexdata",
    sourceUrl: "https://hexdata.com.cn/heroes",
    updatedAt: "2026-09-27",
    note: "胜率来自 Hexdata 16.19（2026-09-27），按英雄胜率排序。SS≥56%，S≥53%，A≥50%，B≥47%。",
    augments: augments.filter((item) => item.winRate > 0).slice(0, 80),
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
  fs.writeFileSync(path.join(ROOT, "data", "gallery.js"), "export default " + JSON.stringify(gallery) + ";\n")
}

main()
