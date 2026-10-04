<template>
  <view v-if="missing" class="page">
    <view class="empty">没有找到这个海克斯</view>
  </view>

  <view v-else class="page">
    <view class="head">
      <image class="head-icon hex-frame" :class="'r' + hex.rarity" :src="hex.icon" mode="aspectFill" />
      <view class="head-main">
        <view class="name">{{ hex.name }}</view>
        <view class="chips">
          <text class="chip" :class="'r' + hex.rarity">{{ rarityText }}</text>
        </view>
      </view>
      <view class="badge" :class="hex.grade">{{ hex.grade }}</view>
    </view>

    <view class="seg">
      <view class="seg-item" :class="{ on: tab === 'info' }" @tap="tab = 'info'">基础信息</view>
      <view class="seg-item" :class="{ on: tab === 'heroes' }" @tap="tab = 'heroes'">英雄方案</view>
    </view>

    <view :class="{ off: tab !== 'info' }">
      <view class="box">
        <view class="box-title">效果说明</view>
        <text class="desc">{{ hex.desc || "暂时没有效果说明" }}</text>
      </view>

      <view class="box">
        <view class="box-title">数据概览</view>
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
        <view class="foot">样本 {{ gamesText }} 场 · {{ patch }}</view>
      </view>

      <view v-if="items.length" class="box">
        <view class="box-title">特殊装备</view>
        <view v-for="item in items" :key="item.name" class="list-row inset" @tap="openItem(item.id)">
          <image class="list-icon" :src="item.icon" mode="aspectFill" lazy-load />
          <view class="list-copy">
            <view class="list-name special">{{ item.name }}</view>
            <view class="meta">拿到这个海克斯才能获得，只出现在它的构建方案里</view>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>

      <view class="box">
        <view class="box-title">适配英雄（搭配评分前 {{ heroes.length }}）</view>
        <view v-if="heroes.length === 0" class="foot">暂时没有英雄搭配样本</view>
        <view v-else class="hero-grid">
          <view v-for="item in heroes" :key="item.key" class="hero-cell" @tap="openChampion(item.key)">
            <view class="hero-shot">
              <image class="hero-face" :src="item.icon" mode="aspectFill" lazy-load />
              <text class="mini" :class="item.grade">{{ item.grade }}</text>
            </view>
            <view class="hero-name">{{ item.title }}</view>
          </view>
        </view>
      </view>
    </view>

    <view :class="{ off: tab !== 'heroes' }">
      <view class="hint">按 HexScore 排列，搭配胜率是这个英雄拿到该海克斯后的胜率。</view>
      <view v-if="heroes.length === 0" class="empty">暂时没有英雄搭配样本</view>
      <view v-for="item in heroes" :key="item.key" class="list-row" @tap="openChampion(item.key)">
        <image class="list-icon" :src="item.icon" mode="aspectFill" lazy-load />
        <view class="list-copy">
          <view class="list-name">{{ item.title }}</view>
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
import details from "./augments.js"
import gallery from "../../common/gallery.js"
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

.head-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 20rpx;
  background: #0e1018;
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

.chip.r4 {
  background: #3a3020;
  color: #e0b15a;
}

.chip.r8 {
  background: #33224a;
  color: #d9a8ff;
}

.desc {
  color: #d5dbe8;
  font-size: 26rpx;
  line-height: 1.7;
  white-space: pre-wrap;
}

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
</style>
