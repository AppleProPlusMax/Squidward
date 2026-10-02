<template>
  <view v-if="missing" class="page">
    <view class="empty">没有找到这件装备</view>
  </view>

  <view v-else class="page">
    <view class="head">
      <image class="head-icon" :src="item.icon" mode="aspectFill" />
      <view class="head-main">
        <view class="name">{{ item.name }}</view>
        <view class="chips">
          <text class="chip gold">{{ item.gold }} 金币</text>
          <text class="chip special" :class="{ off: !item.requiresName }">特殊装备</text>
        </view>
        <view class="plain">{{ item.plaintext }}</view>
      </view>
      <view class="badge" :class="item.grade">{{ item.grade }}</view>
    </view>

    <view class="seg">
      <view class="seg-item" :class="{ on: tab === 'info' }" @tap="tab = 'info'">基础信息</view>
      <view class="seg-item" :class="{ on: tab === 'heroes' }" @tap="tab = 'heroes'">英雄方案</view>
    </view>

    <view :class="{ off: tab !== 'info' }">
      <view class="box" :class="{ off: !item.requiresName }" @tap="openAugment">
        <view class="box-title">获取条件</view>
        <view class="list-row inset">
          <image class="list-icon hex-frame" :class="'r' + item.requiresRarity" :src="item.requiresIcon" mode="aspectFill" lazy-load />
          <view class="list-copy">
            <view class="list-name special">{{ item.requiresName }}</view>
            <view class="meta">商店买不到，拿到这个海克斯才会获得</view>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="box">
        <view class="box-title">属性</view>
        <view v-if="stats.length === 0" class="foot">没有基础属性</view>
        <view v-for="line in stats" :key="line" class="stat-line">{{ line }}</view>
      </view>

      <view class="box" :class="{ off: !item.effect }">
        <view class="box-title">装备效果</view>
        <text class="desc">{{ item.effect }}</text>
      </view>

      <view class="box" :class="{ off: from.length === 0 }">
        <view class="box-title">合成材料</view>
        <view class="parts">
          <view v-for="part in from" :key="part.key" class="part">
            <image class="part-icon" :src="part.icon" mode="aspectFill" lazy-load />
            <view class="part-name">{{ part.name }}</view>
          </view>
        </view>
      </view>

      <view class="box">
        <view class="box-title">数据概览</view>
        <view class="stats">
          <view class="stat">
            <view class="stat-value">{{ item.winRate }}%</view>
            <view class="stat-label">加权胜率</view>
          </view>
          <view class="stat">
            <view class="stat-value">{{ item.score }}</view>
            <view class="stat-label">HexScore</view>
          </view>
          <view class="stat">
            <view class="stat-value">{{ item.heroCount }}</view>
            <view class="stat-label">覆盖英雄</view>
          </view>
        </view>
        <view class="foot">样本 {{ gamesText }} 场 · {{ patch }}</view>
      </view>

      <view class="box">
        <view class="box-title">适配英雄（搭配评分前 {{ heroes.length }}）</view>
        <view v-if="heroes.length === 0" class="foot">暂时没有英雄出装样本</view>
        <view v-else class="hero-grid">
          <view v-for="hero in heroes" :key="hero.key" class="hero-cell" @tap="openChampion(hero.key)">
            <view class="hero-shot">
              <image class="hero-face" :src="hero.icon" mode="aspectFill" lazy-load />
              <text class="mini" :class="hero.grade">{{ hero.grade }}</text>
            </view>
            <view class="hero-name">{{ hero.title }}</view>
          </view>
        </view>
      </view>
    </view>

    <view :class="{ off: tab !== 'heroes' }">
      <view class="hint">按 HexScore 排列，搭配胜率是这个英雄出这件装备时的胜率。</view>
      <view v-if="heroes.length === 0" class="empty">暂时没有英雄出装样本</view>
      <view v-for="hero in heroes" :key="hero.key" class="list-row" @tap="openChampion(hero.key)">
        <image class="list-icon" :src="hero.icon" mode="aspectFill" lazy-load />
        <view class="list-copy">
          <view class="list-name">{{ hero.title }}</view>
          <view class="meta">搭配胜率 {{ hero.winRate }}% · HexScore {{ hero.score }} · 样本 {{ hero.gamesText }}</view>
        </view>
        <view class="badge sm" :class="hero.grade">{{ hero.grade }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import details from "../../../data/items.js"
import gallery from "../../../data/gallery.js"

const missing = ref(false)
const tab = ref("info")
const patch = "Patch " + gallery.patch
const item = ref({
  name: "",
  icon: "",
  plaintext: "",
  gold: 0,
  effect: "",
  grade: "",
  winRate: 0,
  score: 0,
  games: 0,
  heroCount: 0,
  requiresId: "",
  requiresName: "",
  requiresIcon: "",
  requiresRarity: 0
})
const stats = ref([])
const from = ref([])
const heroes = ref([])

const gamesText = computed(() => formatGames(item.value.games))

function formatGames(value) {
  return String(value || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function openChampion(key) {
  uni.navigateTo({
    url: "/pages/champion/champion?key=" + key
  })
}

function openAugment() {
  if (!item.value.requiresId) return
  uni.navigateTo({
    url: "/pages/augment/augment?id=" + item.value.requiresId
  })
}

onLoad((query) => {
  const id = (query && query.id) || ""
  const found = details[id]
  if (!found) {
    missing.value = true
    return
  }
  uni.setNavigationBarTitle({ title: found.name })
  const requires = found.requires || {}
  item.value = {
    name: found.name,
    icon: found.icon,
    plaintext: found.plaintext,
    gold: found.gold,
    effect: found.effect,
    grade: found.grade,
    winRate: found.winRate,
    score: found.score,
    games: found.games,
    heroCount: found.heroCount,
    requiresId: requires.id ? String(requires.id) : "",
    requiresName: requires.name || "",
    requiresIcon: requires.icon || "",
    requiresRarity: requires.rarity || 0
  }
  stats.value = found.stats || []
  from.value = (found.from || []).map((part, index) => ({ ...part, key: index + part.name }))
  heroes.value = (found.heroes || []).map((hero) => ({ ...hero, gamesText: formatGames(hero.games) }))
})
</script>

<style>
.page {
  padding: 28rpx 28rpx 60rpx;
}

.head {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #1c2030;
  border-radius: 20rpx;
  padding: 24rpx;
}

.head-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 20rpx;
  background: #0e1018;
  border: 3rpx solid #c8a15a;
  flex-shrink: 0;
}

.head-main {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 40rpx;
  font-weight: 700;
}

.chips {
  margin: 10rpx 0 6rpx;
}

.chip {
  display: inline-block;
  padding: 4rpx 16rpx;
  margin-right: 10rpx;
  border-radius: 999rpx;
  background: #2a3044;
  color: #d5dbe8;
  font-size: 22rpx;
}

.chip.gold {
  background: #3a3020;
  color: #e0b15a;
}

.chip.special {
  background: #33224a;
  color: #d9a8ff;
}

.plain,
.foot,
.hint {
  color: #9aa3b5;
  font-size: 22rpx;
}

.foot {
  margin-top: 16rpx;
}

.hint {
  margin: 20rpx 0 4rpx;
  line-height: 1.5;
}

.stat-line {
  color: #7cc4ff;
  font-size: 26rpx;
  line-height: 1.8;
}

.desc {
  color: #d5dbe8;
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

.parts {
  display: flex;
  flex-wrap: wrap;
}

.part {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.part-icon {
  display: block;
  width: 80rpx;
  height: 80rpx;
  border-radius: 14rpx;
  background: #0e1018;
}

.part-name {
  width: 100%;
  margin-top: 8rpx;
  color: #d5dbe8;
  font-size: 20rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
