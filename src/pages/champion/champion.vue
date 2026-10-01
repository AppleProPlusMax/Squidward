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
    <view class="hint">每套方案先放核心海克斯和备选。能直接购买的装备按出场次数排列，需要对应海克斯才能拿到的装备写在那一套最前面。</view>
    <view v-for="plan in plans" :key="plan.name" class="plan">
      <view class="plan-head">
        <view class="badge" :class="plan.grade">{{ plan.grade }}</view>
        <view class="plan-copy">
          <view class="plan-name">{{ plan.name }}</view>
          <view class="meta">搭配胜率 {{ plan.winRate }}% · 样本 {{ formatGames(plan.games) }}</view>
        </view>
      </view>
      <view class="hex-row">
        <view class="hex-group">
          <view class="role-tag">
            <text>核</text>
            <text>心</text>
          </view>
          <view class="hex-cell">
            <image class="icon" :src="plan.icon" mode="aspectFill" />
            <view class="hex-name">{{ plan.name }}</view>
          </view>
        </view>
        <view v-if="plan.backupName1" class="hex-group">
          <view class="role-tag">
            <text>备</text>
            <text>选</text>
          </view>
          <view class="hex-cell">
            <image class="icon" :src="plan.backupIcon1" mode="aspectFill" />
            <view class="hex-name">{{ plan.backupName1 }}</view>
          </view>
          <view v-if="plan.backupName2" class="hex-cell">
            <image class="icon" :src="plan.backupIcon2" mode="aspectFill" />
            <view class="hex-name">{{ plan.backupName2 }}</view>
          </view>
        </view>
      </view>
      <view class="gear">
        <view v-if="plan.itemName0" class="item-cell">
          <view class="item-icon">
            <image class="icon" :class="{ reward: plan.itemPrize0 }" :src="plan.itemIcon0" mode="aspectFill" />
            <text class="num" :class="{ prize: plan.itemPrize0 }">{{ plan.itemMark0 }}</text>
          </view>
          <view class="item-name">{{ plan.itemName0 }}</view>
        </view>
        <view v-if="plan.itemName1" class="item-cell">
          <view class="item-icon">
            <image class="icon" :class="{ reward: plan.itemPrize1 }" :src="plan.itemIcon1" mode="aspectFill" />
            <text class="num" :class="{ prize: plan.itemPrize1 }">{{ plan.itemMark1 }}</text>
          </view>
          <view class="item-name">{{ plan.itemName1 }}</view>
        </view>
        <view v-if="plan.itemName2" class="item-cell">
          <view class="item-icon">
            <image class="icon" :class="{ reward: plan.itemPrize2 }" :src="plan.itemIcon2" mode="aspectFill" />
            <text class="num" :class="{ prize: plan.itemPrize2 }">{{ plan.itemMark2 }}</text>
          </view>
          <view class="item-name">{{ plan.itemName2 }}</view>
        </view>
        <view v-if="plan.itemName3" class="item-cell">
          <view class="item-icon">
            <image class="icon" :class="{ reward: plan.itemPrize3 }" :src="plan.itemIcon3" mode="aspectFill" />
            <text class="num" :class="{ prize: plan.itemPrize3 }">{{ plan.itemMark3 }}</text>
          </view>
          <view class="item-name">{{ plan.itemName3 }}</view>
        </view>
        <view v-if="plan.itemName4" class="item-cell">
          <view class="item-icon">
            <image class="icon" :class="{ reward: plan.itemPrize4 }" :src="plan.itemIcon4" mode="aspectFill" />
            <text class="num" :class="{ prize: plan.itemPrize4 }">{{ plan.itemMark4 }}</text>
          </view>
          <view class="item-name">{{ plan.itemName4 }}</view>
        </view>
        <view v-if="plan.itemName5" class="item-cell">
          <view class="item-icon">
            <image class="icon" :class="{ reward: plan.itemPrize5 }" :src="plan.itemIcon5" mode="aspectFill" />
            <text class="num" :class="{ prize: plan.itemPrize5 }">{{ plan.itemMark5 }}</text>
          </view>
          <view class="item-name">{{ plan.itemName5 }}</view>
        </view>
        <view v-if="plan.itemName6" class="item-cell">
          <view class="item-icon">
            <image class="icon" :class="{ reward: plan.itemPrize6 }" :src="plan.itemIcon6" mode="aspectFill" />
            <text class="num" :class="{ prize: plan.itemPrize6 }">{{ plan.itemMark6 }}</text>
          </view>
          <view class="item-name">{{ plan.itemName6 }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import catalog from "../../../data/catalog.js"
import gatedItems from "../../common/gated-items.js"

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
const plans = ref([])

const gamesText = computed(() => formatGames(champion.value.games))

function formatGames(value) {
  return String(value || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function grantsItem(hexName, itemName) {
  const required = gatedItems[itemName]
  return !!required && hexName.indexOf(required) >= 0
}

function shopItems(items) {
  return items
    .filter((item) => !gatedItems[item.name])
    .slice()
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate)
    .slice(0, 6)
}

function buildPlans(augments, items) {
  const common = shopItems(items)
  return augments.map((hex) => {
    const reward = items
      .filter((item) => grantsItem(hex.name, item.name))
      .map((item) => ({ ...item, reward: true }))
    const backups = augments.filter((item) => item.name !== hex.name).slice(0, 2)
    const numbered = common.map((item, index) => ({ ...item, order: index + 1 }))
    const gear = reward.concat(numbered).slice(0, 7)
    const plan = {
      name: hex.name,
      icon: hex.icon,
      grade: hex.grade,
      winRate: hex.winRate,
      games: hex.games,
      backupIcon1: backups[0] ? backups[0].icon : "",
      backupName1: backups[0] ? backups[0].name : "",
      backupIcon2: backups[1] ? backups[1].icon : "",
      backupName2: backups[1] ? backups[1].name : ""
    }
    gear.forEach((item, index) => {
      plan["itemIcon" + index] = item.icon
      plan["itemName" + index] = item.name
      plan["itemMark" + index] = item.reward ? "奖" : String(item.order)
      plan["itemPrize" + index] = !!item.reward
    })
    return plan
  })
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
  plans.value = buildPlans(found.augments || [], found.items || [])
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
  display: block;
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

.hex-row {
  display: flex;
  align-items: flex-start;
  gap: 28rpx;
  margin-top: 22rpx;
}

.hex-group {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}

.role-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 88rpx;
  color: #8b93a7;
  font-size: 20rpx;
  line-height: 1.15;
}

.hex-cell {
  width: 132rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hex-name,
.item-name {
  width: 100%;
  margin-top: 8rpx;
  color: #d5dbe8;
  font-size: 20rpx;
  line-height: 28rpx;
  height: 28rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gear {
  display: flex;
  flex-wrap: wrap;
  margin-top: 22rpx;
}

.item-cell {
  width: 25%;
  margin-bottom: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.item-icon {
  position: relative;
  width: 88rpx;
  height: 88rpx;
}

.icon.reward {
  border: 2rpx solid #e0b15a;
}

.num {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: #3d7eff;
  color: #fff;
  font-size: 18rpx;
  line-height: 30rpx;
  text-align: center;
}

.num.prize {
  background: #e0b15a;
  color: #1a1408;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 80rpx 0;
}
</style>
