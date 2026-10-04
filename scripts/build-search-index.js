const fs = require("fs")
const path = require("path")
const { pinyin } = require("pinyin-pro")
const aliases = require("./champion-aliases")

const CATALOG = path.join(__dirname, "..", "src", "pages", "champion", "catalog.js")
const OUT = path.join(__dirname, "..", "src", "common", "champion-index.js")

function readCatalog() {
  const raw = fs.readFileSync(CATALOG, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  return JSON.parse(raw)
}

function syllables(text) {
  const clean = String(text).replace(/[·.\s]+/g, "")
  if (!clean) return []
  return pinyin(clean, { toneType: "none", type: "array", nonZh: "consecutive" })
    .map((part) => String(part).toLowerCase())
    .filter(Boolean)
}

function addPhrase(bag, text) {
  const value = String(text).trim().toLowerCase()
  if (!value) return
  bag.add(value.replace(/[·.\s]+/g, ""))
  const parts = syllables(value)
  if (!parts.length) return
  bag.add(parts.join(""))
  bag.add(parts.map((part) => part[0]).join(""))
}

function main() {
  const catalog = readCatalog()
  const index = {}
  catalog.champions.forEach((champ) => {
    const bag = new Set()
    addPhrase(bag, champ.name)
    addPhrase(bag, champ.title)
    addPhrase(bag, champ.key)
    ;(aliases[champ.key] || []).forEach((alias) => addPhrase(bag, alias))
    index[champ.key] = Array.from(bag).join("|")
  })
  const missing = Object.keys(aliases).filter((key) => !index[key])
  if (missing.length) {
    console.error("alias keys missing from catalog:", missing.join(", "))
    process.exit(1)
  }
  const body = "export default " + JSON.stringify(index) + "\n"
  fs.writeFileSync(OUT, body)
  console.log("wrote", OUT, catalog.champions.length, "champions")
  const samples = ["masteryi", "morgana", "vayne", "graves"]
  samples.forEach((key) => console.log(key, index[key]))
}

main()
