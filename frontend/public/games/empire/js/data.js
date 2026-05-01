// Game data definitions for the vertical integration simulation

export const CROP_DATA = {
  wheat:   { name: '小麦',   icon: '🌾', seedCost: 5,   growTime: 30,  rawSell: 8,   unlockLevel: 1  },
  carrot:  { name: '胡萝卜', icon: '🥕', seedCost: 12,  growTime: 45,  rawSell: 18,  unlockLevel: 2  },
  cabbage: { name: '卷心菜', icon: '🥬', seedCost: 25,  growTime: 60,  rawSell: 35,  unlockLevel: 3  },
  beet:    { name: '甜菜',   icon: '🫐', seedCost: 50,  growTime: 90,  rawSell: 70,  unlockLevel: 5  },
  apple:   { name: '苹果',   icon: '🍎', seedCost: 120, growTime: 180, rawSell: 160, unlockLevel: 8  },
  orange:  { name: '柑橘',   icon: '🍊', seedCost: 250, growTime: 240, rawSell: 320, unlockLevel: 12 },
  tomato:  { name: '番茄',   icon: '🍅', seedCost: 80,  growTime: 75,  rawSell: 110, unlockLevel: 6  },
  corn:    { name: '玉米',   icon: '🌽', seedCost: 35,  growTime: 55,  rawSell: 50,  unlockLevel: 4  },
};

export const RECIPE_DATA = {
  flour:        { name: '面粉',     icon: '🍞', inputs: { wheat: 2 },                     processTime: 15, factorySell: 25,  shopSell: 40,  unlockLevel: 1  },
  carrot_juice: { name: '胡萝卜汁', icon: '🧃', inputs: { carrot: 3 },                    processTime: 20, factorySell: 65,  shopSell: 100, unlockLevel: 2  },
  sauerkraut:   { name: '酸菜',     icon: '🥗', inputs: { cabbage: 2 },                   processTime: 25, factorySell: 85,  shopSell: 140, unlockLevel: 3  },
  cornmeal:     { name: '玉米粉',   icon: '🫓', inputs: { corn: 3 },                      processTime: 20, factorySell: 80,  shopSell: 130, unlockLevel: 4  },
  sugar:        { name: '糖',       icon: '🍬', inputs: { beet: 3 },                      processTime: 30, factorySell: 230, shopSell: 350, unlockLevel: 5  },
  tomato_sauce: { name: '番茄酱',   icon: '🫙', inputs: { tomato: 3 },                    processTime: 25, factorySell: 200, shopSell: 310, unlockLevel: 6  },
  apple_juice:  { name: '苹果汁',   icon: '🧃', inputs: { apple: 2 },                     processTime: 30, factorySell: 350, shopSell: 550, unlockLevel: 8  },
  orange_juice: { name: '橙汁',     icon: '🍹', inputs: { orange: 3, sugar: 1 },          processTime: 35, factorySell: 750, shopSell: 1200, unlockLevel: 12 },
  apple_pie:    { name: '苹果派',   icon: '🥧', inputs: { flour: 1, apple: 2, sugar: 1 }, processTime: 45, factorySell: 520, shopSell: 800,  unlockLevel: 10 },
  bread:        { name: '面包',     icon: '🍞', inputs: { flour: 2, sugar: 1 },            processTime: 35, factorySell: 300, shopSell: 480,  unlockLevel: 7  },
  pizza:        { name: '披萨',     icon: '🍕', inputs: { flour: 1, tomato_sauce: 1, cornmeal: 1 }, processTime: 50, factorySell: 800, shopSell: 1300, unlockLevel: 14 },
  fruit_salad:  { name: '水果沙拉', icon: '🥙', inputs: { apple: 1, orange: 1, carrot: 1 }, processTime: 20, factorySell: 400, shopSell: 650, unlockLevel: 9  },
};

// What products can be sold at the shop (derived from recipes)
export const getShopGoods = () => Object.keys(RECIPE_DATA);

export const BUILD_COSTS = {
  factory:   1000,
  shop:      3000,
  logistics: 2000,
};

