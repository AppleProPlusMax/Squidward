<template>
  <view class="page">
    <view class="hero">
      <view class="title">海克斯大乱斗助手</view>
      <view class="sub">OP.GG · 版本 {{ patch }}</view>
    </view>

    <input
      class="search"
      placeholder="输入英雄，如 盖伦、安妮、nautilus"
      :value="keyword"
      confirm-type="search"
      @input="onInput"
    />

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'champion' }" @tap="onTab('champion')">英雄强度</view>
      <view class="tab" :class="{ on: tab === 'augment' }" @tap="onTab('augment')">海克斯强度</view>
    </view>

    <view class="note">{{ note }}</view>

    <block v-if="tab === 'champion'">
      <view v-if="champions.length === 0" class="empty">没有找到这个英雄</view>
      <view
        v-for="item in champions"
        :key="item.key"
        class="item"
        @tap="openChampion(item.key)"
      >
        <view class="rank">{{ item.rank }}</view>
        <view class="main">
          <view class="name">{{ item.name }}</view>
          <view class="title">{{ item.title }}</view>
        </view>
        <view class="tier" :class="'t' + item.tier">{{ item.tierLabel }}</view>
      </view>
    </block>

    <block v-else>
      <view v-if="augments.length === 0" class="empty">没有找到这个海克斯</view>
      <view v-for="item in augments" :key="item.id" class="item">
        <view class="rank">{{ item.rank }}</view>
        <view class="main">
          <view class="name">{{ item.name }} <text class="pill">{{ item.rarityLabel }}</text></view>
          <view class="title">{{ item.desc }}</view>
        </view>
        <view class="stats">
          <view>{{ item.performance }}</view>
          <view class="tiny">表现</view>
          <view class="tiny">选用 {{ item.popular }}%</view>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref } from "vue"
import catalog from "../../../data/catalog.js"
import { rarityLabel, tierLabel } from "../../common/meta.js"

const keyword = ref("")
const tab = ref("champion")
const patch = catalog.patch
const note = catalog.note
const champions = ref([])
const augments = ref([])

const allChampions = catalog.champions.map((item) => ({
  key: item.key,
  name: item.name,
  title: item.title,
  tier: item.tier,
  tierLabel: tierLabel(item.tier),
  rank: item.rank,
  search: (item.name + item.title + item.key).toLowerCase()
}))

const allAugments = catalog.augments.map((item, index) => ({
  id: item.id,
  name: item.name,
  rarityLabel: rarityLabel(item.rarity),
  performance: item.performance,
  popular: item.popular,
  desc: item.desc,
  rank: index + 1,
  search: item.name.toLowerCase()
}))

function applyFilter(text) {
  champions.value = allChampions.filter((item) => !text || item.search.indexOf(text) >= 0).slice(0, 80)
  augments.value = allAugments.filter((item) => !text || item.search.indexOf(text) >= 0).slice(0, 40)
}

function onInput(event) {
  keyword.value = event.detail.value || ""
  applyFilter(keyword.value.trim().toLowerCase())
}

function onTab(next) {
  tab.value = next
  applyFilter(keyword.value.trim().toLowerCase())
}

function openChampion(key) {
  uni.navigateTo({
    url: "/pages/champion/champion?key=" + key
  })
}

applyFilter("")
</script>

<style>
.page {
  padding: 28rpx 28rpx 48rpx;
}

.hero .title {
  font-size: 40rpx;
  font-weight: 700;
}

.hero .sub {
  margin-top: 8rpx;
  color: #c8a15a;
  font-size: 24rpx;
}

.search {
  margin-top: 28rpx;
  background: #1c2030;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  color: #f4f1e8;
}

.tabs {
  display: flex;
  gap: 16rpx;
  margin: 24rpx 0 12rpx;
}

.tab {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #1c2030;
  color: #9aa3b5;
}

.tab.on {
  background: #c8a15a;
  color: #1a1408;
  font-weight: 700;
}

.note {
  color: #9aa3b5;
  font-size: 22rpx;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #1c2030;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
}

.rank {
  width: 56rpx;
  text-align: center;
  color: #c8a15a;
  font-weight: 700;
}

.main {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 30rpx;
  font-weight: 600;
}

.title,
.tiny {
  color: #9aa3b5;
  font-size: 22rpx;
  margin-top: 4rpx;
}

.tier {
  min-width: 72rpx;
  text-align: center;
  border-radius: 10rpx;
  padding: 8rpx 0;
  font-weight: 700;
  background: #2a3144;
}

.tier.t0,
.tier.t1 {
  background: #3a2a12;
  color: #f0c36a;
}

.tier.t2 {
  background: #243044;
  color: #9ec5ff;
}

.pill {
  margin-left: 8rpx;
  font-size: 20rpx;
  color: #c8a15a;
  font-weight: 500;
}

.stats {
  text-align: right;
  font-weight: 700;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 80rpx 0;
}
</style>
