const fs = require("fs");
const { execFile } = require("child_process");
const path = require("path");

const PATCH = "16.19.1";
const OUT = path.join(__dirname, "..", "data", "catalog.js");

function get(url, attempt) {
  const n = attempt || 1;
  return new Promise((resolve, reject) => {
    execFile(
      "curl.exe",
      ["-sL", "--compressed", "-A", "Mozilla/5.0", "--max-time", "40", url],
      { maxBuffer: 30 * 1024 * 1024, timeout: 45000 },
      (err, stdout) => {
        if (err || !stdout) {
          if (n < 3) return resolve(get(url, n + 1));
          return reject(err || new Error("empty " + url));
        }
        resolve(stdout);
      }
    );
  });
}

function flightPayloads(html) {
  const re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse('"' + m[1] + '"'));
    } catch (e) {}
  }
  return out;
}

function extractArrays(raw, marker) {
  const arrays = [];
  let idx = 0;
  while ((idx = raw.indexOf(marker, idx)) >= 0) {
    const start = idx + marker.length - 1;
    if (raw[start] !== "[") {
      idx += marker.length;
      continue;
    }
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          const slice = raw.slice(start, i + 1);
          try {
            arrays.push(JSON.parse(slice));
          } catch (e) {}
          idx = i + 1;
          break;
        }
      }
    }
    if (depth !== 0) break;
  }
  return arrays;
}

function stripTags(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapPool(limit) {
  const queue = [];
  let active = 0;
  function run(task) {
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      pump();
    });
  }
  function pump() {
    while (active < limit && queue.length) {
      const job = queue.shift();
      active++;
      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  }
  return run;
}

async function main() {
  console.log("fetch list");
  const listHtml = await get("https://op.gg/zh-cn/lol/modes/aram-mayhem");
  const payloads = flightPayloads(listHtml);
  let champions = [];
  let globalAugments = [];
  for (const raw of payloads) {
    for (const arr of extractArrays(raw, '"champions":[')) {
      if (arr[0] && arr[0].champion_id && arr[0].key && arr[0].rank != null) champions = arr;
    }
    for (const arr of extractArrays(raw, '"data":[')) {
      if (arr[0] && arr[0].performance != null && arr[0].rarity != null && arr[0].name) {
        if (arr.length > globalAugments.length) globalAugments = arr;
      }
    }
  }
  if (!champions.length) throw new Error("no champions");
  console.log("champions", champions.length, "augments", globalAugments.length);

  console.log("fetch names");
  const ddragonRaw = await get("https://ddragon.leagueoflegends.com/cdn/" + PATCH + "/data/zh_CN/champion.json");
  const ddragon = JSON.parse(ddragonRaw).data;
  const names = {};
  Object.keys(ddragon).forEach((key) => {
    const c = ddragon[key];
    names[c.id.toLowerCase()] = { name: c.name, title: c.title };
  });
  const run = mapPool(4);
  let done = 0;
  const details = await Promise.all(
    champions.map((champ) =>
      run(async () => {
        const key = champ.key;
        const alias = names[key] || {};
        const base = {
          id: champ.id,
          key,
          name: alias.title || champ.name,
          title: alias.name || champ.name,
          tier: champ.tier,
          rank: champ.rank,
          augments: [],
          cores: [],
          skills: ""
        };
        try {
        const [augHtml, buildHtml] = await Promise.all([
          get("https://op.gg/zh-cn/lol/modes/aram-mayhem/" + key + "/augments"),
          get("https://op.gg/zh-cn/lol/modes/aram-mayhem/" + key + "/build")
        ]);
        let augments = [];
        for (const raw of flightPayloads(augHtml)) {
          for (const arr of extractArrays(raw, '"data":[')) {
            if (arr[0] && arr[0].performance != null && arr[0].rarity != null && !arr[0].champion_ids) {
              if (arr.length > augments.length) augments = arr;
            }
          }
        }
        const byRarity = {};
        augments.forEach((a) => {
          const r = String(a.rarity);
          if (!byRarity[r]) byRarity[r] = [];
          if (a.name && a.popular > 0 && byRarity[r].length < 5) {
            byRarity[r].push({
              id: a.id,
              name: a.name,
              rarity: a.rarity,
              performance: a.performance,
              popular: a.popular
            });
          }
        });
        const flat = Object.keys(byRarity)
          .sort((a, b) => Number(b) - Number(a))
          .reduce((acc, k) => acc.concat(byRarity[k]), []);

        const cores = [];
        const coreAt = buildHtml.indexOf("核心装备");
        if (coreAt >= 0) {
          const rows = buildHtml.slice(coreAt, coreAt + 20000).split("<tr").slice(1, 4);
          rows.forEach((row) => {
            const names = [];
            const altRe = /<img[^>]*alt="([^"]+)"/g;
            let alt;
            while ((alt = altRe.exec(row))) {
              if (alt[1]) names.push(alt[1]);
            }
            if (names.length) cores.push(names);
          });
        }

        let skills = "";
        const buildPayload = flightPayloads(buildHtml).join("\n");
        const skill = buildPayload.match(/"ids":\["([QWER])","([QWER])","([QWER])"\]/);
        if (skill) skills = skill[1] + " > " + skill[2] + " > " + skill[3];

        base.augments = flat;
        base.cores = cores;
        base.skills = skills;
        } catch (err) {
          console.log("skip", key, err.message);
        }
        done++;
        if (done % 20 === 0) console.log("progress", done + "/" + champions.length);
        return base;
      })
    )
  );

  const raritySet = {};
  globalAugments.forEach((a) => {
    raritySet[a.rarity] = (raritySet[a.rarity] || 0) + 1;
  });
  console.log("rarity counts", raritySet);

  const catalog = {
    patch: "16.19",
    source: "OP.GG",
    sourceUrl: "https://op.gg/zh-cn/lol/modes/aram-mayhem",
    updatedAt: "2026-10-01",
    note: "数据来自 OP.GG 当前版本。选用率为 0 的海克斯已下架，不会进入排行。页面公开的是段位、表现分和选用率。",
    augments: globalAugments
      .slice()
      .filter((a) => a.name && a.popular > 0)
      .sort((a, b) => b.performance - a.performance)
      .map((a) => ({
        id: a.id,
        name: a.name,
        rarity: a.rarity,
        performance: a.performance,
        popular: a.popular,
        desc: stripTags(a.desc).slice(0, 80)
      })),
    champions: details.sort((a, b) => a.rank - b.rank)
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, "export default " + JSON.stringify(catalog) + ";\n");
  const stat = fs.statSync(OUT);
  console.log("wrote", OUT, stat.size);
  require("child_process").execFileSync(process.execPath, [path.join(__dirname, "enrich-icons.js")], {
    stdio: "inherit"
  });
  require("child_process").execFileSync(process.execPath, [path.join(__dirname, "fetch-hexdata.js")], {
    stdio: "inherit"
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
