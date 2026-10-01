<template>
  <view v-if="missing" class="page">
    <view class="empty">没有找到这个英雄</view>
  </view>

  <view v-else class="page">
    <view class="head">
      <image class="portrait" :src="champion.icon" mode="aspectFill" />
      <view class="head-main">
        <view class="name">{{ champion.name }}</view>
        <view class="title">{{ champion.title }}</view>
        <view class="meta">强度排名 {{ champion.rank }}</view>
      </view>
      <view class="tier">{{ champion.tierLabel }}</view>
    </view>

    <view class="section">推荐海克斯</view>
    <view class="hint">同一品质取表现分靠前的 5 个。对局里优先拿更高的。</view>
    <view v-for="group in groups" :key="group.label" class="group">
      <view class="group-title">{{ group.label }}</view>
      <view v-for="hex in group.items" :key="hex.id" class="hex" :class="'r' + hex.rarity">
        <image class="hex-icon" :src="hex.icon" mode="aspectFill" />
        <view class="hex-main">
          <view class="hex-name">{{ hex.name }}</view>
          <view class="hex-stat">表现 {{ hex.performance }} · 选用 {{ hex.popular }}%</view>
        </view>
      </view>
    </view>

    <view class="section">推荐出装</view>
    <view v-if="builds.length === 0" class="hint">这个英雄暂时没有核心出装</view>
    <view v-for="item in builds" :key="item.index" class="build">
      <view class="build-index">方案 {{ item.index }}</view>
      <view class="gear">
        <block v-for="(piece, pieceIndex) in item.items" :key="piece.name">
          <text v-if="pieceIndex > 0" class="arrow">›</text>
          <view class="piece">
            <image class="item-icon" :src="piece.icon" mode="aspectFill" />
            <text class="piece-name">{{ piece.name }}</text>
          </view>
        </block>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import catalog from "../../../data/catalog.js"
import { rarityLabel, tierLabel } from "../../common/meta.js"

const missing = ref(false)
const champion = ref({
  name: "",
  title: "",
  tierLabel: "",
  rank: "",
  icon: ""
})
const groups = ref([])
const builds = ref([])

onLoad((query) => {
  const key = (query && query.key) || ""
  const found = catalog.champions.find((item) => item.key === key)
  if (!found) {
    missing.value = true
    return
  }
  uni.setNavigationBarTitle({ title: found.name })
  const grouped = {}
  found.augments.forEach((item) => {
    const label = rarityLabel(item.rarity)
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(item)
  })
  const order = ["棱彩", "黄金", "白银", "其他"]
  groups.value = order
    .filter((label) => grouped[label] && grouped[label].length)
    .map((label) => ({ label, items: grouped[label] }))
  builds.value = (found.cores || []).map((row, index) => ({
    index: index + 1,
    items: row.map((entry) => (typeof entry === "string" ? { name: entry, icon: "" } : entry))
  }))
  champion.value = {
    name: found.name,
    title: found.title,
    tierLabel: tierLabel(found.tier),
    rank: found.rank,
    icon: found.icon
  }
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

.portrait {
  width: 128rpx;
  height: 128rpx;
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

.title,
.meta,
.hint,
.hex-stat,
.build-index,
.piece-name {
  color: #9aa3b5;
  font-size: 24rpx;
}

.meta {
  margin-top: 8rpx;
}

.tier {
  background: #3a2a12;
  color: #f0c36a;
  font-weight: 700;
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
  flex-shrink: 0;
}

.section {
  margin: 32rpx 0 12rpx;
  font-size: 32rpx;
  font-weight: 700;
}

.group {
  margin-bottom: 16rpx;
}

.group-title {
  color: #c8a15a;
  margin: 8rpx 0;
}

.hex,
.build {
  background: #1c2030;
  border-radius: 16rpx;
  padding: 16rpx 18rpx;
  margin-bottom: 12rpx;
}

.hex {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.hex-icon,
.item-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 14rpx;
  background: #0e1018;
  flex-shrink: 0;
}

.hex-icon {
  border: 2rpx solid #3a4258;
}

.hex.r1 .hex-icon {
  border-color: #b9c4d6;
}

.hex.r4 .hex-icon {
  border-color: #e0b15a;
}

.hex.r8 .hex-icon {
  border-color: #d27cff;
}

.hex-main {
  flex: 1;
  min-width: 0;
}

.hex-name {
  font-size: 28rpx;
  font-weight: 600;
}

.gear {
  display: flex;
  align-items: flex-start;
  margin-top: 16rpx;
}

.piece {
  width: 132rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.piece-name {
  margin-top: 8rpx;
  text-align: center;
  line-height: 1.3;
  font-size: 20rpx;
}

.arrow {
  color: #6d7688;
  font-size: 36rpx;
  line-height: 72rpx;
  padding: 0 4rpx;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 80rpx 0;
}
</style>