export const UPGRADE_DATA = {
  // Farm upgrades
  farm_plot:     { name: '农田地块',   icon: '🌱', baseCost: 100,   multiplier: 1.5, maxLevel: 20, category: 'farm'     },
  irrigation:    { name: '灌溉系统',   icon: '💧', baseCost: 500,   multiplier: 2.0, maxLevel: 5,  category: 'farm'     },
  fertilizer:    { name: '高效肥料',   icon: '🧪', baseCost: 800,   multiplier: 2.0, maxLevel: 5,  category: 'farm'     },
  greenhouse:    { name: '温室大棚',   icon: '🏡', baseCost: 5000,  multiplier: 2.5, maxLevel: 3,  category: 'farm'     },
  tractor:       { name: '拖拉机',     icon: '🚜', baseCost: 2000,  multiplier: 2.0, maxLevel: 3,  category: 'farm'     },

  // Factory upgrades
  factory_machine: { name: '加工机器', icon: '⚙️', baseCost: 300,  multiplier: 1.5, maxLevel: 10, category: 'factory'  },
  speed_boost:     { name: '速度提升', icon: '⚡', baseCost: 1000, multiplier: 2.0, maxLevel: 5,  category: 'factory'  },
  automation:      { name: '自动化',   icon: '🤖', baseCost: 3000, multiplier: 2.5, maxLevel: 3,  category: 'factory'  },

  // Shop upgrades
  shop_shelf:    { name: '货架',       icon: '🗄️', baseCost: 200,  multiplier: 1.4, maxLevel: 15, category: 'shop'     },
  advertising:   { name: '广告投放',   icon: '📺', baseCost: 800,  multiplier: 2.0, maxLevel: 5,  category: 'shop'     },
  decor:         { name: '店铺装修',   icon: '🎨', baseCost: 1200, multiplier: 2.0, maxLevel: 5,  category: 'shop'     },

  // Logistics upgrades
  truck:         { name: '运输卡车',   icon: '🚛', baseCost: 400,  multiplier: 1.5, maxLevel: 8,  category: 'logistics'},
  truck_speed:   { name: '卡车速度',   icon: '🏎️', baseCost: 600,  multiplier: 2.0, maxLevel: 5,  category: 'logistics'},
};

export const LEVEL_XP = [];
for (let i = 0; i <= 50; i++) {
  LEVEL_XP[i] = Math.floor(100 * Math.pow(1.8, i));
}

export const BUFF_DATA = {
  growth_boost:  { name: '生长加速',   icon: '🌿', duration: 120, effect: 'growth_speed',  value: 0.3,  description: '作物生长速度+30%',    cost: 200   },
  production_boost: { name: '生产加速', icon: '⚡', duration: 120, effect: 'production_speed', value: 0.3, description: '工厂加工速度+30%',   cost: 300   },
  customer_frenzy: { name: '顾客热潮', icon: '👥', duration: 90,  effect: 'customer_rate',   value: 0.5,  description: '顾客进店率+50%',     cost: 250   },
  price_surge:   { name: '价格飙升',   icon: '💰', duration: 60,  effect: 'price_multiplier', value: 0.5, description: '商品售价+50%',       cost: 400   },
  discount_fuel: { name: '燃油折扣',   icon: '⛽', duration: 120, effect: 'logistics_cost',   value: -0.3, description: '物流成本-30%',       cost: 150   },
};

export const PRESTIGE_THRESHOLD = 100000;

export const getUpgradeCost = (upgradeKey, currentLevel) => {
  const data = UPGRADE_DATA[upgradeKey];
  if (!data) return Infinity;
  return Math.floor(data.baseCost * Math.pow(data.multiplier, currentLevel));
};

export const getGrowthSpeedMultiplier = (state) => {
  let mult = 1;
  // Irrigation: each level reduces grow time by 10%
  mult *= (1 - 0.10 * (state.upgrades.irrigation || 0));
  // Fertilizer: each level reduces grow time by 8%
  mult *= (1 - 0.08 * (state.upgrades.fertilizer || 0));
  // Tractor: each level reduces grow time by 15%
  mult *= (1 - 0.15 * (state.upgrades.tractor || 0));
  // Greenhouse: each level reduces grow time by 10%
  mult *= (1 - 0.10 * (state.upgrades.greenhouse || 0));
  // Buff
  const growthBuff = state.activeBuffs.find(b => b.effect === 'growth_speed');
  if (growthBuff) mult *= (1 - growthBuff.value);
  // Prestige
  mult *= (1 - 0.05 * state.prestigePoints);
  return Math.max(0.1, mult);
};

export const getProductionSpeedMultiplier = (state) => {
  let mult = 1;
  mult *= (1 - 0.10 * (state.upgrades.speed_boost || 0));
  mult *= (1 - 0.15 * (state.upgrades.automation || 0));
  const buff = state.activeBuffs.find(b => b.effect === 'production_speed');
  if (buff) mult *= (1 - buff.value);
  mult *= (1 - 0.03 * state.prestigePoints);
  return Math.max(0.1, mult);
};

export const getCustomerRateMultiplier = (state) => {
  let mult = 1;
  mult *= (1 + 0.15 * (state.upgrades.advertising || 0));
  mult *= (1 + 0.10 * (state.upgrades.decor || 0));
  const buff = state.activeBuffs.find(b => b.effect === 'customer_rate');
  if (buff) mult *= (1 + buff.value);
  return mult;
};

export const getPriceMultiplier = (state) => {
  let mult = 1;
  mult *= (1 + 0.05 * (state.upgrades.decor || 0));
  const buff = state.activeBuffs.find(b => b.effect === 'price_multiplier');
  if (buff) mult *= (1 + buff.value);
  mult *= (1 + 0.02 * state.prestigePoints);
  return mult;
};

export const getLogisticsCostMultiplier = (state) => {
  let mult = 1;
  const buff = state.activeBuffs.find(b => b.effect === 'logistics_cost');
  if (buff) mult *= (1 + buff.value); // value is negative
  return mult;
};
