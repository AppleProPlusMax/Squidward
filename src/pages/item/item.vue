<template>
  <view v-if="missing" class="page">
    <view class="empty">没有找到这件装备</view>
  </view>

  <view v-else class="page">
    <view class="head">
      <image class="item-face" :src="item.icon" mode="aspectFill" />
      <view class="head-main">
        <view class="name">{{ item.name }}</view>
        <view class="chips">
          <text class="chip gold">{{ item.gold }} 金币</text>
          <text class="chip special" :class="{ off: !item.requiresName }">特殊装备</text>
        </view>
        <view class="meta">{{ item.plaintext }}</view>
      </view>
      <view class="badge" :class="item.grade">{{ item.grade }}</view>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'info' }" @tap="tab = 'info'">基础信息</view>
      <view class="tab" :class="{ on: tab === 'heroes' }" @tap="tab = 'heroes'">英雄方案</view>
    </view>

    <view class="panel" :class="{ off: tab !== 'info' }">
      <view class="card" :class="{ off: !item.requiresName }" @tap="openAugment">
        <view class="card-title">获取条件</view>
        <view class="item-row">
          <image class="row-icon" :src="item.requiresIcon" mode="aspectFill" />
          <view class="row-copy">
            <view class="hex-name">{{ item.requiresName }}</view>
            <view class="meta">商店买不到，拿到这个海克斯才会获得</view>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">属性</view>
        <view v-if="stats.length === 0" class="meta">没有基础属性</view>
        <view v-for="line in stats" :key="line" class="stat-line">{{ line }}</view>
      </view>

      <view class="card" :class="{ off: !item.effect }">
        <view class="card-title">装备效果</view>
        <text class="desc">{{ item.effect }}</text>
      </view>

      <view class="card" :class="{ off: from.length === 0 }">
        <view class="card-title">合成材料</view>
        <view class="parts">
          <view v-for="part in from" :key="part.key" class="part">
            <image class="part-icon" :src="part.icon" mode="aspectFill" />
            <view class="part-name">{{ part.name }}</view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="card-title">数据概览</view>
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
        <view class="meta">样本 {{ gamesText }} 场 · {{ patch }}</view>
      </view>

      <view class="card">
        <view class="card-title">适配英雄（搭配评分前 {{ heroes.length }}）</view>
        <view v-if="heroes.length === 0" class="meta">暂时没有英雄出装样本</view>
        <view v-else class="grid">
          <view v-for="hero in heroes" :key="hero.key" class="hero" @tap="openChampion(hero.key)">
            <view class="shot">
              <image class="face" :src="hero.icon" mode="aspectFill" />
              <text class="mini" :class="hero.grade">{{ hero.grade }}</text>
            </view>
            <view class="hero-name">{{ hero.title }}</view>
          </view>
        </view>
      </view>
    </view>

    <view class="panel" :class="{ off: tab !== 'heroes' }">
      <view class="hint">按 HexScore 排列，搭配胜率是这个英雄出这件装备时的胜率。</view>
      <view v-if="heroes.length === 0" class="empty">暂时没有英雄出装样本</view>
      <view v-for="hero in heroes" :key="hero.key" class="row" @tap="openChampion(hero.key)">
        <image class="row-icon" :src="hero.icon" mode="aspectFill" />
        <view class="row-copy">
          <view class="row-name">{{ hero.title }}</view>
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
  requiresIcon: ""
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
    requiresIcon: requires.icon || ""
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

.item-face {
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

.off {
  display: none !important;
}

.badge {
  min-width: 64rpx;
  padding: 8rpx 12rpx;
  border-radius: 12rpx;
  background: #3a4258;
  color: #f4f1e8;
  font-weight: 700;
  text-align: center;
  flex-shrink: 0;
}

.badge.sm {
  min-width: 52rpx;
  padding: 4rpx 10rpx;
  font-size: 22rpx;
}

.badge.SS,
.mini.SS {
  background: #ff8a1e;
  color: #1a1004;
}

.badge.S,
.mini.S {
  background: #e0b15a;
  color: #1a1408;
}

.badge.A,
.mini.A {
  background: #d4544a;
  color: #fff;
}

.badge.B,
.mini.B {
  background: #3d6fbf;
  color: #fff;
}

.tabs {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
  padding: 10rpx;
  background: #1c2030;
  border-radius: 18rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 14rpx;
  color: #9aa3b5;
  font-size: 26rpx;
}

.tab.on {
  background: #26314a;
  color: #7cc4ff;
  font-weight: 700;
}

.card {
  margin-top: 20rpx;
  background: #1c2030;
  border-radius: 18rpx;
  padding: 24rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
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

.stats {
  display: flex;
}

.stat {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #f4f1e8;
}

.stat-label,
.meta,
.hint {
  color: #9aa3b5;
  font-size: 22rpx;
}

.stat-label {
  margin-top: 4rpx;
}

.card > .meta {
  margin-top: 16rpx;
}

.hint {
  margin: 20rpx 0 4rpx;
  line-height: 1.5;
}

.item-row,
.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #151925;
  border-radius: 14rpx;
  padding: 16rpx;
}

.row {
  margin-top: 14rpx;
  background: #1c2030;
}

.row-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 14rpx;
  background: #0e1018;
  flex-shrink: 0;
}

.row-copy {
  flex: 1;
  min-width: 0;
}

.hex-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #e9a6ff;
}

.row-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #f4f1e8;
}

.arrow {
  color: #9aa3b5;
  font-size: 40rpx;
}

.grid {
  display: flex;
  flex-wrap: wrap;
}

.hero {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
}

.shot {
  position: relative;
  width: 96rpx;
  height: 96rpx;
}

.face {
  display: block;
  width: 96rpx;
  height: 96rpx;
  border-radius: 16rpx;
  background: #0e1018;
}

.mini {
  position: absolute;
  top: -8rpx;
  right: -10rpx;
  padding: 0 8rpx;
  border-radius: 8rpx;
  background: #3a4258;
  color: #f4f1e8;
  font-size: 18rpx;
  font-weight: 700;
  line-height: 28rpx;
}

.hero-name {
  width: 100%;
  margin-top: 8rpx;
  color: #d5dbe8;
  font-size: 20rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 80rpx 0;
}
</style>
