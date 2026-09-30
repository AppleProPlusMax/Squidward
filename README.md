# 海克斯大乱斗助手

英雄联盟「海克斯大乱斗」微信小程序。输入英雄名称，查看当前版本的强度、推荐海克斯和核心出装。

## 功能

- **英雄强度**：按 OP.GG 排名浏览英雄，支持中文名、称号和英文 key 搜索，例如「盖伦」「安妮」「nautilus」。
- **英雄详情**：每个英雄给出棱彩、黄金、白银各 5 个推荐海克斯，以及 3 套核心出装。
- **海克斯强度**：按表现分查看当前仍在使用的海克斯，并附带简短效果说明。

## 数据说明

数据来自 [OP.GG 海克斯大乱斗](https://op.gg/zh-cn/lol/modes/aram-mayhem)，当前快照版本为 **16.19**。

OP.GG 这个模式公开的是段位、表现分和选用率，没有原始对局胜率百分比。选用率为 0 的海克斯视为已下架，不会进入排行。例如「王中王，靴中靴」表现分很高，但选用率为 0，因此不会排在第一位。

更新数据可在项目根目录执行：

```bash
node scripts/build-catalog.js
npm run build:mp-weixin
```

`scripts/build-catalog.js` 会重新抓取 OP.GG 页面并写回 `data/catalog.js`。

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
src/pages/index       首页：搜索、英雄强度、海克斯强度
src/pages/champion    英雄详情：推荐海克斯和出装
src/manifest.json     小程序 AppID 等配置
data/catalog.js       OP.GG 数据快照
scripts/build-catalog.js  重新抓取数据
```
