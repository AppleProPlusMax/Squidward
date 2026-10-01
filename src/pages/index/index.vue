<template>
  <view class="page">
    <view class="hero">
      <view class="title">英雄图鉴</view>
      <view class="sub">{{ total }} 位英雄 · 按胜率排序 · {{ patch }}</view>
      <text class="keep-meta">{{ tierAnchor }}</text>
    </view>

    <view class="search-bar">
      <text class="search-icon">⌕</text>
      <input
        class="search"
        placeholder="支持拼音和昵称，试试 剑圣、js、vn、轮子妈"
        :value="keyword"
        confirm-type="search"
        @input="onInput"
      />
    </view>

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'champion' }" @tap="onTab('champion')">英雄</view>
      <view class="tab" :class="{ on: tab === 'augment' }" @tap="onTab('augment')">海克斯</view>
    </view>

    <scroll-view class="roles" :class="{ off: tab !== 'champion' }" scroll-x>
      <view class="role" :class="{ on: role === 'all' }" @tap="onChip('all')">全部</view>
      <view class="role" :class="{ on: role === 'Fighter' }" @tap="onChip('Fighter')">战士</view>
      <view class="role" :class="{ on: role === 'Mage' }" @tap="onChip('Mage')">法师</view>
      <view class="role" :class="{ on: role === 'Tank' }" @tap="onChip('Tank')">坦克</view>
      <view class="role" :class="{ on: role === 'Assassin' }" @tap="onChip('Assassin')">刺客</view>
      <view class="role" :class="{ on: role === 'Marksman' }" @tap="onChip('Marksman')">射手</view>
      <view class="role" :class="{ on: role === 'Support' }" @tap="onChip('Support')">软辅</view>
    </scroll-view>
    <scroll-view class="roles" :class="{ off: tab !== 'augment' }" scroll-x>
      <view class="role" :class="{ on: rarity === 'all' }" @tap="onChip('all')">全部</view>
      <view class="role" :class="{ on: rarity === '1' }" @tap="onChip('1')">白银</view>
      <view class="role" :class="{ on: rarity === '4' }" @tap="onChip('4')">黄金</view>
      <view class="role" :class="{ on: rarity === '8' }" @tap="onChip('8')">棱彩</view>
    </scroll-view>

    <view class="note">{{ note }}</view>

    <view class="panel" :class="{ off: tab !== 'champion' }">
      <view v-if="champions.length === 0" class="empty">没有找到这个英雄</view>
      <view v-else class="grid">
        <view v-for="item in champions" :key="item.key" class="card" @tap="openChampion(item.key)">
          <view class="shot">
            <text class="no">{{ item.rank }}</text>
            <image class="face" :src="item.icon" mode="aspectFill" />
            <text class="badge" :class="item.grade">{{ item.grade }}</text>
          </view>
          <view class="epithet">{{ item.title }}</view>
          <view class="win">{{ item.winRate }}%</view>
        </view>
      </view>
    </view>

    <view class="panel" :class="{ off: tab !== 'augment' }">
      <view v-if="augments.length === 0" class="empty">没有找到这个海克斯</view>
      <view v-else>
        <view v-for="item in augments" :key="item.id" class="hex-row">
          <view class="rank">{{ item.rank }}</view>
          <image class="hex-icon" :src="item.icon" mode="aspectFill" />
          <view class="main">
            <view class="name">{{ item.name }}</view>
            <view class="title">胜率 {{ item.winRate }}%</view>
          </view>
          <view class="badge sm" :class="item.grade">{{ item.grade }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue"
import gallery from "../../../data/gallery.js"
import championSearch from "../../common/champion-index.js"
import { tierLabel } from "../../common/meta.js"

const tierAnchor = tierLabel(1)

const keyword = ref("")
const tab = ref("champion")
const role = ref("all")
const rarity = ref("all")
const patch = gallery.patch
const total = gallery.champions.length
const note = gallery.note
const champions = ref([])
const augments = ref([])

const allChampions = gallery.champions.map((item) => ({
  key: item.key,
  name: item.name,
  title: item.title,
  tags: item.tags || [],
  winRate: item.winRate,
  grade: item.grade,
  rank: item.rank,
  icon: item.icon,
  search: (championSearch[item.key] || (item.name + item.title + item.key).toLowerCase()).split("|")
}))

const allAugments = gallery.augments.map((item) => ({
  id: item.id,
  name: item.name,
  winRate: item.winRate,
  grade: item.grade,
  icon: item.icon,
  rank: item.rank,
  rarity: String(item.rarity || ""),
  search: item.name.toLowerCase()
}))

function normalize(text) {
  return (text || "").trim().toLowerCase().replace(/[\s·.]+/g, "")
}

function matchScore(item, query) {
  if (!query) return 1
  if (/^[a-z0-9]+$/.test(query)) {
    if (item.search.some((token) => token === query)) return 0
    if (item.search.some((token) => token.startsWith(query))) return 1
    return 2
  }
  if (item.search.some((token) => token === query)) return 0
  if (item.search.some((token) => token.indexOf(query) >= 0)) return 1
  return 2
}

function applyFilter(text) {
  const query = normalize(text)
  champions.value = allChampions
    .filter((item) => role.value === "all" || item.tags.indexOf(role.value) >= 0)
    .filter((item) => matchScore(item, query) < 2)
    .sort((a, b) => matchScore(a, query) - matchScore(b, query) || a.rank - b.rank)
  augments.value = allAugments
    .filter((item) => rarity.value === "all" || item.rarity === rarity.value)
    .filter((item) => !query || item.search.indexOf(query) >= 0)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

function onInput(event) {
  keyword.value = event.detail.value || ""
  applyFilter(keyword.value)
}

function onTab(next) {
  tab.value = next
  applyFilter(keyword.value)
}

function onChip(next) {
  if (tab.value === "champion") role.value = next
  else rarity.value = next
  applyFilter(keyword.value)
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

.keep-meta {
  display: none;
}

.search-bar {
  margin-top: 28rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #1c2030;
  border-radius: 999rpx;
  padding: 0 24rpx;
}

.search-icon {
  color: #9aa3b5;
  font-size: 32rpx;
  flex-shrink: 0;
}

.search {
  flex: 1;
  background: transparent;
  padding: 20rpx 0;
  color: #f4f1e8;
}

.tabs,
.roles {
  margin-top: 20rpx;
  white-space: nowrap;
}

.roles.off,
.panel.off {
  display: none;
}

.tabs {
  display: flex;
  gap: 16rpx;
}

.tab,
.role {
  display: inline-block;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #1c2030;
  color: #9aa3b5;
  margin-right: 12rpx;
}

.tab.on,
.role.on {
  background: #c8a15a;
  color: #1a1408;
  font-weight: 700;
}

.note {
  color: #9aa3b5;
  font-size: 22rpx;
  line-height: 1.5;
  margin: 16rpx 0;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx 12rpx;
}

.card {
  width: 124rpx;
}

.shot {
  position: relative;
  width: 124rpx;
  height: 124rpx;
}

.face {
  width: 124rpx;
  height: 124rpx;
  border-radius: 18rpx;
  background: #1c2030;
}

.no {
  position: absolute;
  left: 6rpx;
  top: 6rpx;
  z-index: 1;
  min-width: 28rpx;
  padding: 0 6rpx;
  border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.55);
  color: #f4f1e8;
  font-size: 20rpx;
  text-align: center;
}

.badge {
  position: absolute;
  right: 4rpx;
  bottom: 4rpx;
  z-index: 1;
  min-width: 36rpx;
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
  background: #3a4258;
  color: #f4f1e8;
  font-size: 20rpx;
  font-weight: 700;
  text-align: center;
}

.badge.sm {
  position: static;
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

.epithet,
.win {
  margin-top: 6rpx;
  text-align: center;
  font-size: 22rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.win {
  color: #9aa3b5;
  margin-top: 0;
}

.hex-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #1c2030;
  border-radius: 16rpx;
  padding: 16rpx 18rpx;
  margin-bottom: 12rpx;
}

.rank {
  width: 48rpx;
  text-align: center;
  color: #c8a15a;
  font-weight: 700;
}

.hex-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: #0e1018;
}

.main {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 30rpx;
  font-weight: 600;
}

.title {
  color: #9aa3b5;
  font-size: 22rpx;
  margin-top: 4rpx;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 80rpx 0;
}
</style>
