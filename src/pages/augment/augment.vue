<template>
  <view v-if="missing" class="page">
    <view class="empty">没有找到这个海克斯</view>
  </view>

  <view v-else class="page">
    <view class="head">
      <image class="hex-icon" :class="'r' + hex.rarity" :src="hex.icon" mode="aspectFill" />
      <view class="head-main">
        <view class="name">{{ hex.name }}</view>
        <view class="chips">
          <text class="chip" :class="'r' + hex.rarity">{{ rarityText }}</text>
        </view>
      </view>
      <view class="badge" :class="hex.grade">{{ hex.grade }}</view>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'info' }" @tap="tab = 'info'">基础信息</view>
      <view class="tab" :class="{ on: tab === 'heroes' }" @tap="tab = 'heroes'">英雄方案</view>
    </view>

    <view class="panel" :class="{ off: tab !== 'info' }">
      <view class="card">
        <view class="card-title">效果说明</view>
        <text class="desc">{{ hex.desc || "暂时没有效果说明" }}</text>
      </view>

      <view class="card">
        <view class="card-title">数据概览</view>
        <view class="stats">
          <view class="stat">
            <view class="stat-value">{{ hex.winRate }}%</view>
            <view class="stat-label">胜率</view>
          </view>
          <view class="stat">
            <view class="stat-value">{{ hex.pickRate }}%</view>
            <view class="stat-label">选取率</view>
          </view>
          <view class="stat">
            <view class="stat-value">{{ hex.score }}</view>
            <view class="stat-label">综合评分</view>
          </view>
          <view class="stat">
            <view class="stat-value">{{ hex.heroCount }}</view>
            <view class="stat-label">覆盖英雄</view>
          </view>
        </view>
        <view class="meta">样本 {{ gamesText }} 场 · {{ patch }}</view>
      </view>

      <view v-if="items.length" class="card">
        <view class="card-title">特殊装备</view>
        <view v-for="item in items" :key="item.name" class="item-row" @tap="openItem(item.id)">
          <image class="item-icon" :src="item.icon" mode="aspectFill" />
          <view class="item-copy">
            <view class="item-name">{{ item.name }}</view>
            <view class="meta">拿到这个海克斯才能获得，只出现在它的构建方案里</view>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">适配英雄（搭配评分前 {{ heroes.length }}）</view>
        <view v-if="heroes.length === 0" class="meta">暂时没有英雄搭配样本</view>
        <view v-else class="grid">
          <view v-for="item in heroes" :key="item.key" class="hero" @tap="openChampion(item.key)">
            <view class="shot">
              <image class="face" :src="item.icon" mode="aspectFill" />
              <text class="mini" :class="item.grade">{{ item.grade }}</text>
            </view>
            <view class="hero-name">{{ item.title }}</view>
          </view>
        </view>
      </view>
    </view>

    <view class="panel" :class="{ off: tab !== 'heroes' }">
      <view class="hint">按 HexScore 排列，搭配胜率是这个英雄拿到该海克斯后的胜率。</view>
      <view v-if="heroes.length === 0" class="empty">暂时没有英雄搭配样本</view>
      <view v-for="item in heroes" :key="item.key" class="row" @tap="openChampion(item.key)">
        <image class="row-face" :src="item.icon" mode="aspectFill" />
        <view class="row-copy">
          <view class="item-name">{{ item.title }}</view>
          <view class="meta">搭配胜率 {{ item.winRate }}% · HexScore {{ item.score }} · 样本 {{ item.gamesText }}</view>
        </view>
        <view class="badge sm" :class="item.grade">{{ item.grade }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import details from "../../../data/augments.js"
import gallery from "../../../data/gallery.js"
import { rarityLabel } from "../../common/meta.js"

const missing = ref(false)
const tab = ref("info")
const patch = "Patch " + gallery.patch
const hex = ref({
  name: "",
  icon: "",
  rarity: 0,
  grade: "",
  winRate: 0,
  pickRate: 0,
  score: 0,
  games: 0,
  heroCount: 0,
  desc: ""
})
const items = ref([])
const heroes = ref([])

const rarityText = computed(() => rarityLabel(hex.value.rarity))
const gamesText = computed(() => formatGames(hex.value.games))

function formatGames(value) {
  return String(value || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function openChampion(key) {
  uni.navigateTo({
    url: "/pages/champion/champion?key=" + key
  })
}

function openItem(id) {
  if (!id) return
  uni.navigateTo({
    url: "/pages/item/item?id=" + id
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
  hex.value = {
    name: found.name,
    icon: found.icon,
    rarity: found.rarity,
    grade: found.grade,
    winRate: found.winRate,
    pickRate: found.pickRate,
    score: found.score,
    games: found.games,
    heroCount: found.heroCount,
    desc: found.desc
  }
  items.value = (found.items || []).map((item) => ({
    ...item,
    id: (String(item.icon || "").match(/\/item\/(\d+)\.png/) || [])[1] || ""
  }))
  heroes.value = (found.heroes || []).map((item) => ({ ...item, gamesText: formatGames(item.games) }))
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

.hex-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 20rpx;
  background: #0e1018;
  border: 3rpx solid #3a4258;
  flex-shrink: 0;
}

.hex-icon.r1 {
  border-color: #a7b3c6;
}

.hex-icon.r4 {
  border-color: #e0b15a;
}

.hex-icon.r8 {
  border-color: #c77dff;
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
  margin-top: 10rpx;
}

.chip {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: #2a3044;
  color: #d5dbe8;
  font-size: 22rpx;
}

.chip.r1 {
  color: #d5dbe8;
}

.chip.r4 {
  background: #3a3020;
  color: #e0b15a;
}

.chip.r8 {
  background: #33224a;
  color: #d9a8ff;
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

.panel.off {
  display: none;
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

.desc {
  color: #d5dbe8;
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
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

.item-icon,
.row-face {
  width: 80rpx;
  height: 80rpx;
  border-radius: 14rpx;
  background: #0e1018;
  flex-shrink: 0;
}

.item-copy,
.row-copy {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #e9a6ff;
}

.row .item-name {
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
