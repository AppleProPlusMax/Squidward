const { execFileSync } = require("child_process")
function get(url) {
  return execFileSync("curl.exe", ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "40", url], {
    maxBuffer: 20 * 1024 * 1024
  }).toString("utf8")
}
const heroes = get("https://hexdata.com.cn/heroes")
const aug = get("https://hexdata.com.cn/augments")
const hrow = heroes.match(/<tr><td><a href="\/hero\/157-yasuo">[\s\S]*?<\/tr>/)
console.log("HERO", hrow && hrow[0])
const arow = aug.match(/<tr><td><a href="\/augment\/[^"]+">[\s\S]*?<\/tr>/)
console.log("AUG", arow && arow[0])
console.log("aug tables", (aug.match(/<tbody>/g) || []).length)
