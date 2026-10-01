# 海克斯大乱斗助手

英雄联盟「海克斯大乱斗」微信小程序。按胜率查看英雄和海克斯，点进英雄可以看到围绕每个海克斯的构建方案。

## 功能

- **英雄图鉴**：173 位英雄按胜率排序，卡片上有排名、头像和 SS / S / A / B 评级。可按战士、法师、坦克、刺客、射手、软辅筛选。
- **搜索**：支持中文名、称号、昵称、全拼和首字母。例如「剑圣」「jiansheng」「js」「轮子妈」「vn」「男枪」。
- **海克斯**：按胜率浏览海克斯，可按稀有度筛选为全部、白银、黄金、棱彩。
- **构建方案**：每个方案以一个海克斯为核心，旁边给出两个备选。能直接购买的装备按出场次数排列；金铲铲、终极九头蛇这类装备只出现在对应海克斯的方案里，并标成「奖」。

## 数据说明

胜率来自 [Hexdata](https://hexdata.com.cn/heroes)，当前快照为 **16.19**（2026-09-27）。

评级阈值：SS ≥ 56%，S ≥ 53%，A ≥ 50%，B ≥ 47%。

英雄头像来自 Data Dragon。海克斯和装备图标、海克斯稀有度来自 OP.GG。小程序里的列表使用本地快照 `data/catalog.js`，打开页面时不再请求这些接口。

真机要显示图片，需要在微信公众平台把下面两个地址加到 **downloadFile 合法域名**：

- `https://ddragon.leagueoflegends.com`
- `https://opgg-static.akamaized.net`

开发者工具里勾选「不校验合法域名」即可本地预览。

更新胜率快照可在项目根目录执行：

```bash
node scripts/fetch-hexdata.js
npm run build:mp-weixin
```

`scripts/fetch-hexdata.js` 会重写 `data/catalog.js`，并重新生成拼音和昵称索引。

## 技术栈

- [uni-app](https://uniapp.dcloud.net.cn/)（Vue 3 + Vite）
- 编译目标：微信小程序
- 页面源码在 `src/pages`，本地数据在 `data/catalog.js`

## 本地运行

需要 **Node.js 18 或更高版本**，以及微信开发者工具。

```bash
npm install
npm run build:mp-weixin
```

编译产物在 `dist/build/mp-weixin`。用微信开发者工具打开本仓库根目录即可预览；`project.config.json` 已把小程序根目录指向这份产物。

改完页面后重新执行 `npm run build:mp-weixin`，再到开发者工具里编译。

## 目录

```text
src/pages/index            首页：搜索、英雄图鉴、海克斯列表
src/pages/champion         英雄详情：按海克斯拆开的构建方案
src/common                 稀有度文案、限定装备、英雄搜索索引
data/catalog.js            Hexdata 胜率快照
scripts/fetch-hexdata.js   重新抓取胜率并生成搜索索引
```
