<template>
  <view class="page">
    <view class="hero">
      <view class="title">海克斯大乱斗 · 隐藏分查询</view>
      <view class="sub">输入召唤师「游戏名称#编号」查询隐藏分、表现分与近期对局</view>
    </view>

    <view class="search-box">
      <text class="search-icon">⌕</text>
      <input
        class="search-input"
        placeholder="例如：召唤师名称#12345"
        :value="queryInput"
        confirm-type="search"
        @input="onQueryInput"
        @confirm="onSubmitSearch"
      />
      <view v-if="queryInput" class="clear-btn" @tap="clearInput">✕</view>
      <view class="search-btn" :class="{ disabled: loading }" @tap="onSubmitSearch">
        {{ loading ? "查询中" : "查询" }}
      </view>
    </view>

    <view v-if="historyList.length > 0" class="history-sec">
      <view class="history-head">
        <text class="history-title">最近查询</text>
        <text class="history-clear" @tap="clearHistory">清空</text>
      </view>
      <scroll-view class="history-scroll" scroll-x>
        <view
          v-for="item in historyList"
          :key="item"
          class="history-chip"
          @tap="selectHistory(item)"
        >
          <text class="history-chip-text">{{ item }}</text>
          <text class="history-chip-del" @tap.stop="removeHistory(item)">×</text>
        </view>
      </scroll-view>
    </view>

    <view v-if="loading" class="state-box">
      <view class="spinner"></view>
      <view class="state-title">正在查询战绩与推算隐藏分...</view>
      <view class="state-sub">首次解析对局可能需要 2~5 秒，请稍候</view>
    </view>

    <view v-else-if="errorMsg" class="state-box error-box">
      <view class="state-title">{{ errorMsg }}</view>
      <view class="state-sub">请确认格式为「游戏名#5位编号」，且近期有海克斯大乱斗对局记录</view>
    </view>

    <view v-else-if="!profile" class="state-box">
      <view class="state-title">输入召唤师 ID 开始查询</view>
      <view class="state-sub">
        点击对局详情中的任意队友或对手名字，还可以直接穿透查询对方的隐藏分
      </view>
    </view>

    <template v-else>
      <!-- 召唤师与隐藏分总览卡片 -->
      <view class="card profile-card">
        <view class="player-row">
          <view class="player-name-wrap">
            <text class="player-name">{{ profile.gameName }}</text>
            <text class="player-tag">#{{ profile.tagLine }}</text>
          </view>
          <text v-if="serverName" class="server-pill">{{ serverName }}</text>
        </view>

        <view class="rating-grid">
          <view class="rating-block" :class="profile.ratingType === 1 ? 'estimated' : 'current'">
            <view class="block-label-row">
              <text class="status-dot" :class="profile.ratingType === 1 ? 'est' : 'cur'"></text>
              <text class="block-label">{{ profile.ratingType === 1 ? "推算隐藏分" : "当前隐藏分" }}</text>
              <text v-if="profile.ratingType === 1" class="estimate-tag">近期推算</text>
            </view>

            <view v-if="hasRating" class="rating-val-row">
              <text class="rating-num" :class="{ est: profile.ratingType === 1 }">{{ profile.rating }}</text>
              <text v-if="hasMargin" class="rating-err">±{{ profile.marginOfError }}</text>
            </view>
            <view v-else class="rating-empty">暂无隐藏分数据</view>

            <view v-if="lastMatchTimeText" class="rating-meta">
              结算对局：{{ lastMatchTimeText }}
            </view>
          </view>

          <view class="perf-block">
            <view class="block-label-row">
              <text class="block-label">近期综合表现分</text>
            </view>
            <template v-if="hasPerf">
              <view class="perf-val-row">
                <text class="perf-num" :class="perfLevel(profile.performanceScore)">
                  {{ formatScore(profile.performanceScore) }}
                </text>
                <text class="perf-max">/ 100</text>
              </view>
              <view class="perf-bar">
                <view
                  class="perf-bar-fill"
                  :class="perfLevel(profile.performanceScore)"
                  :style="{ width: clampScore(profile.performanceScore) + '%' }"
                ></view>
              </view>
              <view v-if="perfComments.length > 0" class="perf-tags">
                <text v-for="(tag, idx) in perfComments" :key="idx" class="perf-tag">{{ tag }}</text>
              </view>
            </template>
            <view v-else class="rating-empty">暂无表现分</view>
          </view>
        </view>
      </view>

      <!-- 近期对局统计卡片 -->
      <view v-if="summary.total > 0" class="card summary-card">
        <view class="sec-head">
          <text class="sec-title">近期战绩统计</text>
          <text class="sec-sub">最近 {{ summary.total }} 场对局</text>
        </view>

        <view class="winrate-box">
          <view class="winrate-top">
            <text class="winrate-record">{{ summary.total }}场 {{ summary.wins }}胜 {{ summary.losses }}负</text>
            <text class="winrate-pct">胜率 {{ summary.winRate }}%</text>
          </view>
          <view class="winrate-bar">
            <view class="winrate-fill" :style="{ width: summary.winRate + '%' }"></view>
          </view>

          <view class="side-table">
            <view class="side-tr head">
              <text class="side-th side-col-name">阵营</text>
              <text class="side-th side-col-rec">战绩</text>
              <text class="side-th side-col-num">占比</text>
              <text class="side-th side-col-num">胜率</text>
            </view>
            <view class="side-tr">
              <view class="side-td side-col-name blue">
                <text class="side-dot blue"></text>
                <text>蓝方</text>
              </view>
              <text class="side-td side-col-rec">
                {{ summary.blueTotal }}场 {{ summary.blueWins }}胜 {{ summary.blueLosses }}负
              </text>
              <text class="side-td side-col-num">{{ summary.blueRate }}%</text>
              <text class="side-td side-col-num highlight">{{ summary.blueWinRate }}%</text>
            </view>
            <view class="side-tr">
              <view class="side-td side-col-name red">
                <text class="side-dot red"></text>
                <text>红方</text>
              </view>
              <text class="side-td side-col-rec">
                {{ summary.redTotal }}场 {{ summary.redWins }}胜 {{ summary.redLosses }}负
              </text>
              <text class="side-td side-col-num">{{ summary.redRate }}%</text>
              <text class="side-td side-col-num highlight">{{ summary.redWinRate }}%</text>
            </view>
          </view>
        </view>

        <view class="stat-grid">
          <view class="stat-cell kda-cell">
            <text class="stat-val gold">{{ summary.kdaRatio }}</text>
            <text class="stat-sub">{{ summary.avgK }} / {{ summary.avgD }} / {{ summary.avgA }}</text>
            <text class="stat-lbl">场均 KDA</text>
          </view>
          <view class="stat-cell">
            <text class="stat-val">{{ summary.hasAdv ? summary.kp + "%" : "—" }}</text>
            <text class="stat-lbl">场均参团率</text>
          </view>
          <view class="stat-cell">
            <text class="stat-val">{{ summary.avgDuration }}</text>
            <text class="stat-lbl">场均时长</text>
          </view>
          <view class="stat-cell">
            <text class="stat-val">{{ summary.hasAdv ? summary.dmgShare + "%" : "—" }}</text>
            <text class="stat-lbl">伤害占比</text>
          </view>
          <view class="stat-cell">
            <text class="stat-val">{{ summary.hasAdv ? summary.takenShare + "%" : "—" }}</text>
            <text class="stat-lbl">承伤占比</text>
          </view>
          <view class="stat-cell">
            <text class="stat-val">{{ summary.hasAdv ? summary.goldShare + "%" : "—" }}</text>
            <text class="stat-lbl">经济占比</text>
          </view>
          <view class="stat-cell span-full">
            <view class="conv-row">
              <text class="stat-lbl">伤害转化率（总伤害 ÷ 总经济）</text>
              <text class="stat-val gold">{{ summary.hasAdv ? summary.dmgConv + "%" : "—" }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 近期对局列表 -->
      <view class="matches-sec">
        <view class="sec-head">
          <text class="sec-title">近期对局明细 ({{ enrichedMatches.length }})</text>
          <text class="sec-sub">点击卡片展开 10 人隐藏分，点击图标看图鉴</text>
        </view>

        <view v-if="enrichedMatches.length === 0" class="empty">暂无海克斯大乱斗近期对局</view>

        <view
          v-for="(m, idx) in enrichedMatches"
          :key="idx"
          class="match-card"
          :class="m.resultClass"
        >
          <!-- 单局摘要主行 -->
          <view class="match-main" @tap="toggleMatch(idx)">
            <view class="match-top">
              <view class="champ-box" @tap.stop="openChampion(m.champ.key)">
                <image v-if="m.champ.icon" class="champ-avatar" :src="m.champ.icon" mode="aspectFill" lazy-load />
                <view v-else class="champ-avatar placeholder"></view>
                <view v-if="m.spells.length > 0" class="spells-col">
                  <image
                    v-for="(sp, sIdx) in m.spells"
                    :key="sIdx"
                    class="spell-icon"
                    :src="sp.icon"
                    mode="aspectFill"
                  />
                </view>
              </view>

              <view class="match-info">
                <view class="match-title-row">
                  <text class="result-badge" :class="m.resultClass">{{ m.resultText }}</text>
                  <text v-if="m.champ.title || m.champ.name" class="champ-name-tag">
                    {{ m.champ.title || m.champ.name }}
                  </text>
                  <text v-if="m.teamSide" class="team-pill" :class="m.teamSide === 100 ? 'blue' : 'red'">
                    {{ m.teamSide === 100 ? "蓝方" : "红方" }}
                  </text>
                  <text class="match-time">{{ m.relativeTime }} · {{ m.durationText }}</text>
                </view>

                <view class="kda-row">
                  <text class="kda-nums">{{ m.kills }} / {{ m.deaths }} / {{ m.assists }}</text>
                  <text class="kda-ratio">KDA {{ m.kdaText }}</text>
                  <text v-if="m.isAborted" class="perf-pill abort">终止</text>
                  <text
                    v-else-if="m.selfPerf !== null"
                    class="perf-pill"
                    :class="perfLevel(m.selfPerf)"
                  >
                    表现 {{ formatScore(m.selfPerf) }}
                  </text>
                </view>
              </view>

              <view class="expand-arrow">{{ expandedMap[idx] ? "收起 ▴" : "详情 ▾" }}</view>
            </view>

            <!-- 本局均分、分差、敌我均分（4列工整网格） -->
            <view v-if="m.hasMatchRating" class="mmr-strip">
              <view class="mmr-pill">
                <text class="mmr-k">本局均分</text>
                <text class="mmr-v">{{ m.avgRating ?? "—" }}</text>
              </view>
              <view class="mmr-pill">
                <text class="mmr-k">己方均分</text>
                <text class="mmr-v">{{ m.teamRating ?? "—" }}</text>
              </view>
              <view class="mmr-pill">
                <text class="mmr-k">敌方均分</text>
                <text class="mmr-v">{{ m.enemyRating ?? "—" }}</text>
              </view>
              <view class="mmr-pill">
                <text class="mmr-k">双方分差</text>
                <text
                  class="mmr-v"
                  :class="m.diffRating > 0 ? 'pos' : m.diffRating < 0 ? 'neg' : ''"
                >
                  {{ m.diffRating === null ? "—" : m.diffRating > 0 ? "+" + m.diffRating : m.diffRating }}
                </text>
              </view>
            </view>

            <!-- 海克斯与出装栏 -->
            <view class="loadout-row">
              <view class="aug-group">
                <view
                  v-for="(aug, aIdx) in m.augments"
                  :key="aIdx"
                  class="slot-wrap"
                  @tap.stop="openAugment(aug)"
                >
                  <image
                    v-if="aug.icon"
                    class="slot-icon hex-frame"
                    :class="'r' + aug.rarity"
                    :src="aug.icon"
                    mode="aspectFill"
                    lazy-load
                  />
                  <view v-else class="slot-icon empty-slot"></view>
                </view>
              </view>

              <view class="loadout-divider"></view>

              <view class="item-group">
                <view
                  v-for="(it, iIdx) in m.items"
                  :key="iIdx"
                  class="slot-wrap"
                  @tap.stop="openItem(it)"
                >
                  <image
                    v-if="it.icon"
                    class="slot-icon item-slot"
                    :src="it.icon"
                    mode="aspectFill"
                    lazy-load
                  />
                  <view v-else class="slot-icon empty-slot"></view>
                </view>
              </view>
            </view>
          </view>

          <!-- 按需展开的 10 人详情 -->
          <view v-if="expandedMap[idx]" class="match-detail">
            <view
              v-for="team in getMatchTeams(idx)"
              :key="team.teamId"
              class="team-section"
            >
              <view class="team-header" :class="team.teamId === 100 ? 'blue' : 'red'">
                <text class="team-title">{{ team.teamId === 100 ? "蓝方队伍" : "红方队伍" }}</text>
                <text v-if="team.avgRating" class="team-mmr">队伍均分 {{ team.avgRating }}</text>
              </view>

              <view
                v-for="(p, pIdx) in team.players"
                :key="pIdx"
                class="p-row"
                :class="{ self: p.isSelf }"
              >
                <view class="p-top">
                  <view class="p-left">
                    <view class="p-champ-box" @tap.stop="openChampion(p.champ.key)">
                      <image
                        v-if="p.champ.icon"
                        class="p-avatar"
                        :src="p.champ.icon"
                        mode="aspectFill"
                        lazy-load
                      />
                      <view v-else class="p-avatar placeholder"></view>
                      <view v-if="p.spells.length > 0" class="p-spells">
                        <image
                          v-for="(sp, sIdx) in p.spells"
                          :key="sIdx"
                          class="p-spell-icon"
                          :src="sp.icon"
                          mode="aspectFill"
                        />
                      </view>
                    </view>

                    <view class="p-identity" @tap.stop="queryPlayer(p.gameName, p.tagLine)">
                      <view class="p-name-line">
                        <text class="p-name">{{ p.gameName }}</text>
                        <text class="p-tag">#{{ p.tagLine }}</text>
                        <text v-if="p.isSelf" class="self-tag">自己</text>
                        <text v-else class="query-hint">🔎</text>
                      </view>
                      <view class="p-stats-line">
                        <text class="p-kda">{{ p.kills }}/{{ p.deaths }}/{{ p.assists }}</text>
                        <text class="p-dmg">输出 {{ p.dmgText }} ({{ p.dmgShare }}%)</text>
                        <text class="p-taken">承伤 {{ p.takenText }}</text>
                      </view>
                      <view class="p-dmg-bar">
                        <view
                          class="p-dmg-fill"
                          :class="team.teamId === 100 ? 'blue' : 'red'"
                          :style="{ width: Math.min(100, p.dmgShare * 2.2) + '%' }"
                        ></view>
                      </view>
                    </view>
                  </view>

                  <view class="p-right">
                    <text v-if="p.rating" class="p-rating-badge">{{ p.rating }}分</text>
                    <text v-if="m.isAborted" class="p-perf-badge abort">终止</text>
                    <text
                      v-else-if="p.perf !== null"
                      class="p-perf-badge"
                      :class="perfLevel(p.perf)"
                    >
                      表现 {{ formatScore(p.perf) }}
                    </text>
                  </view>
                </view>

                <view class="p-loadout">
                  <view class="aug-group sm">
                    <view
                      v-for="(aug, aIdx) in p.augments"
                      :key="aIdx"
                      class="slot-wrap sm"
                      @tap.stop="openAugment(aug)"
                    >
                      <image
                        v-if="aug.icon"
                        class="slot-icon sm hex-frame"
                        :class="'r' + aug.rarity"
                        :src="aug.icon"
                        mode="aspectFill"
                        lazy-load
                      />
                      <view v-else class="slot-icon sm empty-slot"></view>
                    </view>
                  </view>

                  <view class="item-group sm">
                    <view
                      v-for="(it, iIdx) in p.items"
                      :key="iIdx"
                      class="slot-wrap sm"
                      @tap.stop="openItem(it)"
                    >
                      <image
                        v-if="it.icon"
                        class="slot-icon sm item-slot"
                        :src="it.icon"
                        mode="aspectFill"
                        lazy-load
                      />
                      <view v-else class="slot-icon sm empty-slot"></view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部隐藏分说明 -->
      <view class="card faq-card">
        <view class="faq-title">关于海克斯大乱斗隐藏分说明</view>
        <view class="faq-item">
          <text class="faq-q">1. 隐藏分是如何计算的？</text>
          <text class="faq-a">
            基于公开对局记录与匹配系统的平衡特征，通过算法构建的第三方能力评估体系（非官方数值），仅用于衡量海克斯大乱斗模式的综合竞技水平。
          </text>
        </view>
        <view class="faq-item">
          <text class="faq-q">2. 为什么组排或部分场次误差较大？</text>
          <text class="faq-a">
            单人匹配的评估准确度最高；多人组排、跨分段开黑或长期未进行海克斯大乱斗对局时，分值会展示为「近期推算」并附带误差区间（±）。
          </text>
        </view>
        <view class="faq-item">
          <text class="faq-q">3. 表现分代表什么？</text>
          <text class="faq-a">
            综合对局中的 KDA、参团率、伤害占比、承伤、控制与团队协同等多维指标计算出的单场及近期评分（0~100分）。
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import resources from "./resources.js"

const HISTORY_KEY = "aram_rating_search_history_v1"

const SERVER_NAMES = {
  HN1: "艾欧尼亚",
  HN10: "黑色玫瑰",
  NJ100: "联盟一区",
  GZ100: "联盟二区",
  CQ100: "联盟三区",
  TJ100: "联盟四区",
  TJ101: "联盟五区"
}

const RESULT_TEXTS = {
  0: "胜利",
  1: "失败",
  2: "胜利 · 对方投降",
  3: "失败 · 己方投降",
  4: "胜利 · 提前投降",
  5: "失败 · 提前投降",
  6: "对局终止"
}

const queryInput = ref("")
const loading = ref(false)
const errorMsg = ref("")
const profile = ref(null)
const historyList = ref([])
const expandedMap = ref({})
let teamsCache = {}
let requestSeq = 0

function loadHistory() {
  try {
    const saved = uni.getStorageSync(HISTORY_KEY)
    if (Array.isArray(saved)) {
      historyList.value = saved.slice(0, 10)
    }
  } catch (e) {
    historyList.value = []
  }
}

function saveHistory(gameName, tagLine) {
  const full = `${gameName}#${tagLine}`
  const next = [full, ...historyList.value.filter((item) => item !== full)].slice(0, 10)
  historyList.value = next
  try {
    uni.setStorageSync(HISTORY_KEY, next)
  } catch (e) {}
}

function removeHistory(target) {
  const next = historyList.value.filter((item) => item !== target)
  historyList.value = next
  try {
    uni.setStorageSync(HISTORY_KEY, next)
  } catch (e) {}
}

function clearHistory() {
  historyList.value = []
  try {
    uni.removeStorageSync(HISTORY_KEY)
  } catch (e) {}
}

function onQueryInput(e) {
  queryInput.value = e.detail.value || ""
}

function clearInput() {
  queryInput.value = ""
}

function parseRiotId(raw) {
  const cleaned = String(raw || "")
    .replace(/[\u2066-\u2069]/g, "")
    .trim()
  const idx = cleaned.lastIndexOf("#") > -1 ? cleaned.lastIndexOf("#") : cleaned.lastIndexOf("＃")
  if (idx <= 0 || idx >= cleaned.length - 1) return null
  const gameName = cleaned.slice(0, idx).trim()
  const tagLine = cleaned.slice(idx + 1).trim()
  if (!gameName || !tagLine) return null
  return { gameName, tagLine }
}

function getApiBase() {
  if (typeof window !== "undefined" && typeof wx === "undefined") {
    return "/aramkit-api/rating"
  }
  return "https://api.aramkit.cn/rating"
}

function fetchRating(gameName, tagLine) {
  const seq = ++requestSeq
  queryInput.value = `${gameName}#${tagLine}`
  loading.value = true
  errorMsg.value = ""
  expandedMap.value = {}
  teamsCache = {}

  const url = `${getApiBase()}?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`

  uni.request({
    url,
    method: "GET",
    timeout: 15000,
    success(res) {
      if (seq !== requestSeq) return
      const body = res.data || {}
      if (res.statusCode === 200 && body.code === 200 && body.data) {
        profile.value = body.data
        saveHistory(body.data.gameName || gameName, body.data.tagLine || tagLine)
      } else {
        profile.value = null
        errorMsg.value = body.message || "未查询到该召唤师近期海克斯大乱斗记录"
      }
    },
    fail() {
      if (seq !== requestSeq) return
      profile.value = null
      errorMsg.value = "网络请求失败，请检查网络连接（小程序开发工具请开启「不校验合法域名」或配置 request 域名）"
    },
    complete() {
      if (seq === requestSeq) {
        loading.value = false
      }
    }
  })
}

function onSubmitSearch() {
  if (loading.value) return
  const parsed = parseRiotId(queryInput.value)
  if (!parsed) {
    uni.showToast({
      title: "请输入「召唤师名#编号」格式",
      icon: "none"
    })
    return
  }
  fetchRating(parsed.gameName, parsed.tagLine)
}

function selectHistory(item) {
  const parsed = parseRiotId(item)
  if (parsed) {
    fetchRating(parsed.gameName, parsed.tagLine)
  }
}

function queryPlayer(gameName, tagLine) {
  if (!gameName || !tagLine) return
  uni.pageScrollTo({ scrollTop: 0, duration: 200 })
  fetchRating(gameName, tagLine)
}

function toggleMatch(idx) {
  expandedMap.value = {
    ...expandedMap.value,
    [idx]: !expandedMap.value[idx]
  }
}

const serverName = computed(() => {
  if (!profile.value || !profile.value.platformId) return ""
  return SERVER_NAMES[profile.value.platformId] || profile.value.platformId
})

const hasRating = computed(() => {
  return profile.value && typeof profile.value.rating === "number"
})

const hasMargin = computed(() => {
  return profile.value && typeof profile.value.marginOfError === "number"
})

const hasPerf = computed(() => {
  return profile.value && typeof profile.value.performanceScore === "number"
})

const perfComments = computed(() => {
  if (!profile.value || !Array.isArray(profile.value.performanceComment)) return []
  return profile.value.performanceComment.filter(Boolean)
})

const lastMatchTimeText = computed(() => {
  if (!profile.value || profile.value.ratingType !== 0) return ""
  const raw = profile.value.remoteLastMatchTime
  if (!raw) return ""
  const date = new Date(raw)
  const ts = date.getTime()
  if (!Number.isFinite(ts)) return ""
  const pad = (n) => String(n).padStart(2, "0")
  const exact = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  const rel = formatRelativeTime(raw)
  return rel ? `${exact}（${rel}）` : exact
})

function formatScore(val) {
  const num = Number(val ?? 0)
  if (!Number.isFinite(num)) return "0"
  return Number.isInteger(num) ? String(num) : num.toFixed(1)
}

function clampScore(val) {
  const num = Number(val || 0)
  return Math.max(0, Math.min(100, Math.round(num)))
}

function perfLevel(score) {
  const num = Number(score || 0)
  if (num >= 80) return "high"
  if (num >= 60) return "mid"
  return "low"
}

function isWinResult(code) {
  return code === 0 || code === 2 || code === 4
}

function formatDuration(sec) {
  const total = Math.max(0, Math.round(Number(sec || 0)))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}分${String(s).padStart(2, "0")}秒`
}

function formatRelativeTime(iso) {
  const date = new Date(iso)
  const ts = date.getTime()
  if (!Number.isFinite(ts)) return ""
  const diffSec = Math.floor((Date.now() - ts) / 1000)
  if (diffSec < 60) return "刚刚"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatWan(num) {
  const n = Number(num || 0)
  if (n >= 10000) return (n / 10000).toFixed(1) + "w"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(Math.round(n))
}

function getChampionInfo(id) {
  const entry = resources.champions[String(id || 0)]
  if (!entry) return { name: "", title: "", icon: "", key: "" }
  return entry
}

// 过滤掉 <=0 的空槽位并左对齐补齐 4 格，与官网 Ie(e) 保持一致
function getAugmentSlots(p) {
  const validIds = [p.augment0, p.augment1, p.augment2, p.augment3].filter(
    (id) => typeof id === "number" && id > 0
  )
  const padded = [validIds[0] || 0, validIds[1] || 0, validIds[2] || 0, validIds[3] || 0]
  return padded.map((id) => {
    const key = String(id || 0)
    const entry = resources.augments[key]
    if (!entry) return { id: 0, name: "", icon: "", rarity: "1", detailId: "" }
    return {
      id: Number(id),
      name: entry.name,
      icon: entry.icon,
      rarity: String(entry.rarity || "1"),
      detailId: entry.detailId || (entry.hasDetail ? String(entry.id || key) : "")
    }
  })
}

function getItemSlots(p) {
  const ids = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5]
  return ids.map((id) => {
    const key = String(id || 0)
    const entry = resources.items[key]
    if (!entry) return { id: 0, name: "", icon: "", detailId: "" }
    return {
      id: Number(id),
      name: entry.name,
      icon: entry.icon,
      detailId: entry.detailId || entry.id || ""
    }
  })
}

function getSpellList(p) {
  return [p.spell0, p.spell1]
    .map((id) => resources.spells[String(id || 0)])
    .filter((entry) => entry && entry.icon)
}

// 严格对齐 ARAMKit 官网 He(e) 的统计口径
const summary = computed(() => {
  const list = (profile.value && profile.value.matches) || []
  if (list.length === 0) {
    return { total: 0 }
  }

  let wins = 0
  let blueTotal = 0
  let blueWins = 0
  let redTotal = 0
  let redWins = 0
  let sumK = 0
  let sumD = 0
  let sumA = 0
  let sumDur = 0
  let kpSum = 0
  let kpCnt = 0
  let dmgShareSum = 0
  let dmgShareCnt = 0
  let takenShareSum = 0
  let takenShareCnt = 0
  let goldShareSum = 0
  let goldShareCnt = 0
  let selfTotalDmg = 0
  let selfTotalGold = 0
  let hasAdv = false

  for (const m of list) {
    const win = isWinResult(m.matchResult)
    if (win) wins++
    sumK += Number(m.kills || 0)
    sumD += Number(m.deaths || 0)
    sumA += Number(m.assists || 0)
    sumDur += Number(m.durationSeconds || 0)

    const players = Array.isArray(m.participants) ? m.participants : []
    const selfP = players.find((p) => p.isSelf)
    if (selfP) {
      if (selfP.teamId === 100) {
        blueTotal++
        if (win) blueWins++
      } else if (selfP.teamId === 200) {
        redTotal++
        if (win) redWins++
      }

      const pDmg = Number(selfP.totalDamage || 0)
      const pGold = Number(selfP.goldEarned || 0)
      const pTaken = Number(selfP.totalDamageTaken || 0)
      const pKp = Number(selfP.killParticipation || 0)

      if (pDmg > 0 || pGold > 0 || pKp > 0) {
        hasAdv = true
      }

      selfTotalDmg += pDmg
      selfTotalGold += pGold

      if (pKp > 0) {
        kpSum += pKp
        kpCnt++
      }

      const mates = players.filter((p) => p.teamId === selfP.teamId)
      const teamDmg = mates.reduce((acc, p) => acc + Number(p.totalDamage || 0), 0)
      const teamTaken = mates.reduce((acc, p) => acc + Number(p.totalDamageTaken || 0), 0)
      const teamGold = mates.reduce((acc, p) => acc + Number(p.goldEarned || 0), 0)

      if (teamDmg > 0) {
        dmgShareSum += pDmg / teamDmg
        dmgShareCnt++
      }
      if (teamTaken > 0) {
        takenShareSum += pTaken / teamTaken
        takenShareCnt++
      }
      if (teamGold > 0) {
        goldShareSum += pGold / teamGold
        goldShareCnt++
      }
    }
  }

  const total = list.length
  const losses = total - wins
  const winRate = Math.round((wins / total) * 100)
  const kdaRatio = sumD > 0 ? ((sumK + sumA) / sumD).toFixed(2) : (sumK + sumA).toFixed(2)
  const round1 = (val) => Math.round(val * 10) / 10

  return {
    total,
    wins,
    losses,
    winRate,
    blueTotal,
    blueWins,
    blueLosses: blueTotal - blueWins,
    blueRate: Math.round((blueTotal / total) * 100),
    blueWinRate: blueTotal ? Math.round((blueWins / blueTotal) * 100) : 0,
    redTotal,
    redWins,
    redLosses: redTotal - redWins,
    redRate: Math.round((redTotal / total) * 100),
    redWinRate: redTotal ? Math.round((redWins / redTotal) * 100) : 0,
    avgK: round1(sumK / total),
    avgD: round1(sumD / total),
    avgA: round1(sumA / total),
    kdaRatio,
    hasAdv,
    kp: kpCnt ? round1((kpSum / kpCnt) * 100) : 0,
    dmgShare: dmgShareCnt ? round1((dmgShareSum / dmgShareCnt) * 100) : 0,
    takenShare: takenShareCnt ? round1((takenShareSum / takenShareCnt) * 100) : 0,
    goldShare: goldShareCnt ? round1((goldShareSum / goldShareCnt) * 100) : 0,
    dmgConv: selfTotalGold > 0 ? round1((selfTotalDmg / selfTotalGold) * 100) : 0,
    avgDuration: formatDuration(sumDur / total)
  }
})

const sortedMatches = computed(() => {
  const list = (profile.value && profile.value.matches) || []
  return list
    .map((m, i) => ({ m, i, t: new Date(m.gameCreationTime || 0).getTime() || 0 }))
    .sort((a, b) => b.t - a.t || b.i - a.i)
    .map((entry) => entry.m)
})

// 仅构建对局摘要头，10人详情在点击展开时按需构建并缓存
const enrichedMatches = computed(() => {
  const list = sortedMatches.value
  return list.map((m) => {
    const players = Array.isArray(m.participants) ? m.participants : []
    const selfP = players.find((p) => p.isSelf) || {}
    const champ = getChampionInfo(m.championId || selfP.championId)
    const isAborted = m.matchResult === 6 || selfP.performanceScore === null
    const win = isWinResult(m.matchResult)
    const resultClass = m.matchResult === 6 ? "abort" : win ? "win" : "loss"
    const resultText = RESULT_TEXTS[m.matchResult] || (win ? "胜利" : "失败")

    const kills = Number(m.kills ?? selfP.kills ?? 0)
    const deaths = Number(m.deaths ?? selfP.deaths ?? 0)
    const assists = Number(m.assists ?? selfP.assists ?? 0)
    const kdaText = deaths > 0 ? ((kills + assists) / deaths).toFixed(1) : "完美"

    const teamSide = selfP.teamId || 0
    const blueAvg = typeof m.blueAvgRating === "number" ? m.blueAvgRating : null
    const redAvg = typeof m.redAvgRating === "number" ? m.redAvgRating : null
    const teamRating = teamSide === 100 ? blueAvg : teamSide === 200 ? redAvg : null
    const enemyRating = teamSide === 100 ? redAvg : teamSide === 200 ? blueAvg : null
    const diffRating =
      typeof teamRating === "number" && typeof enemyRating === "number"
        ? teamRating - enemyRating
        : null

    return {
      champ,
      spells: getSpellList(selfP),
      isAborted,
      resultClass,
      resultText,
      teamSide,
      relativeTime: formatRelativeTime(m.gameCreationTime),
      durationText: formatDuration(m.durationSeconds),
      kills,
      deaths,
      assists,
      kdaText,
      selfPerf: typeof selfP.performanceScore === "number" ? selfP.performanceScore : null,
      avgRating: typeof m.avgRating === "number" ? m.avgRating : null,
      teamRating,
      enemyRating,
      diffRating,
      hasMatchRating: Boolean(m.avgRating || teamRating || enemyRating),
      augments: getAugmentSlots(selfP),
      items: getItemSlots(selfP)
    }
  })
})

function getMatchTeams(idx) {
  if (teamsCache[idx]) return teamsCache[idx]
  const list = sortedMatches.value
  const m = list[idx]
  if (!m) return []
  const players = Array.isArray(m.participants) ? m.participants : []
  const blueAvg = typeof m.blueAvgRating === "number" ? m.blueAvgRating : null
  const redAvg = typeof m.redAvgRating === "number" ? m.redAvgRating : null

  const buildTeam = (teamId, avgRating) => {
    const teamPlayers = players.filter((p) => p.teamId === teamId)
    const totalDmg = teamPlayers.reduce((acc, p) => acc + Number(p.totalDamage || 0), 0)
    return {
      teamId,
      avgRating,
      players: teamPlayers.map((p) => ({
        gameName: p.gameName,
        tagLine: p.tagLine,
        isSelf: Boolean(p.isSelf),
        champ: getChampionInfo(p.championId),
        spells: getSpellList(p),
        kills: p.kills || 0,
        deaths: p.deaths || 0,
        assists: p.assists || 0,
        dmgText: formatWan(p.totalDamage),
        dmgShare: totalDmg > 0 ? Math.round((Number(p.totalDamage || 0) / totalDmg) * 100) : 0,
        takenText: formatWan(p.totalDamageTaken),
        rating: typeof p.rating === "number" ? p.rating : null,
        perf: typeof p.performanceScore === "number" ? p.performanceScore : null,
        augments: getAugmentSlots(p),
        items: getItemSlots(p)
      }))
    }
  }

  const built = [buildTeam(100, blueAvg), buildTeam(200, redAvg)]
  teamsCache[idx] = built
  return built
}

function openChampion(key) {
  if (!key) return
  uni.navigateTo({
    url: "/pages/champion/champion?key=" + key
  })
}

function openAugment(aug) {
  if (!aug || !aug.icon) return
  if (!aug.detailId) {
    uni.showToast({
      title: (aug.name || "该海克斯") + " 暂无统计详情",
      icon: "none"
    })
    return
  }
  uni.navigateTo({
    url: "/pages/augment/augment?id=" + aug.detailId
  })
}

function openItem(it) {
  if (!it || !it.icon) return
  if (!it.detailId) {
    uni.showToast({
      title: (it.name || "该装备") + " 为基础/消耗品，暂无图鉴详情",
      icon: "none"
    })
    return
  }
  uni.navigateTo({
    url: "/pages/item/item?id=" + it.detailId
  })
}

loadHistory()

onLoad((query) => {
  if (query && query.gameName && query.tagLine) {
    fetchRating(decodeURIComponent(query.gameName), decodeURIComponent(query.tagLine))
  }
})
</script>

<style>
.page {
  padding: 28rpx 28rpx 64rpx;
}

.hero .title {
  font-size: 38rpx;
  font-weight: 700;
}

.hero .sub {
  margin-top: 8rpx;
  color: #c8a15a;
  font-size: 24rpx;
}

.search-box {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #1c2030;
  border-radius: 999rpx;
  padding: 8rpx 10rpx 8rpx 24rpx;
  border: 2rpx solid rgba(200, 161, 90, 0.25);
}

.search-icon {
  color: #9aa3b5;
  font-size: 30rpx;
}

.search-input {
  flex: 1;
  color: #f4f1e8;
  font-size: 26rpx;
  padding: 12rpx 0;
}

.clear-btn {
  color: #9aa3b5;
  padding: 8rpx 12rpx;
  font-size: 24rpx;
}

.search-btn {
  background: #c8a15a;
  color: #1a1408;
  font-weight: 700;
  font-size: 26rpx;
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.search-btn:active {
  transform: scale(0.96);
  opacity: 0.85;
}

.search-btn.disabled {
  opacity: 0.6;
}

.history-sec {
  margin-top: 20rpx;
}

.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.history-title {
  font-size: 22rpx;
  color: #9aa3b5;
}

.history-clear {
  font-size: 22rpx;
  color: #c8a15a;
}

.history-scroll {
  white-space: nowrap;
}

.history-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 18rpx 8rpx 22rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #1c2030;
  color: #d7deec;
  font-size: 22rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

.history-chip-del {
  color: #6c7486;
  font-size: 24rpx;
  line-height: 1;
  padding: 0 4rpx;
}

.state-box {
  margin-top: 48rpx;
  background: #1c2030;
  border-radius: 20rpx;
  padding: 56rpx 32rpx;
  text-align: center;
}

.error-box {
  border: 2rpx solid rgba(226, 92, 92, 0.35);
}

.spinner {
  width: 48rpx;
  height: 48rpx;
  margin: 0 auto 20rpx;
  border: 4rpx solid rgba(200, 161, 90, 0.25);
  border-top-color: #c8a15a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.state-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #f4f1e8;
}

.state-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9aa3b5;
  line-height: 1.5;
}

.card {
  margin-top: 24rpx;
  background: #1c2030;
  border-radius: 20rpx;
  padding: 24rpx;
}

.player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid rgba(255, 255, 255, 0.06);
}

.player-name-wrap {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  flex-wrap: wrap;
}

.player-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #f4f1e8;
}

.player-tag {
  font-size: 24rpx;
  color: #9aa3b5;
}

.server-pill {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(200, 161, 90, 0.16);
  color: #f4d58d;
  font-size: 22rpx;
  font-weight: 600;
}

.rating-grid {
  margin-top: 20rpx;
  display: flex;
  gap: 20rpx;
}

.rating-block,
.perf-block {
  flex: 1;
  min-width: 0;
  background: #141724;
  border-radius: 16rpx;
  padding: 20rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.04);
}

.rating-block.current {
  border-color: rgba(200, 161, 90, 0.22);
}

.rating-block.estimated {
  border-color: rgba(255, 159, 67, 0.28);
}

.block-label-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.cur {
  background: #4cd97b;
  box-shadow: 0 0 8rpx rgba(76, 217, 123, 0.6);
}

.status-dot.est {
  background: #ff9f43;
  box-shadow: 0 0 8rpx rgba(255, 159, 67, 0.6);
}

.block-label {
  font-size: 22rpx;
  color: #9aa3b5;
}

.estimate-tag {
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(255, 159, 67, 0.18);
  color: #ffb974;
  font-size: 18rpx;
}

.rating-val-row {
  margin-top: 12rpx;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.rating-num {
  font-size: 48rpx;
  font-weight: 800;
  color: #f4d58d;
}

.rating-num.est {
  color: #ffb974;
}

.rating-err {
  font-size: 24rpx;
  color: #9aa3b5;
}

.rating-empty {
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #6c7486;
}

.rating-meta {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #9aa3b5;
  line-height: 1.4;
}

.perf-val-row {
  margin-top: 12rpx;
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.perf-num {
  font-size: 44rpx;
  font-weight: 800;
}

.perf-num.high {
  color: #4cd97b;
}

.perf-num.mid {
  color: #5ca8ff;
}

.perf-num.low {
  color: #e66a6a;
}

.perf-max {
  font-size: 22rpx;
  color: #9aa3b5;
}

.perf-bar {
  margin-top: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #252b3d;
  overflow: hidden;
}

.perf-bar-fill {
  height: 100%;
  border-radius: 999rpx;
}

.perf-bar-fill.high {
  background: #4cd97b;
}

.perf-bar-fill.mid {
  background: #5ca8ff;
}

.perf-bar-fill.low {
  background: #e66a6a;
}

.perf-tags {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.perf-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.07);
  color: #d7deec;
  font-size: 20rpx;
}

.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.sec-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #f4f1e8;
}

.sec-sub {
  font-size: 22rpx;
  color: #9aa3b5;
}

.winrate-box {
  background: #141724;
  border-radius: 16rpx;
  padding: 18rpx 20rpx;
}

.winrate-top {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  font-weight: 600;
}

.winrate-pct {
  color: #f4d58d;
}

.winrate-bar {
  margin-top: 10rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(230, 106, 106, 0.35);
  overflow: hidden;
}

.winrate-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #4cd97b);
  border-radius: 999rpx;
}

.side-table {
  margin-top: 16rpx;
  border-top: 2rpx solid rgba(255, 255, 255, 0.05);
  padding-top: 12rpx;
}

.side-tr {
  display: flex;
  align-items: center;
  padding: 6rpx 0;
  font-size: 22rpx;
}

.side-tr.head {
  color: #6c7486;
  font-size: 20rpx;
  padding-bottom: 4rpx;
}

.side-col-name {
  width: 110rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-weight: 600;
}

.side-col-name.blue {
  color: #6eb5ff;
}

.side-col-name.red {
  color: #ff8585;
}

.side-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
}

.side-dot.blue {
  background: #3b82f6;
}

.side-dot.red {
  background: #ef4444;
}

.side-col-rec {
  flex: 1;
  color: #d7deec;
}

.side-col-num {
  width: 100rpx;
  text-align: right;
  color: #9aa3b5;
}

.side-col-num.highlight {
  color: #f4f1e8;
  font-weight: 600;
}

.stat-grid {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.stat-cell {
  background: #141724;
  border-radius: 14rpx;
  padding: 16rpx 12rpx;
  text-align: center;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-cell.span-full {
  grid-column: 1 / -1;
  padding: 14rpx 20rpx;
}

.conv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conv-row .stat-lbl {
  margin-top: 0;
}

.stat-val {
  font-size: 28rpx;
  font-weight: 700;
  color: #f4f1e8;
}

.stat-val.gold {
  color: #f4d58d;
}

.stat-sub {
  font-size: 20rpx;
  color: #c8a15a;
  margin-top: 2rpx;
}

.stat-lbl {
  font-size: 20rpx;
  color: #9aa3b5;
  margin-top: 4rpx;
}

.matches-sec {
  margin-top: 28rpx;
}

.match-card {
  background: #1c2030;
  border-radius: 18rpx;
  margin-bottom: 18rpx;
  border-left: 8rpx solid #4b5563;
  overflow: hidden;
}

.match-card.win {
  border-left-color: #3b82f6;
}

.match-card.loss {
  border-left-color: #ef4444;
}

.match-main {
  padding: 20rpx;
}

.match-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.champ-box {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
}

.champ-avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 16rpx;
  background: #12141c;
}

.spells-col {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.spell-icon {
  width: 38rpx;
  height: 38rpx;
  border-radius: 8rpx;
  background: #12141c;
}

.match-info {
  flex: 1;
  min-width: 0;
}

.match-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.result-badge {
  font-size: 24rpx;
  font-weight: 700;
}

.result-badge.win {
  color: #6eb5ff;
}

.result-badge.loss {
  color: #ff8585;
}

.result-badge.abort {
  color: #9aa3b5;
}

.champ-name-tag {
  font-size: 22rpx;
  color: #d7deec;
  font-weight: 600;
}

.team-pill {
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
}

.team-pill.blue {
  background: rgba(59, 130, 246, 0.18);
  color: #6eb5ff;
}

.team-pill.red {
  background: rgba(239, 68, 68, 0.18);
  color: #ff8585;
}

.match-time {
  font-size: 22rpx;
  color: #9aa3b5;
}

.kda-row {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-wrap: wrap;
}

.kda-nums {
  font-size: 28rpx;
  font-weight: 700;
  color: #f4f1e8;
}

.kda-ratio {
  font-size: 22rpx;
  color: #9aa3b5;
}

.perf-pill {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
}

.perf-pill.high {
  background: rgba(76, 217, 123, 0.16);
  color: #4cd97b;
}

.perf-pill.mid {
  background: rgba(92, 168, 255, 0.16);
  color: #5ca8ff;
}

.perf-pill.low {
  background: rgba(230, 106, 106, 0.16);
  color: #ff8585;
}

.perf-pill.abort {
  background: rgba(154, 163, 181, 0.15);
  color: #9aa3b5;
}

.expand-arrow {
  font-size: 22rpx;
  color: #c8a15a;
  flex-shrink: 0;
}

.mmr-strip {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10rpx;
}

.mmr-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  background: #141724;
  padding: 8rpx 6rpx;
  border-radius: 10rpx;
  font-size: 20rpx;
}

.mmr-k {
  color: #9aa3b5;
  font-size: 18rpx;
}

.mmr-v {
  color: #f4d58d;
  font-weight: 700;
  font-size: 22rpx;
}

.mmr-v.pos {
  color: #4cd97b;
}

.mmr-v.neg {
  color: #ff8585;
}

.loadout-row {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
}

.aug-group,
.item-group {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.loadout-divider {
  width: 2rpx;
  height: 36rpx;
  background: rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.slot-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 10rpx;
  background: #12141c;
  display: block;
}

.slot-icon.sm {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
}

.item-slot {
  border: 2rpx solid rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
}

.empty-slot {
  border: 2rpx dashed rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}

.match-detail {
  border-top: 2rpx solid rgba(255, 255, 255, 0.06);
  background: #151826;
  padding: 16rpx 20rpx 20rpx;
}

.team-section + .team-section {
  margin-top: 20rpx;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 14rpx;
  border-radius: 10rpx;
  font-size: 22rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}

.team-header.blue {
  background: rgba(59, 130, 246, 0.15);
  color: #6eb5ff;
}

.team-header.red {
  background: rgba(239, 68, 68, 0.15);
  color: #ff8585;
}

.p-row {
  padding: 14rpx 12rpx;
  border-radius: 12rpx;
  margin-bottom: 8rpx;
  background: rgba(255, 255, 255, 0.02);
}

.p-row.self {
  background: rgba(200, 161, 90, 0.1);
  border: 2rpx solid rgba(200, 161, 90, 0.28);
}

.p-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
}

.p-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}

.p-champ-box {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.p-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 12rpx;
  background: #12141c;
}

.p-spells {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.p-spell-icon {
  width: 28rpx;
  height: 28rpx;
  border-radius: 6rpx;
}

.p-identity {
  flex: 1;
  min-width: 0;
}

.p-name-line {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.p-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #f4f1e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-tag {
  font-size: 20rpx;
  color: #9aa3b5;
  flex-shrink: 0;
}

.self-tag {
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
  background: #c8a15a;
  color: #1a1408;
  font-size: 18rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.query-hint {
  font-size: 20rpx;
  opacity: 0.7;
  flex-shrink: 0;
}

.p-stats-line {
  margin-top: 4rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 20rpx;
  color: #9aa3b5;
  flex-wrap: wrap;
}

.p-kda {
  color: #d7deec;
  font-weight: 600;
}

.p-dmg-bar {
  margin-top: 6rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.p-dmg-fill {
  height: 100%;
  border-radius: 999rpx;
}

.p-dmg-fill.blue {
  background: #3b82f6;
}

.p-dmg-fill.red {
  background: #ef4444;
}

.p-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
  flex-shrink: 0;
}

.p-rating-badge {
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(200, 161, 90, 0.18);
  color: #f4d58d;
  font-size: 20rpx;
  font-weight: 700;
}

.p-perf-badge {
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  font-size: 18rpx;
  font-weight: 600;
}

.p-perf-badge.high {
  background: rgba(76, 217, 123, 0.16);
  color: #4cd97b;
}

.p-perf-badge.mid {
  background: rgba(92, 168, 255, 0.16);
  color: #5ca8ff;
}

.p-perf-badge.low {
  background: rgba(230, 106, 106, 0.16);
  color: #ff8585;
}

.p-perf-badge.abort {
  background: rgba(154, 163, 181, 0.15);
  color: #9aa3b5;
}

.p-loadout {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
}

.hex-frame {
  box-sizing: border-box;
  border: 2rpx solid #7f8798;
}

.hex-frame.r1 {
  border-color: #9aa3b5;
}

.hex-frame.r2 {
  border-color: #e4b860;
}

.hex-frame.r4,
.hex-frame.r3 {
  border-color: #b784ff;
}

.empty {
  margin-top: 24rpx;
  color: #9aa3b5;
  font-size: 24rpx;
  text-align: center;
  padding: 40rpx 0;
}

.faq-card {
  margin-top: 28rpx;
  border: 2rpx solid rgba(200, 161, 90, 0.14);
}

.faq-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #f4d58d;
  margin-bottom: 14rpx;
}

.faq-item + .faq-item {
  margin-top: 14rpx;
}

.faq-q {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: #f4f1e8;
}

.faq-a {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #9aa3b5;
  line-height: 1.5;
}
</style>
