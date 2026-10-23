<script>
export default {
  onLaunch() {}
}
</script>

<style>
page {
  background: #12141c;
  color: #f4f1e8;
  font-size: 26rpx;
}

.off {
  display: none !important;
}

.empty {
  text-align: center;
  color: #9aa3b5;
  padding: 64rpx 0;
}

.arrow {
  color: #9aa3b5;
  font-size: 36rpx;
}

.badge {
  min-width: 52rpx;
  padding: 6rpx 10rpx;
  border-radius: 10rpx;
  background: #3a4258;
  color: #f4f1e8;
  font-size: 22rpx;
  font-weight: 700;
  text-align: center;
  flex-shrink: 0;
}

.badge.sm {
  min-width: 44rpx;
  padding: 2rpx 8rpx;
  font-size: 20rpx;
  border-radius: 8rpx;
}

.mini {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  padding: 0 6rpx;
  border-radius: 6rpx;
  background: #3a4258;
  color: #f4f1e8;
  font-size: 16rpx;
  font-weight: 700;
  line-height: 24rpx;
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

/* 海克斯稀有度色边：r1 白银、r4 黄金、r8 棱彩 */
.hex-frame {
  box-sizing: border-box;
  border: 2rpx solid #3a4258;
}

.hex-frame.r1 {
  border-color: #a7b3c6;
}

.hex-frame.r4 {
  border-color: #e0b15a;
}

.hex-frame.r8 {
  border-color: #c77dff;
}

.seg {
  display: flex;
  gap: 10rpx;
  margin-top: 16rpx;
  padding: 8rpx;
  background: #1c2030;
  border-radius: 14rpx;
}

.seg-item {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 10rpx;
  color: #9aa3b5;
  font-size: 24rpx;
}

.seg-item.on {
  background: #26314a;
  color: #7cc4ff;
  font-weight: 700;
}

.box {
  margin-top: 14rpx;
  background: #1c2030;
  border-radius: 16rpx;
  padding: 18rpx 20rpx;
}

.box-title {
  font-size: 26rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.stats {
  display: flex;
}

.stat {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #f4f1e8;
}

.stat-label {
  margin-top: 4rpx;
  color: #9aa3b5;
  font-size: 20rpx;
}

.hero-grid {
  display: flex;
  flex-wrap: wrap;
}

.hero-cell {
  width: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 14rpx;
}

.hero-shot {
  position: relative;
  width: 76rpx;
  height: 76rpx;
}

.hero-face {
  display: block;
  width: 76rpx;
  height: 76rpx;
  border-radius: 14rpx;
  background: #0e1018;
}

.hero-name {
  width: 100%;
  margin-top: 6rpx;
  color: #d5dbe8;
  font-size: 20rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 10rpx;
  background: #1c2030;
  border-radius: 14rpx;
  padding: 12rpx 14rpx;
}

.list-row.inset {
  margin-top: 0;
  background: #151925;
}

.list-icon {
  display: block;
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  background: #0e1018;
  flex-shrink: 0;
}

.list-copy {
  flex: 1;
  min-width: 0;
}

.list-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #f4f1e8;
}

.list-name.special {
  color: #e9a6ff;
}

.list-copy .meta {
  margin-top: 2rpx;
  color: #9aa3b5;
  font-size: 20rpx;
}
</style>
