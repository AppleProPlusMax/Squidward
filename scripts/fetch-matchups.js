const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "src", "pages", "champion", "catalog.js")
const ITEMS = path.join(ROOT, "src", "pages", "item", "items.js")
const GEAR = path.join(ROOT, "src", "pages", "champion", "gear.js")
const MATCHUPS = path.join(ROOT, "src", "pages", "champion", "matchups.js")
const CACHE = path.join(ROOT, "data", ".matchup-pages")
const BASE = "https://hexdata.com.cn/data/hero-augment-items/"
const GAP = 4
const GEAR_LIMIT = 12
const PLAN_LIMIT = 6
const MIN_GEAR_GAMES = 20000
const MIN_PLAN_GAMES = 1000

function get(url) {
  return execFileSync("curl.exe", ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "60", url], {
    maxBuffer: 40 * 1024 * 1024
  }).toString("utf8")
}

function sleep(seconds) {
  if (seconds <= 0) return
  execFileSync("powershell", ["-Command", "Start-Sleep -Seconds " + seconds], { stdio: "ignore" })
}

let blocked = false

function download(id) {
  const body = get(BASE + id + ".json")
  if (body.indexOf('"itemStats"') >= 0) return body
  const wait = Number((body.match(/"retryAfterSeconds"\s*:\s*(\d+)/) || [])[1] || 0)
  console.log("rate limited for", wait, "seconds, rerun later")
  blocked = true
  return ""
}

function read(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  return JSON.parse(raw)
}

function winRate(row) {
  return row.games ? Math.round(row.wins / row.games * 1000) / 10 : 0
}

function main() {
  const catalog = read(CATALOG)
  const items = read(ITEMS)
  const itemById = {}
  Object.values(items).forEach((item) => {
    itemById[item.id] = item
  })
  const augmentName = {}
  catalog.augments.forEach((hex) => {
    augmentName[String(hex.id)] = hex.name
  })
  if (!fs.existsSync(CACHE)) fs.mkdirSync(CACHE)

  const failed = []
  const cachedCount = () => fs.readdirSync(CACHE).filter((name) => fs.statSync(path.join(CACHE, name)).size > 1000).length
  catalog.champions.forEach((champ, index) => {
    const file = path.join(CACHE, champ.id + ".json")
    if (fs.existsSync(file) && fs.statSync(file).size > 1000) return
    if (blocked || cachedCount() >= catalog.champions.length - 5) return
    const body = download(champ.id)
    if (blocked) return
    sleep(GAP)
    if (!body) {
      failed.push(champ.key)
      return
    }
    fs.writeFileSync(file, body)
    if ((index + 1) % 20 === 0) console.log("pages", index + 1, "/", catalog.champions.length)
  })
  if (failed.length) console.log("failed", failed.length, failed.join(" | "))

  const gear = {}
  const matchups = {}
  const ready = []
  catalog.champions.forEach((champ) => {
    const file = path.join(CACHE, champ.id + ".json")
    if (!fs.existsSync(file)) return
    const page = JSON.parse(fs.readFileSync(file, "utf8"))
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

main()
