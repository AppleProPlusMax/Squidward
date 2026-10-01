<template>
  <view v-if="missing" class="page">
    <view class="empty">没有找到这个英雄</view>
  </view>

  <view v-else class="page">
    <view class="head">
      <image class="portrait" :src="champion.icon" mode="aspectFill" />
      <view class="head-main">
        <view class="name">{{ champion.title }}</view>
        <view class="aliases">
          <text class="chip">{{ champion.name }}</text>
          <text v-for="alias in champion.aliases" :key="alias" class="chip">{{ alias }}</text>
        </view>
        <view class="meta">胜率 {{ champion.winRate }}% · 选取 {{ champion.pickRate }}% · {{ gamesText }} 场</view>
      </view>
      <view class="badge" :class="champion.grade">{{ champion.grade }}</view>
    </view>

    <view class="section">构建方案</view>
    <view class="hint">海克斯按搭配胜率排序，装备取这个英雄样本里胜率最高的几件。</view>
    <view v-for="hex in augments" :key="hex.name" class="plan">
      <view class="plan-head">
        <view class="badge" :class="hex.grade">{{ hex.grade }}</view>
        <view class="plan-copy">
          <view class="plan-name">{{ hex.name }}</view>
          <view class="meta">胜率 {{ hex.winRate }}% · 样本 {{ formatGames(hex.games) }}</view>
        </view>
      </view>
      <view class="gear">
        <view class="piece">
          <image class="icon core" :src="hex.icon" mode="aspectFill" />
          <text class="piece-name">核心</text>
        </view>
        <view v-for="(item, index) in items.slice(0, 4)" :key="item.name" class="piece">
          <image class="icon" :src="item.icon" mode="aspectFill" />
          <text class="piece-name">{{ index + 1 }} {{ item.name }}</text>
        </view>
      </view>
    </view>

    <view class="section">推荐出装</view>
    <view v-if="items.length === 0" class="hint">这个英雄暂时没有出装样本</view>
    <view v-for="item in items" :key="item.name" class="item-row">
      <image class="icon" :src="item.icon" mode="aspectFill" />
      <view class="plan-copy">
        <view class="plan-name">{{ item.name }}</view>
        <view class="meta">胜率 {{ item.winRate }}% · 样本 {{ formatGames(item.games) }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import catalog from "../../../data/catalog.js"

const missing = ref(false)
const champion = ref({
  name: "",
  title: "",
  aliases: [],
  winRate: "",
  pickRate: "",
  games: 0,
  grade: "",
  icon: ""
})
const augments = ref([])
const items = ref([])

const gamesText = computed(() => formatGames(champion.value.games))

function formatGames(value) {
  return String(value || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

onLoad((query) => {
  const key = (query && query.key) || ""
  const found = catalog.champions.find((item) => item.key === key)
  if (!found) {
    missing.value = true
    return
  }
  uni.setNavigationBarTitle({ title: found.title || found.name })
  champion.value = {
    name: found.name,
    title: found.title,
    aliases: found.aliases || [],
    winRate: found.winRate,
    pickRate: found.pickRate,
    games: found.games,
    grade: found.grade,
    icon: found.icon
  }
  augments.value = found.augments || []
  items.value = found.items || []
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

.portrait,
.icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #0e1018;
  flex-shrink: 0;
}

.portrait {
  width: 128rpx;
  height: 128rpx;
  border-radius: 20rpx;
}

.head-main,
.plan-copy {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 40rpx;
  font-weight: 700;
}

.aliases {
  margin-top: 8rpx;
}

.chip {
  display: inline-block;
  margin: 0 8rpx 8rpx 0;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #2a3144;
  color: #d5dbe8;
  font-size: 22rpx;
}

.meta,
.hint,
.piece-name {
  color: #9aa3b5;
  font-size: 22rpx;
}

.meta {
  margin-top: 4rpx;
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

.badge.SS {
  background: #ff8a1e;
  color: #1a1004;
}

.badge.S {
  background: #e0b15a;
  color: #1a1408;
}

.badge.A {
  background: #d4544a;
  color: #fff;
}

.badge.B {
  background: #3d6fbf;
  color: #fff;
}

.section {
  margin: 32rpx 0 12rpx;
  font-size: 32rpx;
  font-weight: 700;
}

.plan,
.item-row {
  background: #1c2030;
  border-radius: 16rpx;
  padding: 18rpx;
  margin-bottom: 16rpx;
}

.plan-head,
.item-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.plan-name {
  font-size: 30rpx;
  font-weight: 700;
}

.gear {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.piece {
  width: 120rpx;
}

.icon.core {
  border: 2rpx solid #d27cff;
}

.piece-name {
  display: block;
  margin-top: 6rpx;
  line-height: 1.3;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 80rpx 0;
}
</style>
