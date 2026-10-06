# 海克斯大乱斗助手

英雄联盟「海克斯大乱斗」微信小程序。按胜率查看英雄和海克斯，点进英雄可以看到围绕每个海克斯的构建方案，也可以打开海克斯和装备的详情。

## 功能

- **英雄图鉴**：173 位英雄按胜率排序，卡片上有排名、称号、头像、胜率和 SS / S / A / B / C 评级。可按战士、法师、坦克、刺客、射手、软辅筛选。
- **搜索**：支持中文名、称号、昵称、全拼和首字母。例如「剑圣」「jiansheng」「js」「轮子妈」「vn」「男枪」。
- **海克斯**：首页按胜率列出胜率靠前的海克斯，可按稀有度筛选为全部、白银、黄金、棱彩。图标带对应色边。
- **构建方案**：每个方案以一个海克斯为核心，旁边给出两个备选。能直接购买的装备按出场次数排列；金铲铲、终极九头蛇这类装备只出现在对应海克斯的方案里，并标成「奖」。
- **英雄详情**：构建方案之外，还可以看这个英雄的推荐海克斯和推荐装备。推荐海克斯按拿到该海克斯后的搭配胜率排列，推荐装备按这名英雄出这件装备时的胜率排列。
- **海克斯详情**：效果说明、胜率、选取率、综合评分，以及会掉落的特殊装备和适配英雄。
- **装备详情**：金币、属性、效果和合成材料。商店买不到的装备会标明对应海克斯，并列出适配英雄。

## 数据说明

胜率来自 [Hexdata](https://hexdata.com.cn/heroes)，当前快照为 **16.19**（2026-09-27）。

评级阈值：SS ≥ 56%，S ≥ 53%，A ≥ 50%，B ≥ 47%，低于 47% 为 C。

英雄头像来自 Data Dragon。海克斯和装备图标、海克斯稀有度来自 OP.GG。页面使用本地快照，打开时不再请求这些接口。

首页只带一份精简列表 `src/common/gallery.js`。英雄出装、海克斯详情和装备详情放在分包里，避免微信主包过大：

- `src/pages/champion/catalog.js`：英雄胜率、构建方案里的海克斯
- `src/pages/champion/gear.js`：每名英雄的推荐装备
- `src/pages/champion/matchups.js`：每个海克斯方案里出场最多的装备
- `src/pages/augment/augments.js`：海克斯效果和适配英雄
- `src/pages/item/items.js`：装备属性和适配英雄

真机要显示图片，需要在微信公众平台把下面两个地址加到 **downloadFile 合法域名**：

- `https://ddragon.leagueoflegends.com`
- `https://opgg-static.akamaized.net`

开发者工具里勾选「不校验合法域名」即可本地预览。`project.config.json` 已关闭域名校验。

更新胜率快照可在项目根目录按顺序执行：

```bash
node scripts/fetch-hexdata.js
node scripts/fetch-augments.js
node scripts/fetch-items.js
node scripts/fetch-matchups.js
npm run build:mp-weixin
```

`fetch-hexdata.js` 会重写英雄目录和首页列表，并重新生成拼音和昵称索引。后面三条分别刷新海克斯详情、装备详情，以及英雄页的推荐装备和方案出装。`fetch-matchups.js` 依赖前两步的结果；中途被限流时再执行一次即可从缓存续跑。

## 技术栈

- [uni-app](https://uniapp.dcloud.net.cn/)（Vue 3 + Vite）
- 编译目标：微信小程序
- 主包只有首页；英雄、海克斯、装备详情在 `src/pages.json` 的分包里

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
src/pages/index                 首页：搜索、英雄图鉴、海克斯列表
src/pages/champion              英雄详情分包：构建方案、推荐海克斯、推荐装备
src/pages/augment               海克斯详情分包
src/pages/item                  装备详情分包
src/common/gallery.js           首页用的英雄和海克斯列表
src/common/champion-index.js    拼音和昵称搜索索引
scripts/fetch-hexdata.js        重新抓取胜率并生成搜索索引
scripts/fetch-augments.js       生成海克斯详情
scripts/fetch-items.js          生成装备详情
scripts/fetch-matchups.js       生成推荐装备和方案出装
```
