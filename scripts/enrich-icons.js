const fs = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "catalog.js");
const PATCH = "16.19.1";

function get(url) {
  return execFileSync(
    "curl.exe",
    ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "40", url],
    { maxBuffer: 30 * 1024 * 1024 }
  ).toString("utf8");
}

function readCatalog() {
  const raw = fs.readFileSync(FILE, "utf8").replace(/^export default\s+/, "").replace(/;\s*$/, "");
  return JSON.parse(raw);
}

function itemName(entry) {
  return typeof entry === "string" ? entry : entry.name;
}

function main() {
  const catalog = readCatalog();
  const champions = JSON.parse(get("https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/data/zh_CN/champion.json")).data;
  const championIcon = {};
  Object.keys(champions).forEach((id) => {
    championIcon[id.toLowerCase()] = "https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/img/champion/" + id + ".png";
  });

  const items = JSON.parse(get("https://lol-api-champion.op.gg/api/meta/items?hl=zh_CN")).data;
  const itemIcon = {};
  items.forEach((item) => {
    if (item.name && item.image_url) itemIcon[item.name] = item.image_url;
  });

  const augments = JSON.parse(get("https://lol-api-champion.op.gg/api/meta/aram-augments?hl=zh_CN")).data;
  const augmentIcon = {};
  augments.forEach((item) => {
    if (!item.largeIcon) return;
    const url = item.largeIcon.includes("?")
      ? item.largeIcon
      : item.largeIcon + "?image=q_auto:good,f_png,w_128";
    augmentIcon[item.id] = url;
  });

  const missingItems = {};
  catalog.champions.forEach((champ) => {
    champ.icon = championIcon[champ.key] || "";
    champ.augments.forEach((augment) => {
      augment.icon = augmentIcon[augment.id] || "";
    });
    champ.cores = (champ.cores || []).map((row) =>
      row.map((entry) => {
        const name = itemName(entry);
        const icon = itemIcon[name] || "";
        if (!icon) missingItems[name] = true;
        return { name, icon };
      })
    );
  });
  catalog.augments.forEach((augment) => {
    augment.icon = augmentIcon[augment.id] || "";
  });

  fs.writeFileSync(FILE, "export default " + JSON.stringify(catalog) + ";\n");
  const missingChampions = catalog.champions.filter((champ) => !champ.icon).map((champ) => champ.key);
  const missingAugments = catalog.augments.filter((augment) => !augment.icon).length;
  console.log("champions missing icon", missingChampions.join(",") || "none");
  console.log("global augments missing icon", missingAugments);
  console.log("items missing icon", Object.keys(missingItems).join(" | ") || "none");
}

main();
