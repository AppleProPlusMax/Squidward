const fs = require("fs")
const path = require("path")
const { pickItemIcons } = require("./item-icons")
const hexdata = require("./hexdata-client")

const ROOT = path.join(__dirname, "..")
const CATALOG = path.join(ROOT, "src", "pages", "champion", "catalog.js")
const ITEMS = path.join(ROOT, "src", "pages", "item", "items.js")
const AUGMENTS = path.join(ROOT, "src", "pages", "augment", "augments.js")
const OUT = path.join(ROOT, "src", "pages", "rating", "resources.js")

const OPGG_AUG_PREFIX = "https://opgg-static.akamaized.net/meta/images/lol/latest/aram-augment/"
const OPGG_AUG_SUFFIX = "?image=q_auto:good,f_png,w_128"
const OPGG_ITEM_PREFIX = "https://opgg-static.akamaized.net/meta/images/lol/latest/item/"

function readModule(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "")
  return JSON.parse(raw)
}

function iconIdOf(icon) {
  return (String(icon || "").match(/\/item\/(\d+)\.png/) || [])[1] || ""
}

async function main() {
  const catalog = readModule(CATALOG)
  const itemsDetail = readModule(ITEMS)
  const augmentsDetail = readModule(AUGMENTS)
  const overview = await hexdata.fetchOverview({ patch: catalog.patch })

  let ddVersion = ""
  catalog.champions.forEach((champ) => {
    const hit = String(champ.icon || "").match(/cdn\/([\d.]+)\//)
    if (hit && !ddVersion) ddVersion = hit[1]
  })
  if (!ddVersion) ddVersion = await hexdata.latestDdragon()

  const ddChampPrefix = "https://ddragon.leagueoflegends.com/cdn/" + ddVersion + "/img/champion/"
  const ddItemPrefix = "https://ddragon.leagueoflegends.com/cdn/" + ddVersion + "/img/item/"
  const ddSpellPrefix = "https://ddragon.leagueoflegends.com/cdn/" + ddVersion + "/img/spell/"

  const rawChampions = {}
  catalog.champions.forEach((champ) => {
    let icon = String(champ.icon || "")
    if (icon.startsWith(ddChampPrefix) && icon.endsWith(".png")) {
      icon = "#" + icon.slice(ddChampPrefix.length, -4)
    }
    rawChampions[String(champ.id)] = [champ.key, champ.title, champ.name, icon]
  })

  const opggAug = (await hexdata.getJson("https://lol-api-champion.op.gg/api/meta/aram-augments?hl=zh_CN")).data
  const augments = {}
  opggAug.forEach((item) => {
    if (item.id == null) return
    const url = item.largeIcon
      ? item.largeIcon.includes("?")
        ? item.largeIcon
        : item.largeIcon + OPGG_AUG_SUFFIX
      : ""
    augments[String(item.id)] = {
      id: String(item.id),
      name: item.name || "",
      rarity: item.rarity || 0,
      icon: url,
      hasDetail: !!augmentsDetail[String(item.id)]
    }
  })
  Object.keys(overview.augRes || {}).forEach((id) => {
    const row = overview.augRes[id]
    const prev = augments[String(id)] || {}
    augments[String(id)] = {
      id: String(id),
      name: (row && row.name) || prev.name || "",
      rarity: (row && row.rarity ? hexdata.rarityCode(row.rarity) : 0) || prev.rarity || 0,
      icon: prev.icon || "",
      hasDetail: !!augmentsDetail[String(id)]
    }
  })

  const rawAugments = {}
  Object.keys(augments).forEach((id) => {
    const a = augments[id]
    let ic = String(a.icon || "")
    if (ic.startsWith(OPGG_AUG_PREFIX) && ic.endsWith(OPGG_AUG_SUFFIX)) {
      ic = "#" + ic.slice(OPGG_AUG_PREFIX.length, -OPGG_AUG_SUFFIX.length)
    }
    rawAugments[id] = [a.name, a.rarity || 1, ic, a.hasDetail ? 1 : 0]
  })

  const opggItems = (await hexdata.getJson("https://lol-api-champion.op.gg/api/meta/items?hl=zh_CN")).data
  const iconByName = pickItemIcons(opggItems)
  const ddItems = (await hexdata.getJson("https://ddragon.leagueoflegends.com/cdn/" + ddVersion + "/data/zh_CN/item.json")).data
  const items = {}

  Object.keys(ddItems).forEach((id) => {
    const row = ddItems[id]
    const icon = iconByName[row.name] || ddItemPrefix + id + ".png"
    const detailId = iconIdOf(icon) || String(id)
    items[String(id)] = {
      id: itemsDetail[detailId] ? detailId : "",
      name: row.name || "",
      icon
    }
  })

  opggItems.forEach((entry) => {
    if (entry.id == null) return
    const icon =
      iconByName[entry.name] ||
      (entry.image_url
        ? entry.image_url.includes("?")
          ? entry.image_url
          : entry.image_url + "?image=q_auto:good,f_png,w_128"
        : "")
    const detailId = iconIdOf(icon) || String(entry.id)
    items[String(entry.id)] = {
      id: itemsDetail[detailId] ? detailId : "",
      name: entry.name || "",
      icon
    }
  })

  Object.keys(overview.itemRes || {}).forEach((id) => {
    const row = overview.itemRes[id]
    if (!row || !row.name) return
    const prev = items[String(id)] || {}
    const icon = iconByName[row.name] || prev.icon || ""
    const detailId = iconIdOf(icon) || String(id)
    items[String(id)] = {
      id: itemsDetail[detailId] ? detailId : prev.id || "",
      name: row.name,
      icon
    }
  })

  const rawItems = {}
  Object.keys(items).forEach((id) => {
    const it = items[id]
    let ic = String(it.icon || "")
    if (ic.startsWith(OPGG_ITEM_PREFIX) && ic.endsWith(".png")) {
      ic = "@o:" + ic.slice(OPGG_ITEM_PREFIX.length, -4)
    } else if (ic.startsWith(ddItemPrefix) && ic.endsWith(".png")) {
      ic = "@d:" + ic.slice(ddItemPrefix.length, -4)
    }
    rawItems[id] = [it.name, ic, it.id || ""]
  })

  const ddSpells = (await hexdata.getJson("https://ddragon.leagueoflegends.com/cdn/" + ddVersion + "/data/zh_CN/summoner.json")).data
  const rawSpells = {}
  Object.keys(ddSpells).forEach((key) => {
    const row = ddSpells[key]
    if (!row || !row.key) return
    rawSpells[String(row.key)] = [row.name || "", key]
  })

  const code = `const DC = ${JSON.stringify(ddChampPrefix)};
const DI = ${JSON.stringify(ddItemPrefix)};
const DS = ${JSON.stringify(ddSpellPrefix)};
const OA = ${JSON.stringify(OPGG_AUG_PREFIX)};
const OAS = ${JSON.stringify(OPGG_AUG_SUFFIX)};
const OI = ${JSON.stringify(OPGG_ITEM_PREFIX)};

const RC = ${JSON.stringify(rawChampions)};
const RA = ${JSON.stringify(rawAugments)};
const RI = ${JSON.stringify(rawItems)};
const RS = ${JSON.stringify(rawSpells)};

const champions = {};
for (const id in RC) {
  const r = RC[id];
  champions[id] = {
    key: r[0],
    title: r[1],
    name: r[2],
    icon: r[3].startsWith("#") ? DC + r[3].slice(1) + ".png" : r[3]
  };
}

const augments = {};
for (const id in RA) {
  const r = RA[id];
  augments[id] = {
    id,
    name: r[0],
    rarity: r[1],
    icon: r[2].startsWith("#") ? OA + r[2].slice(1) + OAS : r[2],
    hasDetail: Boolean(r[3]),
    detailId: r[3] ? id : ""
  };
}

const items = {};
for (const id in RI) {
  const r = RI[id];
  let icon = r[1];
  if (icon.startsWith("@o:")) icon = OI + icon.slice(3) + ".png";
  else if (icon.startsWith("@d:")) icon = DI + icon.slice(3) + ".png";
  items[id] = {
    id: r[2],
    detailId: r[2],
    name: r[0],
    icon
  };
}

const spells = {};
for (const id in RS) {
  const r = RS[id];
  spells[id] = {
    name: r[0],
    icon: DS + r[1] + ".png"
  };
}

export default { champions, augments, items, spells };
`

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, code)
  console.log(
    "wrote compact rating resources:",
    Object.keys(rawChampions).length,
    "champions,",
    Object.keys(rawAugments).length,
    "augments,",
    Object.keys(rawItems).length,
    "items,",
    Object.keys(rawSpells).length,
    "spells,",
    fs.statSync(OUT).size,
    "bytes"
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
