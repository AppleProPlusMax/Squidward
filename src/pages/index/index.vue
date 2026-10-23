<template>
  <view class="page">
    <view class="hero">
      <view class="hero-main">
        <view class="title">英雄图鉴</view>
        <view class="sub">{{ total }} 位英雄 · 按胜率排序 · {{ patch }}</view>
        <text class="keep-meta">{{ tierAnchor }}</text>
      </view>
      <view class="rating-entry" @tap="openRating">
        <text class="rating-entry-icon">⚡</text>
        <text class="rating-entry-text">隐藏分查询</text>
      </view>
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
      <view v-if="keyword" class="search-clear" @tap="clearKeyword">✕</view>
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
            <image class="face" :src="item.icon" mode="aspectFill" lazy-load />
            <text class="badge corner" :class="item.grade">{{ item.grade }}</text>
          </view>
          <view class="epithet">{{ item.title }}</view>
          <view class="win">{{ item.winRate }}%</view>
        </view>
      </view>
    </view>

    <view v-if="augmentLoaded" class="panel" :class="{ off: tab !== 'augment' }">
      <view v-if="augments.length === 0" class="empty">没有找到这个海克斯</view>
      <view v-else>
        <view v-for="item in augments" :key="item.id" class="hex-row" @tap="openAugment(item.id)">
          <view class="rank">{{ item.rank }}</view>
          <image class="hex-icon hex-frame" :class="'r' + item.rarity" :src="item.icon" mode="aspectFill" lazy-load />
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
import gallery from "../../common/gallery.js"
import championSearch from "../../common/champion-index.js"
import { tierLabel } from "../../common/meta.js"

const tierAnchor = tierLabel(1)

const keyword = ref("")
const tab = ref("champion")
const augmentLoaded = ref(false)
const role = ref("all")
const rarity = ref("all")
const patch = gallery.patch
const total = gallery.champions.length
const note = gallery.note
const champions = ref([])
const augments = ref([])
let searchTimer = null

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
  if (tab.value === "champion") {
    champions.value = allChampions
      .filter((item) => role.value === "all" || item.tags.indexOf(role.value) >= 0)
      .filter((item) => matchScore(item, query) < 2)
      .sort((a, b) => matchScore(a, query) - matchScore(b, query) || a.rank - b.rank)
  } else {
    augments.value = allAugments
      .filter((item) => rarity.value === "all" || item.rarity === rarity.value)
      .filter((item) => !query || item.search.indexOf(query) >= 0)
      .map((item, index) => ({ ...item, rank: index + 1 }))
  }
}

function onInput(event) {
  keyword.value = event.detail.value || ""
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    applyFilter(keyword.value)
  }, 60)
}

function clearKeyword() {
  if (searchTimer) clearTimeout(searchTimer)
  keyword.value = ""
  applyFilter("")
}

function onTab(next) {
  tab.value = next
  if (next === "augment" && !augmentLoaded.value) {
    augmentLoaded.value = true
  }
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

function openAugment(id) {
  uni.navigateTo({
    url: "/pages/augment/augment?id=" + id
  })
}

function openRating() {
  uni.navigateTo({
    url: "/pages/rating/rating"
  })
}

applyFilter("")
</script>

<style>
.page {
  padding: 20rpx 24rpx 40rpx;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.hero-main {
  flex: 1;
  min-width: 0;
}

.hero .title {
  font-size: 36rpx;
  font-weight: 700;
}

.hero .sub {
  margin-top: 6rpx;
  color: #c8a15a;
  font-size: 22rpx;
}

.rating-entry {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, rgba(200, 161, 90, 0.26), rgba(200, 161, 90, 0.08));
  border: 2rpx solid rgba(200, 161, 90, 0.55);
  color: #f4d58d;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.rating-entry:active {
  transform: scale(0.96);
  opacity: 0.85;
}

.rating-entry-icon {
  font-size: 24rpx;
}

.keep-meta {
  display: none;
}

.search-bar {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #1c2030;
  border-radius: 999rpx;
  padding: 0 22rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.04);
}

.search-icon {
  color: #9aa3b5;
  font-size: 28rpx;
  flex-shrink: 0;
}

.search {
  flex: 1;
  background: transparent;
  padding: 14rpx 0;
  color: #f4f1e8;
  font-size: 24rpx;
}

.search-clear {
  color: #9aa3b5;
  padding: 8rpx;
  font-size: 22rpx;
  flex-shrink: 0;
}

.tabs,
.roles {
  margin-top: 14rpx;
  white-space: nowrap;
}

.tabs {
  display: flex;
  gap: 12rpx;
}

.tab,
.role {
  display: inline-block;
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  background: #1c2030;
  color: #9aa3b5;
  margin-right: 10rpx;
  font-size: 24rpx;
}

.tab.on,
.role.on {
  background: #c8a15a;
  color: #1a1408;
  font-weight: 700;
}

.note {
  color: #9aa3b5;
  font-size: 20rpx;
  line-height: 1.45;
  margin: 12rpx 0 14rpx;
}

.grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14rpx 10rpx;
}

.card {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.card:active,
.hex-row:active {
  transform: scale(0.96);
  opacity: 0.85;
}

.shot {
  position: relative;
  width: 102rpx;
  height: 102rpx;
}

.face {
  width: 100%;
  height: 100%;
  border-radius: 14rpx;
  background: #1c2030;
  display: block;
}

.no {
  position: absolute;
  left: 4rpx;
  top: 4rpx;
  z-index: 1;
  min-width: 24rpx;
  padding: 0 5rpx;
  border-radius: 6rpx;
  background: rgba(0, 0, 0, 0.65);
  color: #f4f1e8;
  font-size: 18rpx;
  line-height: 24rpx;
  text-align: center;
}

.badge.corner {
  position: absolute;
  right: 4rpx;
  bottom: 4rpx;
  z-index: 1;
  min-width: 30rpx;
  padding: 1rpx 6rpx;
  border-radius: 6rpx;
  font-size: 18rpx;
  line-height: 22rpx;
}

.epithet,
.win {
  width: 100%;
  margin-top: 6rpx;
  text-align: center;
  font-size: 20rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.win {
  color: #9aa3b5;
  margin-top: 2rpx;
  font-size: 18rpx;
}

.hex-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  background: #1c2030;
  border-radius: 14rpx;
  padding: 12rpx 14rpx;
  margin-bottom: 10rpx;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.rank {
  width: 40rpx;
  text-align: center;
  color: #c8a15a;
  font-weight: 700;
  font-size: 24rpx;
}

.hex-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: #0e1018;
  flex-shrink: 0;
}

.main {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 26rpx;
  font-weight: 600;
}

.title {
  color: #9aa3b5;
  font-size: 20rpx;
  margin-top: 2rpx;
}
</style>
