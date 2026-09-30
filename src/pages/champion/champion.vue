<template>
  <view v-if="missing" class="page">
    <view class="empty">没有找到这个英雄</view>
  </view>

  <view v-else class="page">
    <view class="head">
      <view>
        <view class="name">{{ champion.name }}</view>
        <view class="title">{{ champion.title }}</view>
      </view>
      <view class="tier">{{ champion.tierLabel }}</view>
    </view>
    <view class="meta">强度排名 {{ champion.rank }}</view>

    <view class="section">推荐海克斯</view>
    <view class="hint">按 OP.GG 表现分排序，同一品质取前 5。对局里优先拿表现分更高的。</view>
    <view v-for="group in groups" :key="group.label" class="group">
      <view class="group-title">{{ group.label }}</view>
      <view v-for="hex in group.items" :key="hex.id" class="hex">
        <view class="hex-name">{{ hex.name }}</view>
        <view class="hex-stat">表现 {{ hex.performance }} · 选用 {{ hex.popular }}%</view>
      </view>
    </view>

    <view class="section">推荐出装</view>
    <view v-if="builds.length === 0" class="hint">这个英雄暂时没有核心出装</view>
    <view v-for="item in builds" :key="item.index" class="build">
      <view class="build-index">方案 {{ item.index }}</view>
      <view class="build-items">{{ item.names }}</view>
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
  rank: ""
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
  builds.value = (found.cores || []).map((names, index) => ({
    index: index + 1,
    names: names.join(" → ")
  }))
  champion.value = {
    name: found.name,
    title: found.title,
    tierLabel: tierLabel(found.tier),
    rank: found.rank
  }
})
</script>

<style>
.page {
  padding: 28rpx 28rpx 60rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.name {
  font-size: 44rpx;
  font-weight: 700;
}

.title,
.meta,
.hint,
.hex-stat,
.build-index {
  color: #9aa3b5;
  font-size: 24rpx;
}

.meta {
  margin: 12rpx 0 28rpx;
}

.tier {
  background: #3a2a12;
  color: #f0c36a;
  font-weight: 700;
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
}

.section {
  margin: 28rpx 0 12rpx;
  font-size: 32rpx;
  font-weight: 700;
}

.group {
  margin-bottom: 16rpx;
}

.group-title {
  color: #c8a15a;
  margin-bottom: 8rpx;
}

.hex,
.build {
  background: #1c2030;
  border-radius: 16rpx;
  padding: 18rpx 20rpx;
  margin-bottom: 12rpx;
}

.hex-name,
.build-items {
  font-size: 28rpx;
}

.build-items {
  margin-top: 8rpx;
  line-height: 1.5;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 80rpx 0;
}
</style>
