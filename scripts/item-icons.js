const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const CATALOG = path.join(__dirname, "..", "src", "pages", "champion", "catalog.js")
const ITEM_META = "https://lol-api-champion.op.gg/api/meta/items?hl=zh_CN"

function onAram(entry) {
  const maps = (entry.availability && entry.availability.map_ids) || []
  return maps.indexOf(12) >= 0
}

// One name can map to several ids: the base item (e.g. 3135) plus Arena/variant copies
// (223135, 773135) that still ship the old artwork. Prefer the base id whenever it exists.
function pickItemIcons(meta) {
  const byName = {}
  meta.forEach((entry) => {
    if (!entry.name || !entry.image_url) return
    ;(byName[entry.name] = byName[entry.name] || []).push(entry)
  })
  const icons = {}
  Object.keys(byName).forEach((name) => {
    const list = byName[name]
    const base = list.filter((entry) => entry.id < 10000 && onAram(entry)).sort((a, b) => a.id - b.id)[0]
    icons[name] = (base || list[list.length - 1]).image_url
  })
  return icons
}

function get(url) {
  return execFileSync("curl.exe", ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "40", url], {
    maxBuffer: 30 * 1024 * 1024
  }).toString("utf8")
}

function main() {
  const raw = fs.readFileSync(CATALOG, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  const catalog = JSON.parse(raw)
  const icons = pickItemIcons(JSON.parse(get(ITEM_META)).data)
  let changed = 0
  const missing = {}
  catalog.champions.forEach((champ) => {
    ;(champ.items || []).forEach((item) => {
      const icon = icons[item.name]
      if (!icon) {
        missing[item.name] = true
        return
      }
      if (icon !== item.icon) changed += 1
      item.icon = icon
    })
  })
  fs.writeFileSync(CATALOG, "export default " + JSON.stringify(catalog) + ";\n")
  console.log("item icons changed", changed, "missing", Object.keys(missing).join(" | ") || "none")
  execFileSync(process.execPath, [path.join(__dirname, "fetch-items.js")], { stdio: "inherit" })
}

module.exports = { pickItemIcons }

if (require.main === module) main()
