export const TIER_LABEL = {
  0: "OP",
  1: "T1",
  2: "T2",
  3: "T3",
  4: "T4",
  5: "T5"
}

export const RARITY_LABEL = {
  1: "白银",
  4: "黄金",
  8: "棱彩"
}

export function tierLabel(tier) {
  return TIER_LABEL[tier] || "T" + tier
}

export function rarityLabel(rarity) {
  return RARITY_LABEL[rarity] || "其他"
}
