// ============================================================
// Game Data — realms, items, techniques, encounters, zones
// ============================================================

const GameData = {

  // ---- Realm tiers ----
  realms: [
    {
      id: 'lianqi_1', name: '炼气一层', nameEn: 'Qi Refining Lv.1',
      baseRate: 1, breakthroughCost: 100,
      breakthroughItem: null, breakthroughRate: 1.0,
      hp: 100, attack: 10, defense: 5
    },
    {
      id: 'lianqi_2', name: '炼气二层', nameEn: 'Qi Refining Lv.2',
      baseRate: 2, breakthroughCost: 300,
      breakthroughItem: null, breakthroughRate: 1.0,
      hp: 150, attack: 15, defense: 8
    },
    {
      id: 'lianqi_3', name: '炼气三层', nameEn: 'Qi Refining Lv.3',
      baseRate: 4, breakthroughCost: 800,
      breakthroughItem: null, breakthroughRate: 1.0,
      hp: 220, attack: 22, defense: 12
    },
    {
      id: 'lianqi_4', name: '炼气四层', nameEn: 'Qi Refining Lv.4',
      baseRate: 6, breakthroughCost: 2000,
      breakthroughItem: null, breakthroughRate: 1.0,
      hp: 300, attack: 30, defense: 16
    },
    {
      id: 'lianqi_5', name: '炼气五层', nameEn: 'Qi Refining Lv.5',
      baseRate: 10, breakthroughCost: 5000,
      breakthroughItem: 'juqi_dan', breakthroughRate: 1.0,
      hp: 400, attack: 40, defense: 22
    },
    {
      id: 'zhuji_1', name: '筑基初期', nameEn: 'Foundation Early',
      baseRate: 20, breakthroughCost: 72000,
      breakthroughItem: 'zhuji_dan', breakthroughRate: 0.8,
      hp: 800, attack: 80, defense: 40
    },
    {
      id: 'zhuji_2', name: '筑基中期', nameEn: 'Foundation Mid',
      baseRate: 40, breakthroughCost: 144000,
      breakthroughItem: 'zhuji_dan', breakthroughRate: 0.8,
      hp: 1500, attack: 140, defense: 70
    },
    {
      id: 'zhuji_3', name: '筑基后期', nameEn: 'Foundation Late',
      baseRate: 70, breakthroughCost: 288000,
      breakthroughItem: 'zhuji_dan', breakthroughRate: 0.75,
      hp: 2800, attack: 250, defense: 120
    },
    {
      id: 'jindan_1', name: '金丹初期', nameEn: 'Golden Core Early',
      baseRate: 200, breakthroughCost: 1728000,
      breakthroughItem: 'jiangchen_dan', breakthroughRate: 0.5,
      hp: 6000, attack: 500, defense: 250
    },
    {
      id: 'jindan_2', name: '金丹中期', nameEn: 'Golden Core Mid',
      baseRate: 500, breakthroughCost: 8640000,
      breakthroughItem: 'jiangchen_dan', breakthroughRate: 0.5,
      hp: 12000, attack: 900, defense: 450
    },
    {
      id: 'jindan_3', name: '金丹后期', nameEn: 'Golden Core Late',
      baseRate: 1000, breakthroughCost: 17280000,
      breakthroughItem: 'jiangchen_dan', breakthroughRate: 0.45,
      hp: 25000, attack: 1800, defense: 900
    },
    {
      id: 'yuanying_1', name: '元婴初期', nameEn: 'Nascent Soul Early',
      baseRate: 5000, breakthroughCost: 100000000,
      breakthroughItem: 'dingshen_dan', breakthroughRate: 0.3,
      hp: 60000, attack: 4000, defense: 2000
    },
    {
      id: 'yuanying_2', name: '元婴中期', nameEn: 'Nascent Soul Mid',
      baseRate: 10000, breakthroughCost: 500000000,
      breakthroughItem: 'dingshen_dan', breakthroughRate: 0.3,
      hp: 120000, attack: 7500, defense: 3800
    },
    {
      id: 'yuanying_3', name: '元婴后期', nameEn: 'Nascent Soul Late',
      baseRate: 20000, breakthroughCost: 2000000000,
      breakthroughItem: 'dingshen_dan', breakthroughRate: 0.25,
      hp: 250000, attack: 15000, defense: 7500
    },
    {
      id: 'huashen_1', name: '化神初期', nameEn: 'Deity Transform Early',
      baseRate: 50000, breakthroughCost: 43200000000,
      breakthroughItem: 'butian_dan', breakthroughRate: 0.15,
      hp: 600000, attack: 35000, defense: 18000
    },
    {
      id: 'huashen_2', name: '化神中期', nameEn: 'Deity Transform Mid',
      baseRate: 100000, breakthroughCost: 86400000000,
      breakthroughItem: 'butian_dan', breakthroughRate: 0.15,
      hp: 1200000, attack: 65000, defense: 32000
    },
    {
      id: 'huashen_3', name: '化神后期', nameEn: 'Deity Transform Late',
      baseRate: 200000, breakthroughCost: 172800000000,
      breakthroughItem: 'butian_dan', breakthroughRate: 0.12,
      hp: 2500000, attack: 130000, defense: 65000
    },
    {
      id: 'lianxu_1', name: '炼虚初期', nameEn: 'Void Refining Early',
      baseRate: 400000, breakthroughCost: 800000000000,
      breakthroughItem: 'lianxu_dan', breakthroughRate: 0.10,
      hp: 4000000, attack: 200000, defense: 100000
    },
    {
      id: 'lianxu_2', name: '炼虚中期', nameEn: 'Void Refining Mid',
      baseRate: 800000, breakthroughCost: 2000000000000,
      breakthroughItem: 'lianxu_dan', breakthroughRate: 0.10,
      hp: 6000000, attack: 320000, defense: 160000
    },
    {
      id: 'lianxu_3', name: '炼虚后期', nameEn: 'Void Refining Late',
      baseRate: 1500000, breakthroughCost: 5000000000000,
      breakthroughItem: 'lianxu_dan', breakthroughRate: 0.08,
      hp: 9000000, attack: 500000, defense: 250000
    },
    {
      id: 'heti_1', name: '合体初期', nameEn: 'Body Integration Early',
      baseRate: 3000000, breakthroughCost: 12000000000000,
      breakthroughItem: 'heti_dan', breakthroughRate: 0.07,
      hp: 15000000, attack: 800000, defense: 400000
    },
    {
      id: 'heti_2', name: '合体中期', nameEn: 'Body Integration Mid',
      baseRate: 5000000, breakthroughCost: 30000000000000,
      breakthroughItem: 'heti_dan', breakthroughRate: 0.07,
      hp: 25000000, attack: 1300000, defense: 650000
    },
    {
      id: 'heti_3', name: '合体后期', nameEn: 'Body Integration Late',
      baseRate: 9000000, breakthroughCost: 80000000000000,
      breakthroughItem: 'heti_dan', breakthroughRate: 0.06,
      hp: 40000000, attack: 2000000, defense: 1000000
    },
    {
      id: 'dacheng_1', name: '大乘初期', nameEn: 'Mahayana Early',
      baseRate: 15000000, breakthroughCost: 200000000000000,
      breakthroughItem: 'feisheng_dan', breakthroughRate: 0.06,
      hp: 60000000, attack: 3000000, defense: 1500000
    },
    {
      id: 'dacheng_2', name: '大乘中期', nameEn: 'Mahayana Mid',
      baseRate: 25000000, breakthroughCost: 600000000000000,
      breakthroughItem: 'feisheng_dan', breakthroughRate: 0.05,
      hp: 100000000, attack: 5000000, defense: 2500000
    },
    {
      id: 'dacheng_3', name: '大乘后期', nameEn: 'Mahayana Late',
      baseRate: 50000000, breakthroughCost: 2000000000000000,
      breakthroughItem: 'feisheng_dan', breakthroughRate: 0.05,
      hp: 180000000, attack: 9000000, defense: 4500000
    },
    {
      id: 'dujie_1', name: '渡劫初期', nameEn: 'Tribulation Early',
      baseRate: 100000000, breakthroughCost: 6000000000000000,
      breakthroughItem: 'dujie_dan', breakthroughRate: 0.04,
      hp: 350000000, attack: 18000000, defense: 9000000
    },
    {
      id: 'dujie_2', name: '渡劫中期', nameEn: 'Tribulation Mid',
      baseRate: 200000000, breakthroughCost: 20000000000000000,
      breakthroughItem: 'dujie_dan', breakthroughRate: 0.04,
      hp: 700000000, attack: 35000000, defense: 17000000
    },
    {
      id: 'dujie_3', name: '渡劫后期', nameEn: 'Tribulation Late',
      baseRate: 400000000, breakthroughCost: 60000000000000000,
      breakthroughItem: 'dujie_dan', breakthroughRate: 0.03,
      hp: 1500000000, attack: 70000000, defense: 35000000
    },
    {
      id: 'zhenxian', name: '真仙', nameEn: 'True Immortal',
      baseRate: 0, breakthroughCost: Infinity,
      breakthroughItem: null, breakthroughRate: 0,
      hp: Infinity, attack: Infinity, defense: Infinity
    }
  ],

  // ---- Items ----
  items: {
    // Pills
    juqi_dan:       { name: '聚气丹', nameEn: 'Qi Gathering Pill', type: 'pill', rarity: 'common', desc: '突破炼气必备' },
    zhuji_dan:      { name: '筑基丹', nameEn: 'Foundation Pill', type: 'pill', rarity: 'uncommon', desc: '突破筑基必备' },
    jiangchen_dan:  { name: '降尘丹', nameEn: 'Dustfall Pill', type: 'pill', rarity: 'rare', desc: '突破金丹必备' },
    dingshen_dan:   { name: '定神丹', nameEn: 'Mindset Pill', type: 'pill', rarity: 'epic', desc: '突破元婴必备' },
    butian_dan:     { name: '补天丹', nameEn: 'Heaven Mending Pill', type: 'pill', rarity: 'legendary', desc: '突破化神必备' },
    feisheng_dan:   { name: '飞升丹', nameEn: 'Ascension Pill', type: 'pill', rarity: 'mythic', desc: '突破大乘必备' },
    lianxu_dan:     { name: '炼虚丹', nameEn: 'Void Refining Pill', type: 'pill', rarity: 'legendary', desc: '突破炼虚必备' },
    heti_dan:       { name: '合体丹', nameEn: 'Body Integration Pill', type: 'pill', rarity: 'mythic', desc: '突破合体必备' },
    dujie_dan:      { name: '渡劫丹', nameEn: 'Tribulation Pill', type: 'pill', rarity: 'mythic', desc: '渡劫飞升真仙必备' },
    xiulian_dan:    { name: '修练丹', nameEn: 'Cultivation Pill', type: 'consumable', rarity: 'common', desc: '服用后获得大量修为', effect: { type: 'cultivation', value: 500 } },
    julingshi_dan:  { name: '聚灵丹', nameEn: 'Spirit Pill', type: 'consumable', rarity: 'uncommon', desc: '提升修炼速度30%，持续1小时', effect: { type: 'cultivation_mult', value: 1.3, duration: 3600 } },
    huixue_dan:     { name: '回血丹', nameEn: 'Healing Pill', type: 'consumable', rarity: 'common', desc: '战斗中恢复30%生命', effect: { type: 'heal_percent', value: 0.3 } },
    huti_dan:       { name: '护体丹', nameEn: 'Body Shield Pill', type: 'consumable', rarity: 'uncommon', desc: '防御提升50%，持续1场战斗', effect: { type: 'defense_mult', value: 1.5, duration: 'battle' } },

    // Materials
    lingshi:        { name: '灵石', nameEn: 'Spirit Stone', type: 'currency', rarity: 'common', desc: '通用货币' },
    lingcao:        { name: '灵草', nameEn: 'Spirit Herb', type: 'material', rarity: 'common', desc: '炼丹基础材料' },
    tiannian_lingyao: { name: '千年灵药', nameEn: 'Millennium Herb', type: 'material', rarity: 'rare', desc: '炼制中级丹药' },
    kuangmai:      { name: '矿脉精华', nameEn: 'Vein Essence', type: 'material', rarity: 'uncommon', desc: '炼器材料' },
    longwen_heijin: { name: '龙纹黑金', nameEn: 'Dragon Black Gold', type: 'material', rarity: 'legendary', desc: '打造本命法宝' },
    hundun_yuanshi: { name: '混沌原石', nameEn: 'Chaos Stone', type: 'material', rarity: 'mythic', desc: '提升法宝品质上限' },

    // Spirit herbs (草药)
    qixin_cao:      { name: '七心草', nameEn: 'Sevenheart Herb', type: 'herb', rarity: 'common', desc: '低阶丹药主药' },
    huoyan_zhi:     { name: '火炎芝', nameEn: 'Fire Lingzhi', type: 'herb', rarity: 'uncommon', desc: '炼火属丹药材料' },
    bingxin_lian:   { name: '冰心莲', nameEn: 'Ice Heart Lotus', type: 'herb', rarity: 'rare', desc: '安神炼神之药' },
    zihua_guo:      { name: '紫华果', nameEn: 'Purple Flower Fruit', type: 'herb', rarity: 'rare', desc: '化神丹必需' },
    wanlian_shen:   { name: '万年灵参', nameEn: 'Myriad Year Ginseng', type: 'herb', rarity: 'epic', desc: '高阶丹药主药' },
    longxue_hua:    { name: '龙血花', nameEn: 'Dragon Blood Flower', type: 'herb', rarity: 'legendary', desc: '渡劫丹必需' },

    // Forge materials (炼器)
    xuantie:        { name: '玄铁', nameEn: 'Mystic Iron', type: 'material', rarity: 'common', desc: '炼器基础材料' },
    bingjing:       { name: '寒冰精', nameEn: 'Ice Essence', type: 'material', rarity: 'uncommon', desc: '冰系法宝材料' },
    huoxin_jin:     { name: '火心金', nameEn: 'Fireheart Gold', type: 'material', rarity: 'rare', desc: '火系法宝材料' },
    leiyin_shi:     { name: '雷音石', nameEn: 'Thunder Echo Stone', type: 'material', rarity: 'epic', desc: '雷系法宝材料' },
    xianjin:        { name: '仙金', nameEn: 'Immortal Gold', type: 'material', rarity: 'mythic', desc: '真仙法宝材料' },

    // Artifacts (法宝) — equippable
    aw_qingfeng:    { name: '青锋剑', nameEn: 'Greenwind Sword', type: 'artifact', slot: 'weapon', rarity: 'common', desc: '入门飞剑', stats: { attack: 30, attack_pct: 0.05 } },
    aw_liehuo:      { name: '烈火剑', nameEn: 'Blaze Sword', type: 'artifact', slot: 'weapon', rarity: 'rare', desc: '南域名剑', stats: { attack: 200, attack_pct: 0.12 } },
    aw_zhanlong:    { name: '斩龙刃', nameEn: 'Dragonslayer Blade', type: 'artifact', slot: 'weapon', rarity: 'legendary', desc: '可斩天蛟', stats: { attack: 2500, attack_pct: 0.25 } },
    aw_zhuxian:     { name: '诛仙剑', nameEn: 'Immortal Slayer', type: 'artifact', slot: 'weapon', rarity: 'mythic', desc: '上古杀伐至宝', stats: { attack: 25000, attack_pct: 0.5 } },
    ar_xuanguang:   { name: '玄光甲', nameEn: 'Mystic Light Armor', type: 'artifact', slot: 'armor', rarity: 'uncommon', desc: '韧性极佳', stats: { defense: 80, defense_pct: 0.10 } },
    ar_jingang:     { name: '金刚甲', nameEn: 'Vajra Plate', type: 'artifact', slot: 'armor', rarity: 'rare', desc: '万法不侵', stats: { defense: 400, defense_pct: 0.18 } },
    ar_huanglong:   { name: '黄龙铠', nameEn: 'Yellow Dragon Cuirass', type: 'artifact', slot: 'armor', rarity: 'legendary', desc: '土系传世重铠', stats: { defense: 4000, defense_pct: 0.30 } },
    at_juling:      { name: '聚灵珠', nameEn: 'Spirit Gather Bead', type: 'artifact', slot: 'talisman', rarity: 'common', desc: '修炼速度+8%', stats: { cultivation_mult: 0.08 } },
    at_qixing:      { name: '七星罗盘', nameEn: 'Seven Star Compass', type: 'artifact', slot: 'talisman', rarity: 'rare', desc: '修炼速度+18%', stats: { cultivation_mult: 0.18 } },
    at_taiji:       { name: '太极图', nameEn: 'Taiji Diagram', type: 'artifact', slot: 'talisman', rarity: 'legendary', desc: '修炼速度+45%, 渡劫加成', stats: { cultivation_mult: 0.45 } },

    // Heavenly treasures (天材地宝) — items for inventory display
    ht_qi_grass:    { name: '灵气草',     nameEn: 'Qi Spirit Grass',    type: 'treasure', rarity: 'common',    desc: '突破辅助，永久增加属性' },
    ht_qi_crystal:  { name: '聚气水晶',   nameEn: 'Qi Crystal',         type: 'treasure', rarity: 'uncommon',  desc: '突破辅助，永久增加属性' },
    ht_qi_jade:     { name: '养气玉',     nameEn: 'Qi Jade',            type: 'treasure', rarity: 'uncommon',  desc: '突破辅助，永久增加属性' },
    ht_zhu_stone:   { name: '筑基石',     nameEn: 'Foundation Stone',   type: 'treasure', rarity: 'uncommon',  desc: '突破辅助，永久增加属性' },
    ht_zhu_essence: { name: '地脉精华',   nameEn: 'Earth Vein Essence', type: 'treasure', rarity: 'rare',      desc: '突破辅助，永久增加属性' },
    ht_zhu_marrow:  { name: '灵骨髓',     nameEn: 'Spirit Marrow',      type: 'treasure', rarity: 'rare',      desc: '突破辅助，永久增加属性' },
    ht_jin_core:    { name: '金精丹核',   nameEn: 'Golden Core Shard',  type: 'treasure', rarity: 'rare',      desc: '突破辅助，永久增加属性' },
    ht_jin_flame:   { name: '丹火精华',   nameEn: 'Pill Fire Essence',  type: 'treasure', rarity: 'epic',      desc: '突破辅助，永久增加属性' },
    ht_jin_thunder: { name: '雷劫残片',   nameEn: 'Tribulation Shard',  type: 'treasure', rarity: 'epic',      desc: '突破辅助，永久增加属性' },
    ht_ying_soul:   { name: '婴灵玉',     nameEn: 'Soul Jade',          type: 'treasure', rarity: 'epic',      desc: '突破辅助，永久增加属性' },
    ht_ying_lotus:  { name: '九转莲心',   nameEn: 'Lotus Heart',        type: 'treasure', rarity: 'legendary', desc: '突破辅助，永久增加属性' },
    ht_ying_mirror: { name: '照妖镜片',   nameEn: 'Mirror Shard',       type: 'treasure', rarity: 'legendary', desc: '突破辅助，永久增加属性' },
    ht_hua_god:     { name: '神魂碎片',   nameEn: 'God Soul Shard',     type: 'treasure', rarity: 'legendary', desc: '突破辅助，永久增加属性' },
    ht_hua_stone:   { name: '天道石',     nameEn: 'Heaven Stone',       type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_hua_eye:     { name: '天眼珠',     nameEn: 'Heaven Eye Bead',    type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_xu_void:     { name: '虚空碎片',   nameEn: 'Void Shard',         type: 'treasure', rarity: 'legendary', desc: '突破辅助，永久增加属性' },
    ht_xu_chaos:    { name: '混沌气息',   nameEn: 'Chaos Breath',       type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_ti_body:     { name: '万兽精血',   nameEn: 'Beast Blood',        type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_ti_heart:    { name: '天地心脏',   nameEn: 'Heart of Heaven',    type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_da_source:   { name: '大道本源',   nameEn: 'Dao Source',         type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_da_heart:    { name: '混沌之心',   nameEn: 'Chaos Heart',        type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_du_trib:     { name: '天劫之力',   nameEn: 'Tribulation Force',  type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
    ht_du_heel:     { name: '鸿蒙紫气',   nameEn: 'Primordial Qi',      type: 'treasure', rarity: 'mythic',    desc: '突破辅助，永久增加属性' },
  },

  // ---- Alchemy recipes ----

  // Realm period mapping: realmIndex range → period id
  realmPeriods: [
    { id: 'lianqi',  name: '炼气', minIndex: 0, maxIndex: 4 },
    { id: 'zhuji',   name: '筑基', minIndex: 5, maxIndex: 7 },
    { id: 'jindan',  name: '金丹', minIndex: 8, maxIndex: 10 },
    { id: 'yuanying',name: '元婴', minIndex: 11, maxIndex: 13 },
    { id: 'huashen', name: '化神', minIndex: 14, maxIndex: 16 },
    { id: 'lianxu',  name: '炼虚', minIndex: 17, maxIndex: 19 },
    { id: 'heti',    name: '合体', minIndex: 20, maxIndex: 22 },
    { id: 'dacheng', name: '大乘', minIndex: 23, maxIndex: 25 },
    { id: 'dujie',   name: '渡劫', minIndex: 26, maxIndex: 28 },
    { id: 'zhenxian',name: '真仙', minIndex: 29, maxIndex: 29 },
  ],

  // Get period id for a realm index
  getRealmPeriod(realmIndex) {
    return this.realmPeriods.find(p => realmIndex >= p.minIndex && realmIndex <= p.maxIndex) || this.realmPeriods[0];
  },

  // Check if breakthrough from realmIndex to realmIndex+1 is a large breakthrough (cross-period)
  isLargeBreakthrough(realmIndex) {
    const currentPeriod = this.getRealmPeriod(realmIndex);
    const nextPeriod = this.getRealmPeriod(realmIndex + 1);
    return currentPeriod.id !== nextPeriod.id;
  },

  // Heavenly treasures (天材地宝) — consumed during breakthrough for permanent stat bonuses
  heavenlyTreasures: [
    // Qi-tier (炼气期)
    { id: 'ht_qi_grass',    name: '灵气草',     tier: 'lianqi',  rarity: 'common',    bonus: { attack: 5, defense: 3 } },
    { id: 'ht_qi_crystal',  name: '聚气水晶',   tier: 'lianqi',  rarity: 'uncommon',  bonus: { attack: 12, defense: 6, hp: 50 } },
    { id: 'ht_qi_jade',     name: '养气玉',     tier: 'lianqi',  rarity: 'uncommon',  bonus: { attack: 8, defense: 10, critRate: 0.02 } },
    // Foundation-tier (筑基期)
    { id: 'ht_zhu_stone',   name: '筑基石',     tier: 'zhuji',   rarity: 'uncommon',  bonus: { attack: 30, defense: 20 } },
    { id: 'ht_zhu_essence', name: '地脉精华',   tier: 'zhuji',   rarity: 'rare',      bonus: { attack: 60, defense: 40, hp: 200 } },
    { id: 'ht_zhu_marrow',  name: '灵骨髓',     tier: 'zhuji',   rarity: 'rare',      bonus: { attack: 45, defense: 55, critRate: 0.03 } },
    // Golden Core-tier (金丹期)
    { id: 'ht_jin_core',    name: '金精丹核',   tier: 'jindan',  rarity: 'rare',      bonus: { attack: 150, defense: 100 } },
    { id: 'ht_jin_flame',   name: '丹火精华',   tier: 'jindan',  rarity: 'epic',      bonus: { attack: 300, defense: 180, hp: 1000 } },
    { id: 'ht_jin_thunder', name: '雷劫残片',   tier: 'jindan',  rarity: 'epic',      bonus: { attack: 250, defense: 250, critRate: 0.05, critDamage: 0.1 } },
    // Nascent Soul-tier (元婴期)
    { id: 'ht_ying_soul',   name: '婴灵玉',     tier: 'yuanying',rarity: 'epic',      bonus: { attack: 800, defense: 500 } },
    { id: 'ht_ying_lotus',  name: '九转莲心',   tier: 'yuanying',rarity: 'legendary', bonus: { attack: 1500, defense: 900, hp: 5000 } },
    { id: 'ht_ying_mirror', name: '照妖镜片',   tier: 'yuanying',rarity: 'legendary', bonus: { attack: 1200, defense: 1200, critRate: 0.06, defenseBreak: 0.05 } },
    // Deity Transform-tier (化神期)
    { id: 'ht_hua_god',     name: '神魂碎片',   tier: 'huashen', rarity: 'legendary', bonus: { attack: 5000, defense: 3000 } },
    { id: 'ht_hua_stone',   name: '天道石',     tier: 'huashen', rarity: 'mythic',    bonus: { attack: 8000, defense: 5000, hp: 30000 } },
    { id: 'ht_hua_eye',     name: '天眼珠',     tier: 'huashen', rarity: 'mythic',    bonus: { attack: 7000, defense: 7000, critRate: 0.08, lifeSteal: 0.05 } },
    // Void Refining-tier (炼虚期)
    { id: 'ht_xu_void',     name: '虚空碎片',   tier: 'lianxu',  rarity: 'legendary', bonus: { attack: 25000, defense: 15000 } },
    { id: 'ht_xu_chaos',    name: '混沌气息',   tier: 'lianxu',  rarity: 'mythic',    bonus: { attack: 40000, defense: 25000, hp: 100000 } },
    // Body Integration-tier (合体期)
    { id: 'ht_ti_body',     name: '万兽精血',   tier: 'heti',    rarity: 'mythic',    bonus: { attack: 100000, defense: 60000 } },
    { id: 'ht_ti_heart',    name: '天地心脏',   tier: 'heti',    rarity: 'mythic',    bonus: { attack: 150000, defense: 90000, hp: 500000 } },
    // Mahayana-tier (大乘期)
    { id: 'ht_da_source',   name: '大道本源',   tier: 'dacheng', rarity: 'mythic',    bonus: { attack: 400000, defense: 250000 } },
    { id: 'ht_da_heart',    name: '混沌之心',   tier: 'dacheng', rarity: 'mythic',    bonus: { attack: 600000, defense: 400000, hp: 2000000 } },
    // Tribulation-tier (渡劫期)
    { id: 'ht_du_trib',     name: '天劫之力',   tier: 'dujie',   rarity: 'mythic',    bonus: { attack: 2000000, defense: 1200000 } },
    { id: 'ht_du_heel',     name: '鸿蒙紫气',   tier: 'dujie',   rarity: 'mythic',    bonus: { attack: 3000000, defense: 2000000, hp: 10000000 } },
  ],
  recipes: [
    { id: 'r_juqi', result: 'juqi_dan', amount: 1, materials: { lingcao: 3 }, difficulty: 1 },
    { id: 'r_xiulian', result: 'xiulian_dan', amount: 1, materials: { lingcao: 5 }, difficulty: 1 },
    { id: 'r_zhuji', result: 'zhuji_dan', amount: 1, materials: { lingcao: 10, tiannian_lingyao: 1 }, difficulty: 3 },
    { id: 'r_huixue', result: 'huixue_dan', amount: 2, materials: { lingcao: 4 }, difficulty: 1 },
    { id: 'r_huti', result: 'huti_dan', amount: 1, materials: { lingcao: 6, kuangmai: 2 }, difficulty: 2 },
    { id: 'r_jiangchen', result: 'jiangchen_dan', amount: 1, materials: { tiannian_lingyao: 5, kuangmai: 3 }, difficulty: 5 },
    { id: 'r_julingshi', result: 'julingshi_dan', amount: 1, materials: { tiannian_lingyao: 3 }, difficulty: 3 },
    { id: 'r_dingshen', result: 'dingshen_dan', amount: 1, materials: { tiannian_lingyao: 10, longwen_heijin: 1 }, difficulty: 8 },
    { id: 'r_butian', result: 'butian_dan', amount: 1, materials: { longwen_heijin: 3, hundun_yuanshi: 1 }, difficulty: 12 },
    { id: 'r_lianxu', result: 'lianxu_dan', amount: 1, materials: { wanlian_shen: 3, longwen_heijin: 2, hundun_yuanshi: 1 }, difficulty: 14 },
    { id: 'r_heti', result: 'heti_dan', amount: 1, materials: { wanlian_shen: 5, hundun_yuanshi: 2, longxue_hua: 1 }, difficulty: 16 },
    { id: 'r_feisheng', result: 'feisheng_dan', amount: 1, materials: { hundun_yuanshi: 3, longxue_hua: 2 }, difficulty: 18 },
    { id: 'r_dujie', result: 'dujie_dan', amount: 1, materials: { longxue_hua: 3, hundun_yuanshi: 5, xianjin: 1 }, difficulty: 22 },
    { id: 'r_huoyan', result: 'xiulian_dan', amount: 3, materials: { lingcao: 4, huoyan_zhi: 1 }, difficulty: 2 },
    { id: 'r_bingxin', result: 'huti_dan', amount: 3, materials: { lingcao: 4, bingxin_lian: 1 }, difficulty: 3 },
    { id: 'r_zihua', result: 'butian_dan', amount: 1, materials: { zihua_guo: 5, wanlian_shen: 1 }, difficulty: 11 },
  ],

  // ---- Forge recipes (炼器) ----
  forgeRecipes: [
    { id: 'f_qingfeng', result: 'aw_qingfeng', amount: 1, materials: { xuantie: 5, lingshi: 500 }, difficulty: 1, minRealm: 0 },
    { id: 'f_juling', result: 'at_juling', amount: 1, materials: { xuantie: 3, kuangmai: 2, lingshi: 800 }, difficulty: 2, minRealm: 0 },
    { id: 'f_xuanguang', result: 'ar_xuanguang', amount: 1, materials: { xuantie: 8, kuangmai: 3, lingshi: 1500 }, difficulty: 3, minRealm: 3 },
    { id: 'f_liehuo', result: 'aw_liehuo', amount: 1, materials: { huoxin_jin: 4, kuangmai: 6, lingshi: 5000 }, difficulty: 5, minRealm: 5 },
    { id: 'f_qixing', result: 'at_qixing', amount: 1, materials: { kuangmai: 8, leiyin_shi: 2, lingshi: 8000 }, difficulty: 6, minRealm: 5 },
    { id: 'f_jingang', result: 'ar_jingang', amount: 1, materials: { huoxin_jin: 5, kuangmai: 10, lingshi: 12000 }, difficulty: 7, minRealm: 8 },
    { id: 'f_zhanlong', result: 'aw_zhanlong', amount: 1, materials: { longwen_heijin: 3, leiyin_shi: 5, huoxin_jin: 5, lingshi: 50000 }, difficulty: 12, minRealm: 11 },
    { id: 'f_huanglong', result: 'ar_huanglong', amount: 1, materials: { longwen_heijin: 4, huoxin_jin: 8, lingshi: 80000 }, difficulty: 14, minRealm: 14 },
    { id: 'f_taiji', result: 'at_taiji', amount: 1, materials: { hundun_yuanshi: 2, longwen_heijin: 5, lingshi: 200000 }, difficulty: 18, minRealm: 17 },
    { id: 'f_zhuxian', result: 'aw_zhuxian', amount: 1, materials: { xianjin: 3, hundun_yuanshi: 5, longwen_heijin: 10, lingshi: 1000000 }, difficulty: 25, minRealm: 23 },
  ],

  // ---- Spirit herb species (planted in garden) ----
  herbSpecies: [
    { id: 'qixin_cao', name: '七心草', interval: 240, yield: 2, minRealm: 0, seedCost: 50 },
    { id: 'huoyan_zhi', name: '火炎芝', interval: 480, yield: 1, minRealm: 3, seedCost: 300 },
    { id: 'bingxin_lian', name: '冰心莲', interval: 900, yield: 1, minRealm: 5, seedCost: 1500 },
    { id: 'zihua_guo', name: '紫华果', interval: 1800, yield: 1, minRealm: 8, seedCost: 8000 },
    { id: 'wanlian_shen', name: '万年灵参', interval: 3600, yield: 1, minRealm: 11, seedCost: 40000 },
    { id: 'longxue_hua', name: '龙血花', interval: 7200, yield: 1, minRealm: 14, seedCost: 200000 },
  ],

  // ---- Techniques ----
  techniques: [
    // Fragment tier (残篇)
    { id: 't_basic_sword', name: '基础剑法残篇', nameEn: 'Basic Sword Fragment', tier: 'fragment',
      school: 'sword', maxLevel: 5, effect: { stat: 'attack', type: 'flat', base: 5, perLevel: 3 },
      source: 'exploration' },
    { id: 't_basic_body', name: '基础体修残篇', nameEn: 'Basic Body Fragment', tier: 'fragment',
      school: 'body', maxLevel: 5, effect: { stat: 'defense', type: 'flat', base: 5, perLevel: 3 },
      source: 'exploration' },
    { id: 't_basic_qi', name: '基础养气诀', nameEn: 'Basic Qi Art', tier: 'fragment',
      school: 'qi', maxLevel: 5, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.05, perLevel: 0.02 },
      source: 'exploration' },
    { id: 't_basic_talisman', name: '基础符术残篇', nameEn: 'Basic Talisman Fragment', tier: 'fragment',
      school: 'talisman', maxLevel: 5, effect: { stat: 'attack', type: 'flat', base: 3, perLevel: 2 },
      source: 'exploration' },

    // Earth tier (地阶)
    { id: 't_wind_sword', name: '疾风剑诀', nameEn: 'Gale Sword Art', tier: 'earth',
      school: 'sword', maxLevel: 10, effect: { stat: 'attack', type: 'percent', base: 0.1, perLevel: 0.03 },
      source: 'sect_shop', cost: 500 },
    { id: 't_iron_body', name: '铁壁体修功', nameEn: 'Iron Wall Body Art', tier: 'earth',
      school: 'body', maxLevel: 10, effect: { stat: 'defense', type: 'percent', base: 0.1, perLevel: 0.03 },
      source: 'sect_shop', cost: 500 },
    { id: 't_spirit_gathering', name: '聚灵心法', nameEn: 'Spirit Gathering Art', tier: 'earth',
      school: 'qi', maxLevel: 10, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.1, perLevel: 0.04 },
      source: 'sect_shop', cost: 800 },
    { id: 't_thunder_talisman', name: '雷霆符篆', nameEn: 'Thunder Talisman Art', tier: 'earth',
      school: 'talisman', maxLevel: 10, effect: { stat: 'attack', type: 'percent', base: 0.08, perLevel: 0.03 },
      source: 'sect_shop', cost: 600 },

    // Heaven tier (天阶)
    { id: 't_heaven_sword', name: '天罡剑经', nameEn: 'Heavenly Sword Canon', tier: 'heaven',
      school: 'sword', maxLevel: 20, effect: { stat: 'attack', type: 'percent', base: 0.2, perLevel: 0.05 },
      source: 'adventure' },
    { id: 't_vajra_body', name: '金刚不坏体', nameEn: 'Vajra Body', tier: 'heaven',
      school: 'body', maxLevel: 20, effect: { stat: 'defense', type: 'percent', base: 0.2, perLevel: 0.05 },
      source: 'adventure' },
    { id: 't_chaos_qi', name: '混沌吞天诀', nameEn: 'Chaos Devouring Art', tier: 'heaven',
      school: 'qi', maxLevel: 20, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.25, perLevel: 0.06 },
      source: 'adventure' },

    // Forbidden tier (禁忌)
    { id: 't_forbidden_blood', name: '血魔秘术', nameEn: 'Blood Demon Secret', tier: 'forbidden',
      school: 'body', maxLevel: 10, effect: { stat: 'attack', type: 'percent', base: 0.4, perLevel: 0.08 },
      source: 'adventure', special: 'sacrifice_hp' },
    { id: 't_forbidden_soul', name: '噬魂大法', nameEn: 'Soul Devouring Art', tier: 'forbidden',
      school: 'talisman', maxLevel: 10, effect: { stat: 'attack', type: 'percent', base: 0.35, perLevel: 0.07 },
      source: 'adventure', special: 'sacrifice_hp' },
  ],

  techniqueTierOrder: ['fragment', 'earth', 'heaven', 'forbidden'],
  techniqueTierNames: { fragment: '残篇', earth: '地阶', heaven: '天阶', forbidden: '禁忌' },

  // ---- Exploration zones ----
  zones: [
    { id: 'z_village', name: '外门村庄', nameEn: 'Outer Village', minRealm: 0,
      nodes: 6, spiritCost: 5,
      drops: ['lingcao', 'lingshi'], dropRates: [0.6, 0.4] },
    { id: 'z_forest', name: '灵兽森林', nameEn: 'Spirit Beast Forest', minRealm: 3,
      nodes: 8, spiritCost: 10,
      drops: ['lingcao', 'lingshi', 'tiannian_lingyao'], dropRates: [0.5, 0.3, 0.05] },
    { id: 'z_mine', name: '灵矿山脉', nameEn: 'Spirit Vein Mountain', minRealm: 5,
      nodes: 10, spiritCost: 15,
      drops: ['kuangmai', 'lingshi', 'lingcao'], dropRates: [0.3, 0.4, 0.3] },
    { id: 'z_ruins', name: '远古遗迹', nameEn: 'Ancient Ruins', minRealm: 8,
      nodes: 12, spiritCost: 25,
      drops: ['tiannian_lingyao', 'kuangmai', 'longwen_heijin'], dropRates: [0.3, 0.25, 0.05] },
    { id: 'z_abyss', name: '深渊秘境', nameEn: 'Abyss Realm', minRealm: 11,
      nodes: 15, spiritCost: 40,
      drops: ['longwen_heijin', 'hundun_yuanshi', 'tiannian_lingyao'], dropRates: [0.1, 0.03, 0.3] },
    { id: 'z_chaos', name: '混沌虚空', nameEn: 'Chaos Void', minRealm: 14,
      nodes: 20, spiritCost: 60,
      drops: ['hundun_yuanshi', 'longwen_heijin'], dropRates: [0.08, 0.15] },
  ],

  // ---- Encounters (random events on nodes) ----
  encounters: [
    {
      id: 'e_wounded_cultivator', name: '受伤的修士',
      minRealm: 0, weight: 20,
      description: '你发现一位重伤倒地的修士，气息奄奄。他身上散发着微弱的灵力波动……',
      choices: [
        { text: '施以援手', effects: { reputation: 5 }, outcome: '你为伤者输送灵力，他感激地递给你一些灵石后离去。', rewards: { lingshi: 100 } },
        { text: '搜刮财物', effects: { reputation: -10 }, outcome: '你趁人之危掠夺了他的储物袋，获得了一些物品。', rewards: { lingshi: 200, lingcao: 3 } },
        { text: '默默离去', effects: {}, outcome: '你选择了旁观，继续前行。', rewards: {} },
      ]
    },
    {
      id: 'e_spirit_spring', name: '灵泉',
      minRealm: 0, weight: 15,
      description: '一处灵气充沛的泉眼出现在眼前，泉水清澈透亮，灵气氤氲。',
      choices: [
        { text: '原地修炼', effects: {}, outcome: '你在灵泉旁修炼，感到修为大幅增长！', rewards: { cultivation: 'current_rate_300s' } },
        { text: '收集泉水', effects: {}, outcome: '你将灵泉水收集起来，获得了一些珍稀材料。', rewards: { lingcao: 5, tiannian_lingyao: 1 } },
      ]
    },
    {
      id: 'e_sect_trial', name: '门派试炼',
      minRealm: 3, weight: 15,
      description: '你遇到了一位门派长老，他提出要考验你的修为。',
      choices: [
        { text: '接受考验', effects: { reputation: 3 }, outcome: '你通过试炼，长老赐你一部功法。', rewards: { technique_scroll: 'random_earth' } },
        { text: '婉言谢绝', effects: {}, outcome: '你恭敬地谢过长老，继续前行。', rewards: {} },
      ]
    },
    {
      id: 'e_demonic_beast', name: '妖兽拦路',
      minRealm: 0, weight: 25,
      description: '一头凶猛的妖兽挡住了去路，散发着令人窒息的妖气！',
      choices: [
        { text: '正面战斗', effects: {}, outcome: 'combat', rewards: {} },
        { text: '绕路而行', effects: {}, outcome: '你选择避开妖兽，消耗了一些体力。', rewards: {} },
      ]
    },
    {
      id: 'e_hidden_cave', name: '隐秘洞府',
      minRealm: 5, weight: 10,
      description: '你发现了一处隐蔽的洞府入口，里面隐约有光芒闪烁。',
      choices: [
        { text: '进入探索', effects: {}, outcome: 'cave_explore', rewards: {} },
        { text: '标记位置后离开', effects: {}, outcome: '你在地图上标记了这个位置，日后再来探索。', rewards: {} },
      ]
    },
    {
      id: 'e_trader', name: '神秘商贩',
      minRealm: 0, weight: 12,
      description: '一个蒙面商贩出现在你面前，他的摊位上摆满了奇珍异宝。',
      choices: [
        { text: '购买丹药（500灵石）', effects: {}, outcome: '你购买了商贩的丹药。', rewards: { xiulian_dan: 3 }, cost: { lingshi: 500 } },
        { text: '购买材料（300灵石）', effects: {}, outcome: '你购买了一些材料。', rewards: { lingcao: 10 }, cost: { lingshi: 300 } },
        { text: '离开', effects: {}, outcome: '你没有找到心仪之物。', rewards: {} },
      ]
    },
    {
      id: 'e_heavenly_tribulation', name: '天机异象',
      minRealm: 8, weight: 5,
      description: '天空中突然出现异象，一道金光降落在你面前，蕴含着不可思议的力量。',
      choices: [
        { text: '吸收金光', effects: { reputation: 10 }, outcome: '你强行吸收天降金光，修为大增！', rewards: { cultivation: 'current_rate_3600s' } },
        { text: '谨慎观察', effects: { reputation: 2 }, outcome: '你仔细观察后发现这是一次罕见的天机眷顾，获得了一些感悟。', rewards: { cultivation: 'current_rate_600s' } },
      ]
    },
    {
      id: 'e_demonic_cultivator', name: '魔修来袭',
      minRealm: 6, weight: 15,
      description: '一名浑身散发黑气的魔修拦住了你的去路，"交出你的储物袋！"',
      choices: [
        { text: '迎头痛击', effects: { reputation: 5 }, outcome: 'combat_demonic', rewards: {} },
        { text: '交出灵石脱身', effects: { reputation: -3 }, outcome: '你丢出一袋灵石，趁魔修捡拾时逃走。', cost: { lingshi: 200 } },
      ]
    },
    {
      id: 'e_ancient_tomb', name: '古修洞府',
      minRealm: 10, weight: 5,
      description: '你偶然发现了一处上古修士的坐化之地，残存的禁制若隐若现。',
      choices: [
        { text: '强行破阵', effects: {}, outcome: 'cave_explore_hard', rewards: {} },
        { text: '小心解阵', effects: {}, outcome: '你花费时间小心翼翼地解除禁制，发现了宝藏！', rewards: { longwen_heijin: 1, tiannian_lingyao: 3 }, cost: { spirit: 30 } },
      ]
    },
  ],

  // ---- Enemies by zone ----
  enemies: {
    z_village: [
      { name: '野狼', hp: 50, attack: 8, defense: 3, drops: { lingshi: [10, 30] } },
      { name: '毒蛇', hp: 30, attack: 12, defense: 2, drops: { lingshi: [5, 20], lingcao: [1, 2] } },
    ],
    z_forest: [
      { name: '灵兔', hp: 120, attack: 25, defense: 10, drops: { lingshi: [30, 80], lingcao: [1, 3] } },
      { name: '赤狐', hp: 200, attack: 40, defense: 15, drops: { lingshi: [50, 120], tiannian_lingyao: [0, 1] } },
      { name: '巨蟒', hp: 350, attack: 60, defense: 25, drops: { lingshi: [80, 200], lingcao: [2, 5] } },
    ],
    z_mine: [
      { name: '石魔', hp: 500, attack: 70, defense: 50, drops: { kuangmai: [1, 3], lingshi: [100, 250] } },
      { name: '矿脉灵蛇', hp: 400, attack: 90, defense: 30, drops: { kuangmai: [1, 2], lingshi: [80, 200] } },
    ],
    z_ruins: [
      { name: '傀儡守卫', hp: 2000, attack: 200, defense: 100, drops: { kuangmai: [2, 5], tiannian_lingyao: [1, 3] } },
      { name: '亡灵修士', hp: 3000, attack: 280, defense: 120, drops: { tiannian_lingyao: [2, 4], longwen_heijin: [0, 1] } },
    ],
    z_abyss: [
      { name: '深渊魔蛛', hp: 15000, attack: 1200, defense: 600, drops: { longwen_heijin: [1, 2], hundun_yuanshi: [0, 1] } },
      { name: '虚空行者', hp: 25000, attack: 2000, defense: 800, drops: { longwen_heijin: [1, 3], tiannian_lingyao: [3, 6] } },
    ],
    z_chaos: [
      { name: '混沌巨兽', hp: 100000, attack: 8000, defense: 4000, drops: { hundun_yuanshi: [1, 2], longwen_heijin: [2, 4] } },
      { name: '虚空领主', hp: 200000, attack: 15000, defense: 7000, drops: { hundun_yuanshi: [2, 3] } },
    ],
  },

  // ---- Spirit gathering array upgrades ----
  arrayUpgrades: [
    { level: 1, bonus: 0, cost: 0 },
    { level: 2, bonus: 0.05, cost: 200 },
    { level: 3, bonus: 0.12, cost: 800 },
    { level: 4, bonus: 0.20, cost: 3000 },
    { level: 5, bonus: 0.30, cost: 10000 },
    { level: 6, bonus: 0.45, cost: 40000 },
    { level: 7, bonus: 0.60, cost: 150000 },
    { level: 8, bonus: 0.80, cost: 500000 },
    { level: 9, bonus: 1.0, cost: 2000000 },
    { level: 10, bonus: 1.3, cost: 8000000 },
  ],

  // ---- Spirit Herb Garden ----
  gardenUpgrades: [
    { level: 1, yield: 1, interval: 300, cost: 0 },
    { level: 2, yield: 2, interval: 280, cost: 500 },
    { level: 3, yield: 3, interval: 250, cost: 2000 },
    { level: 4, yield: 5, interval: 220, cost: 8000 },
    { level: 5, yield: 8, interval: 180, cost: 30000 },
  ],

  // ---- Cultivation speed formula ----
  // R_total = R_base * (1 + sum(passive_mods)) * product(active_mods) * (1 + array_bonus)
  // passive_mods come from learned techniques
  // active_mods come from active pill effects
  // array_bonus from spirit gathering array level

  // ===========================================================
  // SECT SYSTEM (宗门系统)
  // ===========================================================

  // Sects the player can join
  sects: [
    {
      id: 'qingyun', name: '青云宗', nameEn: 'Qingyun Sect',
      desc: '正道大宗，以剑修闻名天下',
      bonus: { cultivation_mult: 0.05 },
      minRealm: 0,
      shopDiscount: 0.9, // 10% off
    },
    {
      id: 'tiangang', name: '天罡门', nameEn: 'Tiangang Sect',
      desc: '体修圣地，弟子肉身成圣',
      bonus: { defense_mult: 0.05 },
      minRealm: 3,
      shopDiscount: 0.9,
    },
    {
      id: 'lingxu', name: '灵虚阁', nameEn: 'Lingxu Pavilion',
      desc: '法修汇聚之地，善驱灵御气',
      bonus: { cultivation_mult: 0.08 },
      minRealm: 5,
      shopDiscount: 0.85,
    },
    {
      id: 'xuantian', name: '玄天宗', nameEn: 'Xuantian Sect',
      desc: '符道魁首，制符炼器无所不精',
      bonus: { attack_mult: 0.05 },
      minRealm: 8,
      shopDiscount: 0.85,
    },
    {
      id: 'wanjian', name: '万剑阁', nameEn: 'Wanjian Pavilion',
      desc: '坤元域剑修圣地，万剑归宗',
      bonus: { attack_mult: 0.08 },
      minRealm: 14,
      shopDiscount: 0.85,
    },
    {
      id: 'taiyi', name: '太一宗', nameEn: 'Taiyi Sect',
      desc: '中央域第一大宗，道法通天',
      bonus: { cultivation_mult: 0.12 },
      minRealm: 20,
      shopDiscount: 0.80,
    },
  ],

  // Sect position hierarchy
  sectPositions: [
    {
      id: 'zaoyi', name: '杂役弟子', nameEn: 'Chore Disciple',
      contributionReq: 0,
      perks: { missionSlots: 2, shopAccess: 'basic', salary: 10 },
      commission: 0,
      desc: '宗门最底层的弟子，负责日常杂务',
    },
    {
      id: 'waimen', name: '外门弟子', nameEn: 'Outer Disciple',
      contributionReq: 200,
      perks: { missionSlots: 3, shopAccess: 'outer', salary: 30 },
      commission: 0,
      desc: '正式入门，可接取外门任务',
    },
    {
      id: 'neimen', name: '内门弟子', nameEn: 'Inner Disciple',
      contributionReq: 1000,
      perks: { missionSlots: 4, shopAccess: 'inner', salary: 80 },
      commission: 0,
      desc: '宗门精英，享有内门资源',
    },
    {
      id: 'qinchuan', name: '亲传弟子', nameEn: 'Core Disciple',
      contributionReq: 5000,
      perks: { missionSlots: 5, shopAccess: 'core', salary: 200 },
      commission: 0,
      desc: '长老亲传，地位仅次于管理层',
    },
    {
      id: 'zhishi', name: '执事', nameEn: 'Deacon',
      contributionReq: 15000,
      perks: { missionSlots: 5, shopAccess: 'deacon', salary: 500 },
      commission: 0.02,
      desc: '管理宗门日常事务，可获得弟子任务提成',
    },
    {
      id: 'zhanglao', name: '长老', nameEn: 'Elder',
      contributionReq: 50000,
      perks: { missionSlots: 6, shopAccess: 'elder', salary: 1500 },
      commission: 0.05,
      desc: '宗门管理层，管理一个堂口，获得弟子贡献5%提成',
    },
    {
      id: 'dazhanglao', name: '大长老', nameEn: 'Grand Elder',
      contributionReq: 150000,
      perks: { missionSlots: 6, shopAccess: 'elder', salary: 4000 },
      commission: 0.08,
      desc: '宗门核心决策层，获得弟子贡献8%提成',
    },
    {
      id: 'zhangmen', name: '掌门', nameEn: 'Sect Master',
      contributionReq: 500000,
      perks: { missionSlots: 8, shopAccess: 'all', salary: 10000 },
      commission: 0.12,
      desc: '一宗之主，获得弟子贡献12%提成，可发布宗门公告',
    },
  ],

  // Mission hall tasks
  sectMissions: [
    // ---- Daily chores (弟子必做) ----
    {
      id: 'm_sweep', name: '打扫山门', type: 'daily', required: true,
      difficulty: 1, contribution: 10, spiritCost: 5,
      desc: '清晨打扫宗门山门，维持宗门整洁',
      reward: { lingshi: 20, lingcao: 2 },
      minPosition: 0, // zaoyi
    },
    {
      id: 'm_water', name: '浇灌灵植', type: 'daily', required: true,
      difficulty: 1, contribution: 15, spiritCost: 5,
      desc: '为灵植园浇灌灵泉水',
      reward: { lingshi: 30, lingcao: 3 },
      minPosition: 0,
    },
    {
      id: 'm_patrol', name: '巡逻外山', type: 'daily', required: true,
      difficulty: 1, contribution: 20, spiritCost: 8,
      desc: '巡逻外山区域，驱逐入侵妖兽',
      reward: { lingshi: 50 },
      minPosition: 1, // waimen+
    },

    // ---- Contribution tasks (贡献任务) ----
    {
      id: 'm_herbs', name: '采集灵草', type: 'contribution', required: false,
      difficulty: 2, contribution: 30, spiritCost: 10,
      desc: '前往灵草谷采集指定灵草',
      reward: { lingcao: 8, lingshi: 80 },
      minPosition: 1,
    },
    {
      id: 'm_mine', name: '开采灵矿', type: 'contribution', required: false,
      difficulty: 2, contribution: 40, spiritCost: 12,
      desc: '深入矿脉开采灵石矿',
      reward: { kuangmai: 3, lingshi: 120 },
      minPosition: 1,
    },
    {
      id: 'm_refine', name: '炼丹供奉', type: 'contribution', required: false,
      difficulty: 3, contribution: 60, spiritCost: 0,
      desc: '炼制指定丹药上交宗门',
      reward: { lingshi: 200 },
      cost: { xiulian_dan: 3 },
      minPosition: 2, // neimen+
    },
    {
      id: 'm_hunt', name: '猎杀妖兽', type: 'contribution', required: false,
      difficulty: 3, contribution: 50, spiritCost: 15,
      desc: '前往指定区域猎杀危害宗门的妖兽',
      reward: { lingshi: 150, tiannian_lingyao: 1 },
      minPosition: 2,
    },
    {
      id: 'm_guard', name: '镇守山门', type: 'contribution', required: false,
      difficulty: 4, contribution: 80, spiritCost: 20,
      desc: '镇守宗门要隘一天，抵御外敌入侵',
      reward: { lingshi: 300, lingcao: 10 },
      minPosition: 2,
    },

    // ---- Special tasks (特殊任务) ----
    {
      id: 'm_secret', name: '探查秘境', type: 'special', required: false,
      difficulty: 6, contribution: 150, spiritCost: 30,
      desc: '探查宗门新发现的秘境入口，绘制地图',
      reward: { lingshi: 800, tiannian_lingyao: 3 },
      minPosition: 3, // qinchuan+
    },
    {
      id: 'm_diplomacy', name: '出使他宗', type: 'special', required: false,
      difficulty: 5, contribution: 120, spiritCost: 25,
      desc: '代表宗门出访友好宗门，传递重要信函',
      reward: { lingshi: 600, longwen_heijin: 1 },
      minPosition: 3,
    },
    {
      id: 'm_teach', name: '传道授业', type: 'special', required: false,
      difficulty: 7, contribution: 200, spiritCost: 0,
      desc: '为外门弟子授课讲道，传授修炼心得',
      reward: { lingshi: 1000, tiannian_lingyao: 5 },
      minPosition: 4, // zhishi+
    },
    {
      id: 'm_suppress', name: '镇压魔潮', type: 'special', required: false,
      difficulty: 9, contribution: 350, spiritCost: 50,
      desc: '魔气暴动，需长老级修士前往镇压',
      reward: { lingshi: 3000, longwen_heijin: 2, hundun_yuanshi: 1 },
      minPosition: 5, // zhanglao+
    },
    {
      id: 'm_war', name: '宗门大战', type: 'special', required: false,
      difficulty: 12, contribution: 600, spiritCost: 80,
      desc: '宗门间爆发大战，需全力出击',
      reward: { lingshi: 8000, hundun_yuanshi: 2, longwen_heijin: 3 },
      minPosition: 6, // dazhanglao+
    },
  ],

  // Sect shop items (purchased with contribution points)
  sectShopItems: [
    { id: 'ss_xiulian', name: '修炼丹x5', cost: 50, itemId: 'xiulian_dan', amount: 5, access: 'basic' },
    { id: 'ss_lingcao', name: '灵草x10', cost: 30, itemId: 'lingcao', amount: 10, access: 'basic' },
    { id: 'ss_huixue', name: '回血丹x3', cost: 60, itemId: 'huixue_dan', amount: 3, access: 'outer' },
    { id: 'ss_huti', name: '护体丹x2', cost: 100, itemId: 'huti_dan', amount: 2, access: 'outer' },
    { id: 'ss_juqi', name: '聚气丹x1', cost: 150, itemId: 'juqi_dan', amount: 1, access: 'inner' },
    { id: 'ss_zhuji', name: '筑基丹x1', cost: 400, itemId: 'zhuji_dan', amount: 1, access: 'inner' },
    { id: 'ss_tianling', name: '千年灵药x3', cost: 300, itemId: 'tiannian_lingyao', amount: 3, access: 'core' },
    { id: 'ss_jiangchen', name: '降尘丹x1', cost: 1200, itemId: 'jiangchen_dan', amount: 1, access: 'deacon' },
    { id: 'ss_heijin', name: '龙纹黑金x1', cost: 2000, itemId: 'longwen_heijin', amount: 1, access: 'elder' },
    { id: 'ss_dingshen', name: '定神丹x1', cost: 5000, itemId: 'dingshen_dan', amount: 1, access: 'elder' },
    { id: 'ss_hundun', name: '混沌原石x1', cost: 15000, itemId: 'hundun_yuanshi', amount: 1, access: 'all' },
    { id: 'ss_butian', name: '补天丹x1', cost: 30000, itemId: 'butian_dan', amount: 1, access: 'all' },
    { id: 'ss_lianxu', name: '炼虚丹x1', cost: 80000, itemId: 'lianxu_dan', amount: 1, access: 'all' },
    { id: 'ss_heti', name: '合体丹x1', cost: 200000, itemId: 'heti_dan', amount: 1, access: 'all' },
  ],

  // ===========================================================
  // AUCTION SYSTEM (拍卖会)
  // ===========================================================

  // Auction schedule: every 4 hours, player can attend
  auctionSchedule: 4 * 3600, // seconds between auctions

  // NPC bidders with personalities
  auctionNPCs: [
    { name: '富商王员外', style: 'aggressive', maxBudget: 50000, bidIncrement: 1.15 },
    { name: '散修李真人', style: 'conservative', maxBudget: 30000, bidIncrement: 1.08 },
    { name: '世家赵公子', style: 'aggressive', maxBudget: 100000, bidIncrement: 1.2 },
    { name: '坊市陈掌柜', style: 'conservative', maxBudget: 20000, bidIncrement: 1.05 },
    { name: '隐世老怪', style: 'random', maxBudget: 200000, bidIncrement: 1.3 },
    { name: '名门苏小姐', style: 'moderate', maxBudget: 80000, bidIncrement: 1.1 },
    { name: '药王谷弟子', style: 'conservative', maxBudget: 40000, bidIncrement: 1.06 },
    { name: '剑修独孤胜', style: 'aggressive', maxBudget: 60000, bidIncrement: 1.18 },
  ],

  // Auction item pools by tier (determined by region + sect affiliation)
  auctionItemPools: [
    // Micro auction — 四域附属宗门
    {
      tier: 'micro', name: '微型拍卖会',
      items: [
        { itemId: 'xiulian_dan', amount: 3, basePrice: 150, weight: 35 },
        { itemId: 'lingcao', amount: 10, basePrice: 100, weight: 30 },
        { itemId: 'huixue_dan', amount: 3, basePrice: 200, weight: 20 },
        { itemId: 'huti_dan', amount: 2, basePrice: 250, weight: 10 },
        { itemId: 'juqi_dan', amount: 1, basePrice: 350, weight: 5 },
      ],
    },
    // Small auction — 四域非附属宗门
    {
      tier: 'small', name: '小型拍卖会',
      items: [
        { itemId: 'xiulian_dan', amount: 5, basePrice: 200, weight: 30 },
        { itemId: 'lingcao', amount: 15, basePrice: 150, weight: 25 },
        { itemId: 'huixue_dan', amount: 5, basePrice: 250, weight: 20 },
        { itemId: 'huti_dan', amount: 3, basePrice: 300, weight: 15 },
        { itemId: 'juqi_dan', amount: 2, basePrice: 400, weight: 10 },
        { itemId: 'zhuji_dan', amount: 1, basePrice: 800, weight: 5 },
      ],
    },
    // Medium auction — 坤元域附属宗门
    {
      tier: 'medium', name: '中型拍卖会',
      items: [
        { itemId: 'zhuji_dan', amount: 3, basePrice: 1500, weight: 25 },
        { itemId: 'tiannian_lingyao', amount: 5, basePrice: 1200, weight: 20 },
        { itemId: 'kuangmai', amount: 5, basePrice: 1000, weight: 20 },
        { itemId: 'jiangchen_dan', amount: 1, basePrice: 3000, weight: 15 },
        { itemId: 'longwen_heijin', amount: 1, basePrice: 5000, weight: 8 },
        { itemId: 'julingshi_dan', amount: 3, basePrice: 2000, weight: 12 },
      ],
    },
    // Large auction — 坤元域非附属宗门
    {
      tier: 'large', name: '大型拍卖会',
      items: [
        { itemId: 'jiangchen_dan', amount: 3, basePrice: 8000, weight: 20 },
        { itemId: 'dingshen_dan', amount: 1, basePrice: 15000, weight: 15 },
        { itemId: 'longwen_heijin', amount: 3, basePrice: 12000, weight: 15 },
        { itemId: 'hundun_yuanshi', amount: 1, basePrice: 30000, weight: 8 },
        { itemId: 'tiannian_lingyao', amount: 10, basePrice: 5000, weight: 20 },
        { itemId: 'wanlian_shen', amount: 5, basePrice: 25000, weight: 12 },
        { itemId: 'butian_dan', amount: 1, basePrice: 50000, weight: 5 },
        { itemId: 'longxue_hua', amount: 1, basePrice: 150000, weight: 4 },
        { itemId: 'xianjin', amount: 1, basePrice: 500000, weight: 1 },
      ],
    },
    // Huge auction — 中央域附属宗门
    {
      tier: 'huge', name: '巨型拍卖会',
      items: [
        { itemId: 'jiangchen_dan', amount: 5, basePrice: 8000, weight: 18 },
        { itemId: 'dingshen_dan', amount: 2, basePrice: 15000, weight: 14 },
        { itemId: 'longwen_heijin', amount: 5, basePrice: 12000, weight: 14 },
        { itemId: 'hundun_yuanshi', amount: 2, basePrice: 30000, weight: 10 },
        { itemId: 'butian_dan', amount: 1, basePrice: 50000, weight: 7 },
        { itemId: 'tiannian_lingyao', amount: 15, basePrice: 5000, weight: 15 },
        { itemId: 'wanlian_shen', amount: 8, basePrice: 25000, weight: 10 },
        { itemId: 'longxue_hua', amount: 1, basePrice: 150000, weight: 5 },
        { itemId: 'feisheng_dan', amount: 1, basePrice: 200000, weight: 4 },
        { itemId: 'xianjin', amount: 1, basePrice: 500000, weight: 2 },
        { itemId: 'dujie_dan', amount: 1, basePrice: 800000, weight: 1 },
      ],
    },
    // Top auction — 中央域非附属宗门
    {
      tier: 'top', name: '顶级拍卖会',
      items: [
        { itemId: 'dingshen_dan', amount: 3, basePrice: 15000, weight: 14 },
        { itemId: 'hundun_yuanshi', amount: 3, basePrice: 30000, weight: 12 },
        { itemId: 'butian_dan', amount: 2, basePrice: 50000, weight: 10 },
        { itemId: 'wanlian_shen', amount: 10, basePrice: 25000, weight: 14 },
        { itemId: 'longxue_hua', amount: 2, basePrice: 150000, weight: 8 },
        { itemId: 'feisheng_dan', amount: 1, basePrice: 200000, weight: 6 },
        { itemId: 'xianjin', amount: 2, basePrice: 500000, weight: 5 },
        { itemId: 'dujie_dan', amount: 1, basePrice: 800000, weight: 4 },
        { itemId: 'tiannian_lingyao', amount: 20, basePrice: 5000, weight: 12 },
        { itemId: 'jiangchen_dan', amount: 8, basePrice: 8000, weight: 10 },
        { itemId: 'longwen_heijin', amount: 8, basePrice: 12000, weight: 5 },
      ],
    },
  ],

  // ===========================================================
  // WORLD & BIRTHPLACE (世界、出生地)
  // ===========================================================
  worldRegions: [
    { id: 'r_north',  name: '北域 · 玄冰北冥域', x: 0.50, y: 0.18, color: '#88c4ff' },
    { id: 'r_east',   name: '东域 · 青霄木灵域', x: 0.86, y: 0.45, color: '#7be08a' },
    { id: 'r_south',  name: '南域 · 离火炎疆域', x: 0.50, y: 0.85, color: '#ff7a3a' },
    { id: 'r_west',   name: '西域 · 锐金苍梧域', x: 0.13, y: 0.45, color: '#ffd070' },
    { id: 'r_center', name: '中央 · 鸿蒙道源陆', x: 0.50, y: 0.50, color: '#d6e5b8' },
    { id: 'r_polar',  name: '南极 · 焚天禁地',   x: 0.78, y: 0.92, color: '#c8c8d0' },
  ],

  // ---- Profession / Class categories (choose 3) ----
  professionCategories: [
    {
      id: 'cat_body', name: '体修', desc: '以肉身证道，万法不侵',
      items: [
        { id: 'body', name: '体修', desc: '肉身成圣，万法不侵', bonus: { defense_pct: 0.15, max_hp_pct: 0.20, hp_regen_pct: 0.005 } },
      ]
    },
    {
      id: 'cat_spell', name: '术修', desc: '五行术法，天地为用',
      items: [
        { id: 'spell_metal', name: '金修', desc: '锐金之气，攻伐无双', bonus: { attack_pct: 0.12, crit_rate: 0.05, defense_break: 0.05 } },
        { id: 'spell_wood',  name: '木修', desc: '生机不绝，万物生长', bonus: { hp_regen_pct: 0.008, life_steal: 0.04, cultivation_mult: 0.05 } },
        { id: 'spell_water', name: '水修', desc: '柔水穿石，以柔克刚', bonus: { defense_pct: 0.10, max_hp_pct: 0.10, maxSpirit: 15 } },
        { id: 'spell_fire',  name: '火修', desc: '烈焰焚天，暴烈无双', bonus: { attack_pct: 0.15, crit_damage: 0.20, crit_rate: 0.03 } },
        { id: 'spell_earth', name: '土修', desc: '厚德载物，固若金汤', bonus: { defense_pct: 0.18, max_hp_pct: 0.12, defense_break: 0.03 } },
      ]
    },
    {
      id: 'cat_martial', name: '武修', desc: '以武入道，千变万化',
      items: [
        { id: 'martial_fist',  name: '拳修', desc: '拳镇山河，力破万法', bonus: { attack_pct: 0.10, max_hp_pct: 0.10, crit_damage: 0.15 } },
        { id: 'martial_finger', name: '指修', desc: '一指破空，精准制敌', bonus: { crit_rate: 0.10, defense_break: 0.08, crit_damage: 0.10 } },
        { id: 'martial_palm',   name: '掌修', desc: '掌力浑厚，刚柔并济', bonus: { attack_pct: 0.08, defense_pct: 0.08, life_steal: 0.03 } },
        { id: 'martial_blade',  name: '刀修', desc: '一刀断水，霸道凌厉', bonus: { attack_pct: 0.14, crit_damage: 0.25, life_steal: 0.02 } },
        { id: 'martial_spear',  name: '枪修', desc: '一枪破阵，锐不可当', bonus: { attack_pct: 0.12, defense_break: 0.10, crit_rate: 0.04 } },
        { id: 'martial_sword',  name: '剑修', desc: '剑心通明，万剑归宗', bonus: { attack_pct: 0.10, crit_rate: 0.06, crit_damage: 0.15, cultivation_mult: 0.03 } },
      ]
    },
    {
      id: 'cat_arts', name: '六艺', desc: '六道精通，辅佐修行',
      items: [
        { id: 'arts_pill',    name: '丹修', desc: '炼丹之道，丹成通天', bonus: { cultivation_mult: 0.06, life_steal: 0.02 } },
        { id: 'arts_forge',   name: '器修', desc: '炼器之道，法宝护身', bonus: { attack_pct: 0.06, defense_pct: 0.06 } },
        { id: 'arts_talisman', name: '符修', desc: '符箓之道，万法归符', bonus: { defense_pct: 0.08, maxSpirit: 20, crit_rate: 0.03 } },
        { id: 'arts_array',   name: '阵修', desc: '阵法之道，困敌无形', bonus: { defense_pct: 0.10, cultivation_mult: 0.08, max_hp_pct: 0.05 } },
        { id: 'arts_beast',   name: '兽修', desc: '驭兽之道，万兽臣服', bonus: { attack_pct: 0.10, life_steal: 0.05, crit_rate: 0.03 } },
        { id: 'arts_plant',   name: '灵植修', desc: '灵植之道，草木皆兵', bonus: { cultivation_mult: 0.10, hp_regen_pct: 0.005, max_hp_pct: 0.08 } },
      ]
    },
    {
      id: 'cat_other', name: '其他', desc: '殊途同归，各有千秋',
      items: [
        { id: 'other_buddha', name: '佛修', desc: '明心见性，金刚不坏', bonus: { defense_pct: 0.12, max_hp_pct: 0.15, hp_regen_pct: 0.008 } },
        { id: 'other_demon',  name: '魔修', desc: '以魔入道，逆天改命', bonus: { attack_pct: 0.18, crit_damage: 0.25, life_steal: 0.05 } },
        { id: 'other_music',  name: '音修', desc: '音杀之术，摄魂夺魄', bonus: { crit_rate: 0.08, defense_break: 0.10, crit_damage: 0.15 } },
        { id: 'other_monster', name: '妖修', desc: '妖族血脉，天赋异禀', bonus: { attack_pct: 0.12, defense_pct: 0.08, life_steal: 0.06 } },
        { id: 'other_flora',  name: '草木修', desc: '草木之灵，长生久视', bonus: { cultivation_mult: 0.12, hp_regen_pct: 0.006, max_hp_pct: 0.10 } },
      ]
    },
  ],

  // Helper: find a profession item by id across all categories
  getProfession(id) {
    for (const cat of this.professionCategories) {
      const item = cat.items.find(i => i.id === id);
      if (item) return item;
    }
    return null;
  },

  // ---- Talents (天赋) — pick 5 at new game ----
  talents: [
    // 修炼 (Cultivation) — 10
    { id: 'tal_cult_spiritvein',   name: '天生灵脉', desc: '灵脉天成，修炼速度+8%',   category: '修炼', rarity: 'uncommon', stats: { cultivation_mult: 0.08 } },
    { id: 'tal_cult_epiphany',     name: '顿悟之体', desc: '偶有顿悟，修炼速度+12%',  category: '修炼', rarity: 'rare',     stats: { cultivation_mult: 0.12 } },
    { id: 'tal_cult_seclusion',    name: '闭关天赋', desc: '离线收益上限+50%，闭关修炼速度+5%', category: '修炼', rarity: 'uncommon', stats: { cultivation_mult: 0.05 }, modifiers: { offlineCapHours: 36 } },
    { id: 'tal_cult_resonance',    name: '灵气共鸣', desc: '聚灵阵效果+20%',          category: '修炼', rarity: 'uncommon', modifiers: { arrayBonusMult: 1.2 } },
    { id: 'tal_cult_meditation',   name: '打坐奇才', desc: '神识回复速度+50%',         category: '修炼', rarity: 'uncommon', stats: { spiritRegenMult: 0.5 } },
    { id: 'tal_cult_breathing',    name: '吐纳术',   desc: '修炼速度+5%，神识+10',     category: '修炼', rarity: 'common',    stats: { cultivation_mult: 0.05, maxSpirit: 10 } },
    { id: 'tal_cult_daoxin',       name: '道心通明', desc: '突破失败修为惩罚-30%',      category: '修炼', rarity: 'rare',     modifiers: { breakthroughPenaltyMult: 0.7 } },
    { id: 'tal_cult_innatebone',   name: '先天道骨', desc: '修炼速度+6%，突破成功率+3%', category: '修炼', rarity: 'rare',     stats: { cultivation_mult: 0.06 }, modifiers: { breakthroughBonusRate: 0.03 } },
    { id: 'tal_cult_spiritroot',   name: '灵根觉醒', desc: '修炼速度+10%',             category: '修炼', rarity: 'rare',     stats: { cultivation_mult: 0.10 } },
    { id: 'tal_cult_daoaffinity',  name: '大道亲和', desc: '修炼速度+4%，暴击率+3%',    category: '修炼', rarity: 'uncommon', stats: { cultivation_mult: 0.04, critRate: 0.03 } },

    // 战斗 (Combat) — 8
    { id: 'tal_combat_killing',    name: '杀伐果断', desc: '攻击+8%，暴击伤害+10%',     category: '战斗', rarity: 'uncommon', stats: { attack_pct: 0.08, critDamage: 0.10 } },
    { id: 'tal_combat_ironbone',   name: '铁骨铮铮', desc: '防御+10%，生命+8%',        category: '战斗', rarity: 'uncommon', stats: { defense_pct: 0.10, max_hp_pct: 0.08 } },
    { id: 'tal_combat_lethal',     name: '致命一击', desc: '暴击率+6%，暴击伤害+15%',   category: '战斗', rarity: 'rare',     stats: { critRate: 0.06, critDamage: 0.15 } },
    { id: 'tal_combat_immortal',   name: '不灭金身', desc: '生命+15%，生命回复+0.3%',   category: '战斗', rarity: 'rare',     stats: { max_hp_pct: 0.15, hp_regen_pct: 0.003 } },
    { id: 'tal_combat_bloodthirst', name: '嗜血本性', desc: '吸血+5%，攻击+5%',        category: '战斗', rarity: 'uncommon', stats: { lifeSteal: 0.05, attack_pct: 0.05 } },
    { id: 'tal_combat_armorbreak', name: '破甲专家', desc: '破甲+8%，攻击+4%',        category: '战斗', rarity: 'rare',     stats: { defenseBreak: 0.08, attack_pct: 0.04 } },
    { id: 'tal_combat_counter',    name: '反击之道', desc: '防御+8%，吸血+3%',         category: '战斗', rarity: 'uncommon', stats: { defense_pct: 0.08, lifeSteal: 0.03 } },
    { id: 'tal_combat_berserker',  name: '战斗狂人', desc: '攻击+12%，防御-3%',        category: '战斗', rarity: 'uncommon', stats: { attack_pct: 0.12, defense_pct: -0.03 } },

    // 财运 (Economy) — 8
    { id: 'tal_econ_rich',         name: '富贵命',   desc: '初始灵石×3（300灵石）',     category: '财运', rarity: 'rare',     modifiers: { startStoneMult: 3 } },
    { id: 'tal_econ_miner',        name: '灵石矿脉', desc: '被动灵石收入+30%',          category: '财运', rarity: 'uncommon', modifiers: { stoneIncomeMult: 1.3 } },
    { id: 'tal_econ_merchant',     name: '商人血脉', desc: '商店价格-15%',              category: '财运', rarity: 'rare',     modifiers: { shopCostMult: 0.85 } },
    { id: 'tal_econ_frugal',       name: '节俭修行', desc: '商店价格-10%，传送费-20%',  category: '财运', rarity: 'uncommon', modifiers: { shopCostMult: 0.90, travelCostMult: 0.80 } },
    { id: 'tal_econ_looter',       name: '拾金不昧', desc: '探索掉落+30%',              category: '财运', rarity: 'uncommon', modifiers: { exploreLootMult: 1.3 } },
    { id: 'tal_econ_senses',       name: '灵石感知', desc: '灵石收入+20%，探索掉落+15%', category: '财运', rarity: 'uncommon', modifiers: { stoneIncomeMult: 1.2, exploreLootMult: 1.15 } },
    { id: 'tal_econ_tycoon',       name: '理财高手', desc: '灵石收入+50%，商店价格-10%', category: '财运', rarity: 'epic',     modifiers: { stoneIncomeMult: 1.5, shopCostMult: 0.90 } },
    { id: 'tal_econ_kunyuan',      name: '坤元福将', desc: '灵石收入+15%，灵植产量+30%', category: '财运', rarity: 'uncommon', modifiers: { stoneIncomeMult: 1.15, gardenYieldMult: 1.3 } },

    // 奇遇 (Luck) — 8
    { id: 'tal_luck_fortune',      name: '福星高照', desc: '天材地宝发现率×1.5',       category: '奇遇', rarity: 'rare',     modifiers: { exploreTreasureMult: 1.5 } },
    { id: 'tal_luck_encounter',    name: '奇遇体质', desc: '奇遇概率+30%',              category: '奇遇', rarity: 'uncommon', modifiers: { encounterRateMult: 1.3 } },
    { id: 'tal_luck_destiny',      name: '天命之人', desc: '天材发现率×1.3，奇遇+20%',  category: '奇遇', rarity: 'rare',     modifiers: { exploreTreasureMult: 1.3, encounterRateMult: 1.2 } },
    { id: 'tal_luck_greatluck',    name: '鸿运当头', desc: '突破成功率+5%',             category: '奇遇', rarity: 'rare',     modifiers: { breakthroughBonusRate: 0.05 } },
    { id: 'tal_luck_chances',      name: '机缘巧合', desc: '天材发现率×1.8，灵石收入-10%', category: '奇遇', rarity: 'rare', modifiers: { exploreTreasureMult: 1.8, stoneIncomeMult: 0.9 } },
    { id: 'tal_luck_deepfate',     name: '仙缘深厚', desc: '奇遇概率+50%',              category: '奇遇', rarity: 'rare',     modifiers: { encounterRateMult: 1.5 } },
    { id: 'tal_luck_shield',       name: '神秘庇护', desc: '天材发现率×1.2，生命+10%',   category: '奇遇', rarity: 'uncommon', stats: { max_hp_pct: 0.10 }, modifiers: { exploreTreasureMult: 1.2 } },
    { id: 'tal_luck_fatewheel',    name: '命运之轮', desc: '突破+3%，天材发现率×1.2',    category: '奇遇', rarity: 'uncommon', modifiers: { breakthroughBonusRate: 0.03, exploreTreasureMult: 1.2 } },

    // 炼制 (Crafting) — 6
    { id: 'tal_craft_pilltalent',   name: '丹道天赋', desc: '炼丹成功率+10%',            category: '炼制', rarity: 'uncommon', modifiers: { alchemyBonusRate: 0.10 } },
    { id: 'tal_craft_forgetalent',  name: '器道天赋', desc: '炼器成功率+10%',            category: '炼制', rarity: 'uncommon', modifiers: { forgeBonusRate: 0.10 } },
    { id: 'tal_craft_pillmaster',   name: '炼丹奇才', desc: '炼丹成功率+15%',            category: '炼制', rarity: 'rare',     modifiers: { alchemyBonusRate: 0.15 } },
    { id: 'tal_craft_forgemaster',  name: '炼器奇才', desc: '炼器成功率+15%',            category: '炼制', rarity: 'rare',     modifiers: { forgeBonusRate: 0.15 } },
    { id: 'tal_craft_cleverhand',   name: '巧手',     desc: '炼丹+8%，炼器+8%',          category: '炼制', rarity: 'uncommon', modifiers: { alchemyBonusRate: 0.08, forgeBonusRate: 0.08 } },
    { id: 'tal_craft_tiangong',     name: '天工开物', desc: '炼丹+10%，炼器+10%，商店-5%', category: '炼制', rarity: 'rare', modifiers: { alchemyBonusRate: 0.10, forgeBonusRate: 0.10, shopCostMult: 0.95 } },

    // 探索 (Exploration) — 5
    { id: 'tal_exp_walker',        name: '行万里路', desc: '传送费用-30%',              category: '探索', rarity: 'uncommon', modifiers: { travelCostMult: 0.7 } },
    { id: 'tal_exp_perception',    name: '灵识超群', desc: '神识+25，神识回复+30%',      category: '探索', rarity: 'rare',     stats: { maxSpirit: 25, spiritRegenMult: 0.3 } },
    { id: 'tal_exp_fengshui',      name: '风水大师', desc: '探索掉落+20%，天材发现×1.2', category: '探索', rarity: 'uncommon', modifiers: { exploreLootMult: 1.2, exploreTreasureMult: 1.2 } },
    { id: 'tal_exp_herbsense',     name: '草木感知', desc: '灵植产量+50%',              category: '探索', rarity: 'rare',     modifiers: { gardenYieldMult: 1.5 } },
    { id: 'tal_exp_treasurehunter', name: '寻宝猎人', desc: '天材地宝发现率×2',         category: '探索', rarity: 'epic',     modifiers: { exploreTreasureMult: 2.0 } },

    // 特殊 (Special) — 7
    { id: 'tal_spc_innatebody',    name: '先天道体', desc: '攻击/防御/生命各+3%',       category: '特殊', rarity: 'epic',     stats: { attack_pct: 0.03, defense_pct: 0.03, max_hp_pct: 0.03 } },
    { id: 'tal_spc_undying',       name: '不死之身', desc: '生命回复+0.8%，生命+10%',    category: '特殊', rarity: 'rare',     stats: { hp_regen_pct: 0.008, max_hp_pct: 0.10 } },
    { id: 'tal_spc_resilience',    name: '灵魂韧性', desc: '突破失败惩罚-50%',           category: '特殊', rarity: 'rare',     modifiers: { breakthroughPenaltyMult: 0.5 } },
    { id: 'tal_spc_favored',       name: '天道眷顾', desc: '修炼+3%，突破+2%，天材×1.1', category: '特殊', rarity: 'rare',     stats: { cultivation_mult: 0.03 }, modifiers: { breakthroughBonusRate: 0.02, exploreTreasureMult: 1.1 } },
    { id: 'tal_spc_allofthings',   name: '万物之灵', desc: '神识+20，修炼+4%，回复+0.2%', category: '特殊', rarity: 'uncommon', stats: { maxSpirit: 20, cultivation_mult: 0.04, hp_regen_pct: 0.002 } },
    { id: 'tal_spc_reincarnated',  name: '转世修士', desc: '初始修为+500',              category: '特殊', rarity: 'rare',     modifiers: { startCultivation: 500 } },
    { id: 'tal_spc_riseandfall',   name: '破而后立', desc: '突破成功率+8%，失败惩罚+50%', category: '特殊', rarity: 'rare', modifiers: { breakthroughBonusRate: 0.08, breakthroughPenaltyMult: 1.5 } },
  ],

  birthplaces: [
    {
      id: 'bp_north', regionId: 'r_north', name: '北冥寒城', faction: '北冥阵宗',
      desc: '生于万载冰川之畔，自幼饮玄冰泉、习驭灵阵法。体魄坚韧，神识澄澈。',
      bonus: { defense_pct: 0.05, maxSpirit: 20 },
      startItems: { lingcao: 5, bingxin_lian: 1, lingshi: 200 },
      startFavor: { qingyun: 5, lingxu: 10 },
      sectAffinity: 'lingxu',
    },
    {
      id: 'bp_east', regionId: 'r_east', name: '青霄药谷', faction: '百草丹宗',
      desc: '生于万木林海之中，自幼采百草、辨药性。天生通晓草木灵韵，炼丹有成。',
      bonus: { alchemy_bonus: 0.10 },
      startItems: { lingcao: 15, qixin_cao: 3, huoyan_zhi: 2, lingshi: 100 },
      startFavor: { qingyun: 10 },
      sectAffinity: 'qingyun',
    },
    {
      id: 'bp_south', regionId: 'r_south', name: '焚天古国', faction: '焚天器宗',
      desc: '生于无尽火山群中，自幼浴火淬体，性格刚烈。攻伐之道天赋异禀。',
      bonus: { attack_pct: 0.08 },
      startItems: { huoxin_jin: 2, xiulian_dan: 5, lingshi: 150 },
      startFavor: { tiangang: 10, xuantian: 5 },
      sectAffinity: 'xuantian',
    },
    {
      id: 'bp_west', regionId: 'r_west', name: '苍梧古国', faction: '金皇剑宗',
      desc: '生于龙沙商港之畔，自幼随商队走南闯北，识尽天下宝物。炼器一道独步。',
      bonus: { forge_bonus: 0.10 },
      startItems: { xuantie: 8, kuangmai: 3, lingshi: 500 },
      startFavor: { tiangang: 5, qingyun: 5 },
      sectAffinity: 'tiangang',
    },
    {
      id: 'bp_center', regionId: 'r_center', name: '鸿蒙道源陆', faction: '九宸天道院',
      desc: '生于天地正中，受先天灵气滋养。资质平衡，万道皆通。',
      bonus: { cultivation_mult: 0.05, attack_pct: 0.03, defense_pct: 0.03 },
      startItems: { xiulian_dan: 3, lingcao: 5, lingshi: 300 },
      startFavor: { qingyun: 5, tiangang: 5, lingxu: 5, xuantian: 5 },
      sectAffinity: null,
    },
    {
      id: 'bp_polar', regionId: 'r_polar', name: '焚天禁地·孤儿', faction: '无',
      desc: '生于南极绝地，孤身长大。修途坎坷，但意志如铁，机缘亦多。',
      bonus: { cultivation_mult: 0.10, max_hp_pct: 0.10 },
      startItems: { lingshi: 50, huixue_dan: 3 },
      startFavor: {},
      sectAffinity: null,
    },
  ],

  // ===========================================================
  // FAVORABILITY (好感) — NPCs and ranks
  // ===========================================================
  favorRanks: [
    { min: -100, name: '仇视', color: '#d04030', shopMult: 1.5 },
    { min: -30,  name: '冷淡', color: '#888888', shopMult: 1.2 },
    { min: 0,    name: '陌生', color: '#aaaaaa', shopMult: 1.0 },
    { min: 30,   name: '友善', color: '#7be08a', shopMult: 0.95 },
    { min: 60,   name: '亲近', color: '#88c4ff', shopMult: 0.90 },
    { min: 100,  name: '信任', color: '#c896ff', shopMult: 0.85 },
    { min: 200,  name: '挚友', color: '#ffd070', shopMult: 0.80 },
    { min: 500,  name: '生死之交', color: '#ff96d6', shopMult: 0.70 },
  ],

  npcs: [
    { id: 'npc_qingyun_master', name: '青云宗 · 玄机真人', sect: 'qingyun', role: '掌门',
      desc: '青云宗执掌长老，剑道宗师。',
      gifts: { tiannian_lingyao: 5, longwen_heijin: 10, jiangchen_dan: 8 } },
    { id: 'npc_tiangang_master', name: '天罡门 · 铁拳道君', sect: 'tiangang', role: '掌门',
      desc: '体修圣地之主，金身万劫不坏。',
      gifts: { kuangmai: 3, longwen_heijin: 10, huti_dan: 4 } },
    { id: 'npc_lingxu_master', name: '灵虚阁 · 妙音仙子', sect: 'lingxu', role: '阁主',
      desc: '灵虚阁主，精通御灵之术。',
      gifts: { lingcao: 3, julingshi_dan: 6, butian_dan: 12 } },
    { id: 'npc_xuantian_master', name: '玄天宗 · 符圣老祖', sect: 'xuantian', role: '宗主',
      desc: '符道大宗师，制符无所不能。',
      gifts: { kuangmai: 4, leiyin_shi: 12, longwen_heijin: 10 } },
    { id: 'npc_trader', name: '神秘行商 · 老黑', sect: null, role: '行商',
      desc: '行走九域的神秘商人，什么都卖。',
      gifts: { lingshi: 1, hundun_yuanshi: 20, xianjin: 50 } },
    { id: 'npc_alchemist', name: '丹道宗师 · 玄丹子', sect: null, role: '丹师',
      desc: '隐居药谷的丹道大家，可指点炼丹。',
      gifts: { lingcao: 2, wanlian_shen: 8, zihua_guo: 5 } },
    { id: 'npc_forger', name: '器道宗师 · 古铸翁', sect: null, role: '器师',
      desc: '隐居器山的炼器大家，可指点炼器。',
      gifts: { xuantie: 1, huoxin_jin: 5, longwen_heijin: 8 } },
    { id: 'npc_oracle', name: '观天台 · 测真道人', sect: null, role: '观主',
      desc: '观天台主，可窥天机洞玄机。',
      gifts: { lingshi: 5, butian_dan: 10, dujie_dan: 30 } },
  ],

  // ---- Random NPC generation ----
  npcSurnames: ['李','王','张','刘','陈','杨','赵','黄','周','吴','徐','孙','胡','朱','高','林','何','郭','马','罗','梁','宋','郑','谢','韩','唐','冯','于','董','萧','程','曹','袁','邓','许','傅','沈','曾','彭','吕','苏','卢','蒋','蔡','贾','丁','魏','薛','叶','阎','余','潘','杜','戴','夏','钟','汪','田','任','姜','范','方','石','姚','谭','廖','邹','熊','金','陆','郝','孔','白','崔','康','毛','邱','秦','江','史','顾','侯','邵','孟','龙','万','段','雷','钱','汤','尹','黎','易','常','武','乔','贺','赖','龚','文'],
  npcGivenNames: ['天行','无极','清风','明月','紫烟','青霜','云霄','星辰','玄光','飞鸿','灵均','若水','归真','正阳','承恩','守一','明德','致远','思源','玄机','妙音','仙儿','玉颜','龙翔','凤鸣','虎啸','鹤轩','剑心','一凡','逸尘','凌波','破军','逍遥','自在','长风','望月','听雨','落霞','流云','惊鸿','浩然','正气','秋水','春风','暮雪','朝露','寒星','烈焰','冰魄','幽兰','翠竹','苍穹','碧落','黄泉','紫霄','金莲','银叶','玄武','朱雀','白虎','青龙','天机','地煞','人杰','鬼谷','神算','仙游','道衍','佛心','儒风','墨影','法正','医圣','药王','剑圣','刀皇','拳霸','掌尊','符灵','阵魂'],
  npcRoles: ['内门弟子','外门弟子','杂役弟子','长老','执事','护法','传功弟子','炼丹师','炼器师','阵法师','药师','巡山弟子','守卫','管事','书记'],
  npcDescs: [
    '性格沉稳，不善言辞，但做事可靠。',
    '喜欢独来独往，行踪不定。',
    '热情好客，经常帮助同门。',
    '沉默寡言，实力深藏不露。',
    '喜欢收集各种灵药和丹方。',
    '擅长炼器，手艺精湛。',
    '爱好品茗论道，人缘极好。',
    '个性古怪，不按常理出牌。',
    '天资聪颖，修为进展神速。',
    '为人低调，从不炫耀实力。',
    '表面冷淡，内心重情重义。',
    '精通阵法，常在山中闭关。',
    '游历四方，见多识广。',
    '勤奋刻苦，日夜修炼不辍。',
    '性格豪爽，喜欢结交朋友。',
  ],
  // Items suitable as random NPC gifts (item pool + max favor gain)
  npcGiftPool: {
    lingcao: 2, kuangmai: 2, xuantie: 1, qixin_cao: 1, lingshi: 1,
    tiannian_lingyao: 5, huoyan_zhi: 3, bingxin_lian: 4, kuangmai: 2,
    huoxin_jin: 4, leiyin_shi: 6, zihua_guo: 4, julingshi_dan: 3,
    xiulian_dan: 2,
  },

  // Sect leave cooldown (real seconds before a player can rejoin/switch)
  sectSwitchCooldown: 600, // 10 minutes

  // Sect region & affiliation mapping (determines trial difficulty)
  sectRegionMap: {
    qingyun:  { region: 'four_domain', affiliated: true },   // 四域附属 → 练气
    tiangang: { region: 'four_domain', affiliated: false },  // 四域非附属 → 金丹
    lingxu:   { region: 'kunyuan',     affiliated: true },   // 坤元附属 → 元婴
    wanjian:  { region: 'kunyuan',     affiliated: false },  // 坤元非附属 → 炼虚
    xuantian: { region: 'center',      affiliated: true },   // 中央附属 → 合体
    taiyi:    { region: 'center',      affiliated: false },  // 中央非附属 → 大乘
  },

  // Sect trial opponents — must defeat all to rank #1 and join
  sectTrialOpponents: [
    {
      sectId: 'qingyun',
      opponents: [
        { name: '青云杂役 · 周剑生', hp: 120, attack: 12, defense: 6 },
        { name: '青云外门 · 柳轻风', hp: 220, attack: 22, defense: 11 },
        { name: '青云内门 · 赵无极', hp: 350, attack: 35, defense: 18 },
        { name: '青云首席 · 白剑鸣', hp: 450, attack: 48, defense: 24 },
      ]
    },
    {
      sectId: 'tiangang',
      opponents: [
        { name: '天罡外门 · 铁臂张', hp: 8000, attack: 600, defense: 300 },
        { name: '天罡内门 · 石破天', hp: 14000, attack: 1000, defense: 500 },
        { name: '天罡亲传 · 金刚虎', hp: 22000, attack: 1600, defense: 800 },
        { name: '天罡首席 · 雷霆怒', hp: 28000, attack: 2000, defense: 1000 },
      ]
    },
    {
      sectId: 'lingxu',
      opponents: [
        { name: '灵虚外门 · 云霞子', hp: 70000, attack: 4500, defense: 2200 },
        { name: '灵虚内门 · 紫阳真人', hp: 130000, attack: 8000, defense: 4000 },
        { name: '灵虚亲传 · 太虚道人', hp: 220000, attack: 13000, defense: 6500 },
        { name: '灵虚首席 · 青莲剑仙', hp: 280000, attack: 17000, defense: 8500 },
      ]
    },
    {
      sectId: 'wanjian',
      opponents: [
        { name: '万剑杂役 · 陈锋', hp: 4500000, attack: 220000, defense: 110000 },
        { name: '万剑外门 · 楚归剑', hp: 6500000, attack: 350000, defense: 170000 },
        { name: '万剑内门 · 萧无剑', hp: 8000000, attack: 450000, defense: 220000 },
        { name: '万剑首席 · 剑圣·陆沉', hp: 10000000, attack: 550000, defense: 280000 },
      ]
    },
    {
      sectId: 'xuantian',
      opponents: [
        { name: '玄天外门 · 符师·王箓', hp: 18000000, attack: 900000, defense: 450000 },
        { name: '玄天内门 · 天符真人', hp: 28000000, attack: 1400000, defense: 700000 },
        { name: '玄天亲传 · 万法道人', hp: 38000000, attack: 1800000, defense: 900000 },
        { name: '玄天首席 · 符祖·张道陵', hp: 48000000, attack: 2300000, defense: 1150000 },
      ]
    },
    {
      sectId: 'taiyi',
      opponents: [
        { name: '太一外门 · 道子·苏明', hp: 70000000, attack: 3500000, defense: 1750000 },
        { name: '太一内门 · 天机真人', hp: 110000000, attack: 5500000, defense: 2700000 },
        { name: '太一亲传 · 混元道君', hp: 150000000, attack: 7500000, defense: 3700000 },
        { name: '太一首席 · 太上掌教', hp: 200000000, attack: 10000000, defense: 5000000 },
      ]
    },
  ],
};

// ============================================================
// WORLD MAP OVERRIDE — 十域大地图、区域光点、四域出生天赋
// ============================================================
GameData.worldRegions = [
  { id: 'r_north_pole', name: '北极 · 冰封禁地', x: 0.48, y: 0.08, color: '#9fdcff', map: 'r_north_pole', type: 'pole' },
  { id: 'r_north', name: '北域 · 玄冰北冥域', x: 0.24, y: 0.23, color: '#88c4ff', map: 'r_north', type: 'domain' },
  { id: 'r_east', name: '东域 · 青霄木灵域', x: 0.79, y: 0.35, color: '#7be08a', map: 'r_east', type: 'domain' },
  { id: 'r_west', name: '西域 · 锐金苍梧域', x: 0.18, y: 0.37, color: '#ffd070', map: 'r_west', type: 'domain' },
  { id: 'r_center', name: '中央域 · 鸿蒙道源陆', x: 0.50, y: 0.52, color: '#e8ddb5', map: 'r_center', type: 'center' },
  { id: 'r_kunyuan', name: '坤元域 · 厚土坤元域', x: 0.37, y: 0.44, color: '#cfb35f', map: 'r_kunyuan', type: 'inner' },
  { id: 'r_east_pole', name: '东极 · 归墟禁地', x: 0.92, y: 0.54, color: '#c08cff', map: 'r_east_pole', type: 'pole' },
  { id: 'r_west_pole', name: '西极 · 碎空禁地', x: 0.06, y: 0.53, color: '#b18cff', map: 'r_west_pole', type: 'pole' },
  { id: 'r_south', name: '南域 · 离火炎疆域', x: 0.70, y: 0.80, color: '#ff7a3a', map: 'r_south', type: 'domain' },
  { id: 'r_south_pole', name: '南极 · 焚天禁地', x: 0.50, y: 0.92, color: '#ff4f37', map: 'r_south_pole', type: 'pole' },
];

GameData.regionPlaces = {
  r_north: [
    { id: 'north_xuanwu_gate', name: '玄武门', x: 0.47, y: 0.92, primary: true, targetRegionId: 'r_center' },
    { id: 'north_beiming_sea', name: '北冥海域', x: 0.47, y: 0.30 },
    { id: 'north_xuanbing_island', name: '玄冰岛', x: 0.50, y: 0.40 },
    { id: 'north_beiming_sect', name: '北冥阵宗', x: 0.20, y: 0.35 },
    { id: 'north_shuilong_palace', name: '水皇龙宫', x: 0.76, y: 0.34 },
    { id: 'north_bingpo_valley', name: '冰魄谷', x: 0.50, y: 0.58 },
    { id: 'north_bingshou_town', name: '水守镇', x: 0.18, y: 0.63 },
    { id: 'north_xuanbing_bridge', name: '玄冰连桥', x: 0.39, y: 0.63 },
    { id: 'north_beixuan_dynasty', name: '北玄王朝', x: 0.70, y: 0.76 },
    { id: 'north_ice_abyss', name: '冰海秘境', x: 0.92, y: 0.56 },
  ],
  r_south: [
    { id: 'south_zhuque_gate', name: '朱雀门', x: 0.50, y: 0.08, primary: true, targetRegionId: 'r_center' },
    { id: 'south_yanhuang_palace', name: '炎皇殿', x: 0.17, y: 0.32 },
    { id: 'south_fentian_sect', name: '焚天器宗', x: 0.52, y: 0.43 },
    { id: 'south_chiyan_court', name: '赤炎王庭', x: 0.18, y: 0.58 },
    { id: 'south_xueyan_demon', name: '血焰魔宗', x: 0.78, y: 0.59 },
    { id: 'south_fentian_pass', name: '焚天关', x: 0.50, y: 0.52 },
    { id: 'south_fire_source', name: '焚天火源', x: 0.50, y: 0.42 },
    { id: 'south_lava_sea', name: '熔浆星海', x: 0.50, y: 0.90 },
    { id: 'south_seal_land', name: '封印之地', x: 0.82, y: 0.34 },
    { id: 'south_wall', name: '南极壁垒', x: 0.50, y: 0.68 },
  ],
  r_west: [
    { id: 'west_white_tiger_gate', name: '白虎关', x: 0.85, y: 0.16, primary: true, targetRegionId: 'r_center' },
    { id: 'west_golden_sword', name: '金皇剑宗', x: 0.40, y: 0.25 },
    { id: 'west_cangwu', name: '苍梧古国', x: 0.26, y: 0.42 },
    { id: 'west_pojun_camp', name: '破军营', x: 0.29, y: 0.62 },
    { id: 'west_longsha_harbor', name: '龙沙商港', x: 0.49, y: 0.72 },
    { id: 'west_liusha_court', name: '流沙王庭', x: 0.66, y: 0.68 },
    { id: 'west_liusha_sea', name: '流沙瀚海', x: 0.67, y: 0.31 },
    { id: 'west_black_wall', name: '黑风戈壁', x: 0.82, y: 0.40 },
    { id: 'west_void_gate', name: '碎空裂隙', x: 0.08, y: 0.50 },
  ],
  r_east: [
    { id: 'east_green_dragon_gate', name: '青龙门', x: 0.07, y: 0.41, primary: true, targetRegionId: 'r_center' },
    { id: 'east_qingdi_gate', name: '青帝门', x: 0.34, y: 0.18 },
    { id: 'east_baicao_sect', name: '百草丹宗', x: 0.40, y: 0.52 },
    { id: 'east_qingmu_dynasty', name: '青木皇朝', x: 0.70, y: 0.38 },
    { id: 'east_donglai', name: '东莱海国', x: 0.62, y: 0.59 },
    { id: 'east_poison_valley', name: '千毒谷', x: 0.36, y: 0.70 },
    { id: 'east_wood_sea', name: '万木林海', x: 0.48, y: 0.37 },
    { id: 'east_marsh', name: '东莱沼泽群', x: 0.57, y: 0.78 },
    { id: 'east_ruins', name: '东极归墟禁地', x: 0.91, y: 0.53 },
  ],
  r_center: [
    { id: 'center_tiandao_academy', name: '九宸天道院', x: 0.50, y: 0.42, primary: true },
    { id: 'center_wendao_platform', name: '问道台', x: 0.50, y: 0.53 },
    { id: 'center_tianji_library', name: '天机书院', x: 0.50, y: 0.63 },
    { id: 'center_taixuan', name: '太一别院', x: 0.39, y: 0.26 },
    { id: 'center_xuanhuang', name: '玄黄道宫', x: 0.59, y: 0.25 },
    { id: 'center_jiuchen', name: '九宸别院', x: 0.34, y: 0.42 },
    { id: 'center_zixiao', name: '紫霄别院', x: 0.66, y: 0.43 },
    { id: 'center_xiantian_plain', name: '先天灵土平原', x: 0.52, y: 0.74 },
    { id: 'center_daoyun', name: '道尊秘境', x: 0.20, y: 0.54 },
    { id: 'center_yaowang', name: '药王谷秘境', x: 0.78, y: 0.55 },
    { id: 'center_north_bridge', name: '北虹桥 · 玄玄门', x: 0.50, y: 0.08, targetRegionId: 'r_north' },
    { id: 'center_south_bridge', name: '南虹桥 · 朱雀门', x: 0.50, y: 0.89, targetRegionId: 'r_south' },
    { id: 'center_west_bridge', name: '西虹桥 · 白虎门', x: 0.08, y: 0.51, targetRegionId: 'r_west' },
    { id: 'center_east_bridge', name: '东虹桥 · 青龙门', x: 0.91, y: 0.51, targetRegionId: 'r_east' },
  ],
  r_kunyuan: [
    { id: 'kunyuan_sovereign_city', name: '土皇圣城', x: 0.50, y: 0.49, primary: true },
    { id: 'kunyuan_tuhuang_ge', name: '土皇阁', x: 0.22, y: 0.18 },
    { id: 'kunyuan_wannong', name: '万农宗', x: 0.74, y: 0.17 },
    { id: 'kunyuan_dynasty', name: '坤元王朝', x: 0.25, y: 0.54 },
    { id: 'kunyuan_yushou', name: '御兽宗', x: 0.73, y: 0.58 },
    { id: 'kunyuan_plain', name: '坤元大平原', x: 0.50, y: 0.56 },
    { id: 'kunyuan_mountain', name: '坤元山脉', x: 0.50, y: 0.35 },
    { id: 'kunyuan_zhenjie', name: '镇界关 · 玄土关', x: 0.51, y: 0.10, targetRegionId: 'r_center' },
    { id: 'kunyuan_herb_market', name: '万民市集', x: 0.47, y: 0.66 },
    { id: 'kunyuan_pasture', name: '灵兽牧场', x: 0.63, y: 0.72 },
    { id: 'kunyuan_mine', name: '玄土矿脉', x: 0.33, y: 0.78 },
    { id: 'kunyuan_north_bridge', name: '北虹桥 · 玄武门', x: 0.17, y: 0.08, targetRegionId: 'r_north' },
    { id: 'kunyuan_west_bridge', name: '西虹桥 · 白虎门', x: 0.07, y: 0.45, targetRegionId: 'r_west' },
    { id: 'kunyuan_east_bridge', name: '东虹桥 · 青龙门', x: 0.91, y: 0.45, targetRegionId: 'r_east' },
    { id: 'kunyuan_south_bridge', name: '前虹桥 · 朱雀门', x: 0.50, y: 0.86, targetRegionId: 'r_south' },
  ],
  r_north_pole: [
    { id: 'north_pole_source', name: '冰封之源', x: 0.52, y: 0.32, primary: true },
    { id: 'north_pole_wanzai', name: '无尽万载玄冰', x: 0.48, y: 0.10 },
    { id: 'north_pole_xuanbing_temple', name: '玄冰神殿', x: 0.86, y: 0.32 },
    { id: 'north_pole_lock', name: '封神锁链', x: 0.88, y: 0.22 },
    { id: 'north_pole_yongji', name: '永寂冰原', x: 0.75, y: 0.38 },
    { id: 'north_pole_cold_valley', name: '寒狱裂谷', x: 0.76, y: 0.46 },
    { id: 'north_pole_wall', name: '北极壁垒', x: 0.50, y: 0.70 },
    { id: 'north_pole_town', name: '北极镇守要塞', x: 0.50, y: 0.76 },
    { id: 'north_pole_frozen_sea', name: '寒渊冰海', x: 0.27, y: 0.78 },
    { id: 'north_pole_secret_left', name: '秘境入口 · 寒渊古宫', x: 0.08, y: 0.34, targetRegionId: 'r_north' },
    { id: 'north_pole_secret_right', name: '秘境入口 · 玄冰神殿', x: 0.91, y: 0.35, targetRegionId: 'r_north' },
  ],
  r_south_pole: [
    { id: 'south_pole_fire_source', name: '焚天火源', x: 0.50, y: 0.42, primary: true },
    { id: 'south_pole_burning_ring', name: '灰烬山环', x: 0.50, y: 0.22 },
    { id: 'south_pole_ritual', name: '焚神祭坛', x: 0.31, y: 0.43 },
    { id: 'south_pole_demon_nest', name: '火魔巢域', x: 0.20, y: 0.58 },
    { id: 'south_pole_lava_valley', name: '熔狱裂谷', x: 0.69, y: 0.48 },
    { id: 'south_pole_blood_sect', name: '血焰魔宗', x: 0.73, y: 0.59 },
    { id: 'south_pole_guard_west', name: '赤炎镇守要塞', x: 0.16, y: 0.30 },
    { id: 'south_pole_guard_east', name: '炎狱镇守要塞', x: 0.79, y: 0.49 },
    { id: 'south_pole_wall', name: '南极壁垒', x: 0.49, y: 0.70 },
    { id: 'south_pole_fentian_gate', name: '焚天之门', x: 0.50, y: 0.82, targetRegionId: 'r_south' },
    { id: 'south_pole_seal', name: '封印之地', x: 0.85, y: 0.34 },
  ],
  r_west_pole: [
    { id: 'west_pole_storm_eye', name: '碎空风暴眼', x: 0.50, y: 0.42, primary: true },
    { id: 'west_pole_wind_ring', name: '裂界风环', x: 0.50, y: 0.27 },
    { id: 'west_pole_demon_nest', name: '虚空妖巢', x: 0.19, y: 0.20 },
    { id: 'west_pole_stone_forest', name: '碎界石林', x: 0.18, y: 0.36 },
    { id: 'west_pole_duankong', name: '断空峡', x: 0.20, y: 0.56 },
    { id: 'west_pole_ruins', name: '裂空古城遗址', x: 0.50, y: 0.67 },
    { id: 'west_pole_fengji', name: '封空锁柱', x: 0.27, y: 0.49 },
    { id: 'west_pole_jinmo', name: '金魔巢域', x: 0.68, y: 0.18 },
    { id: 'west_pole_xulie', name: '虚裂荒原', x: 0.80, y: 0.37 },
    { id: 'west_pole_xunkong', name: '巡空台', x: 0.92, y: 0.45 },
    { id: 'west_pole_guard', name: '西极镇守要塞', x: 0.86, y: 0.20, targetRegionId: 'r_west' },
  ],
  r_east_pole: [
    { id: 'east_pole_black_hole', name: '归墟黑洞', x: 0.50, y: 0.47, primary: true },
    { id: 'east_pole_chaos', name: '无尽乱流海域', x: 0.48, y: 0.15 },
    { id: 'east_pole_zhenyuan', name: '镇渊祭坛', x: 0.47, y: 0.23 },
    { id: 'east_pole_inner_ring', name: '归墟内环', x: 0.48, y: 0.30 },
    { id: 'east_pole_outer_ring', name: '归墟外环', x: 0.49, y: 0.58 },
    { id: 'east_pole_lock', name: '归墟锁链', x: 0.50, y: 0.68 },
    { id: 'east_pole_guard', name: '东极镇守要塞', x: 0.12, y: 0.26, targetRegionId: 'r_east' },
    { id: 'east_pole_patrol_port', name: '巡渊港', x: 0.18, y: 0.47 },
    { id: 'east_pole_tablet_isles', name: '残碑群岛', x: 0.25, y: 0.64 },
    { id: 'east_pole_void_nest', name: '虚空妖巢', x: 0.80, y: 0.53 },
    { id: 'east_pole_mudao', name: '木魔巢域', x: 0.83, y: 0.42 },
    { id: 'east_pole_boundary', name: '封界碑', x: 0.92, y: 0.59 },
  ],
};

GameData.birthplaces = [
  {
    id: 'bp_north', regionId: 'r_north', name: '北域 · 玄冰北冥域', faction: '玄冰神念',
    desc: '北域修士神识如冰锋，可在战斗中洞穿敌人护体灵罡。',
    bonus: { defense_break: 0.12, maxSpirit: 20 },
    startItems: { bingxin_lian: 1, lingcao: 5, lingshi: 1200 },
    startFavor: { lingxu: 10 },
    sectAffinity: 'lingxu',
  },
  {
    id: 'bp_south', regionId: 'r_south', name: '南域 · 离火炎疆域', faction: '离火体修',
    desc: '南域修士以火淬体，筋骨强横，生命根基更厚。',
    bonus: { max_hp_pct: 0.15 },
    startItems: { huoxin_jin: 2, huixue_dan: 3, lingshi: 1200 },
    startFavor: { xuantian: 10 },
    sectAffinity: 'xuantian',
  },
  {
    id: 'bp_west', regionId: 'r_west', name: '西域 · 锐金苍梧域', faction: '锐金剑脉',
    desc: '西域修士攻伐果断，剑气锋锐，攻击与暴击更强。',
    bonus: { attack_pct: 0.15, crit_rate: 0.08, crit_damage: 0.35 },
    startItems: { xuantie: 8, kuangmai: 3, lingshi: 1200 },
    startFavor: { tiangang: 10 },
    sectAffinity: 'tiangang',
  },
  {
    id: 'bp_east', regionId: 'r_east', name: '东域 · 青霄木灵域', faction: '木灵药脉',
    desc: '东域修士草木生机入体，战斗吸血，并缓慢回复生命。',
    bonus: { life_steal: 0.06, hp_regen_pct: 0.01 },
    startItems: { lingcao: 15, qixin_cao: 3, huoyan_zhi: 2, lingshi: 1200 },
    startFavor: { qingyun: 10 },
    sectAffinity: 'qingyun',
  },
];

// ============================================================
// EXPANDED TECHNIQUE GENERATION (外功 / 内功)
// ============================================================

// Technique schools — maps to professions
GameData.techniqueSchools = [
  { id: 'sword',    name: '剑修',   profs: ['martial_sword'] },
  { id: 'blade',    name: '刀修',   profs: ['martial_blade'] },
  { id: 'fist',     name: '拳修',   profs: ['martial_fist'] },
  { id: 'spear',    name: '枪修',   profs: ['martial_spear'] },
  { id: 'palm',     name: '掌指修', profs: ['martial_palm', 'martial_finger'] },
  { id: 'body',     name: '体修',   profs: ['body'] },
  { id: 'qi',       name: '五行术修', profs: ['spell_metal', 'spell_wood', 'spell_water', 'spell_fire', 'spell_earth'] },
  { id: 'pill',     name: '丹修',   profs: ['arts_pill'] },
  { id: 'forge',    name: '器修',   profs: ['arts_forge'] },
  { id: 'talisman', name: '符修',   profs: ['arts_talisman'] },
  { id: 'array',    name: '阵修',   profs: ['arts_array'] },
  { id: 'beast',    name: '兽修',   profs: ['arts_beast'] },
  { id: 'plant',    name: '灵植修', profs: ['arts_plant', 'other_flora'] },
  { id: 'buddha',   name: '佛修',   profs: ['other_buddha'] },
  { id: 'demon',    name: '魔修',   profs: ['other_demon'] },
  { id: 'music',    name: '音修',   profs: ['other_music'] },
  { id: 'monster',  name: '妖修',   profs: ['other_monster'] },
];

// Periods for which we generate techniques (all except 真仙)
const _periods = ['lianqi','zhuji','jindan','yuanying','huashen','lianxu','heti','dacheng','dujie'];
const _periodNames = {
  lianqi:'炼气', zhuji:'筑基', jindan:'金丹', yuanying:'元婴',
  huashen:'化神', lianxu:'炼虚', heti:'合体', dacheng:'大乘', dujie:'渡劫'
};

// Scaling multipliers per period tier (0-8)
const _periodScale = [1, 3, 10, 35, 120, 400, 1200, 4000, 15000];
const _cultScale = [0.03, 0.05, 0.07, 0.10, 0.13, 0.16, 0.20, 0.25, 0.30];

// School-specific outer technique templates
const _outerTemplates = {
  sword:    [{ suf: '剑招', stat: 'attack_pct', base: 0.08, per: 0.02 }, { suf: '剑意', stat: 'crit_rate', base: 0.04, per: 0.015 }],
  blade:    [{ suf: '刀法', stat: 'attack_pct', base: 0.10, per: 0.025 }, { suf: '刀意', stat: 'crit_damage', base: 0.08, per: 0.03 }],
  fist:     [{ suf: '拳法', stat: 'attack_pct', base: 0.09, per: 0.022 }, { suf: '拳意', stat: 'max_hp_pct', base: 0.06, per: 0.018 }],
  spear:    [{ suf: '枪法', stat: 'attack_pct', base: 0.09, per: 0.022 }, { suf: '枪意', stat: 'defense_break', base: 0.04, per: 0.015 }],
  palm:     [{ suf: '掌法', stat: 'attack_pct', base: 0.07, per: 0.02 }, { suf: '指法', stat: 'crit_rate', base: 0.05, per: 0.018 }],
  body:     [{ suf: '炼体术', stat: 'defense_pct', base: 0.10, per: 0.025 }, { suf: '横练功', stat: 'max_hp_pct', base: 0.10, per: 0.03 }],
  qi:       [{ suf: '五行术', stat: 'attack_pct', base: 0.07, per: 0.02 }, { suf: '灵气功', stat: 'defense_pct', base: 0.07, per: 0.02 }],
  pill:     [{ suf: '丹毒术', stat: 'attack_pct', base: 0.06, per: 0.02 }, { suf: '药理功', stat: 'life_steal', base: 0.03, per: 0.01 }],
  forge:    [{ suf: '器甲术', stat: 'defense_pct', base: 0.08, per: 0.025 }, { suf: '锤法', stat: 'attack_pct', base: 0.06, per: 0.02 }],
  talisman: [{ suf: '符剑术', stat: 'attack_pct', base: 0.08, per: 0.022 }, { suf: '御符功', stat: 'crit_rate', base: 0.05, per: 0.015 }],
  array:    [{ suf: '阵攻术', stat: 'attack_pct', base: 0.07, per: 0.02 }, { suf: '阵御功', stat: 'defense_pct', base: 0.08, per: 0.025 }],
  beast:    [{ suf: '兽吼功', stat: 'attack_pct', base: 0.08, per: 0.022 }, { suf: '驭兽术', stat: 'life_steal', base: 0.04, per: 0.012 }],
  plant:    [{ suf: '藤鞭术', stat: 'attack_pct', base: 0.06, per: 0.02 }, { suf: '草木功', stat: 'hp_regen_pct', base: 0.003, per: 0.001 }],
  buddha:   [{ suf: '金刚掌', stat: 'defense_pct', base: 0.10, per: 0.025 }, { suf: '降魔功', stat: 'max_hp_pct', base: 0.08, per: 0.025 }],
  demon:    [{ suf: '魔功', stat: 'attack_pct', base: 0.12, per: 0.03 }, { suf: '噬血术', stat: 'life_steal', base: 0.05, per: 0.015 }],
  music:    [{ suf: '音杀术', stat: 'crit_rate', base: 0.06, per: 0.02 }, { suf: '摄魂功', stat: 'defense_break', base: 0.05, per: 0.015 }],
  monster:  [{ suf: '妖兽变', stat: 'attack_pct', base: 0.10, per: 0.025 }, { suf: '妖血功', stat: 'life_steal', base: 0.05, per: 0.012 }],
};

// School-specific inner technique templates
const _innerTemplates = {
  sword:    [{ suf: '剑心诀', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '剑道心经', stat: 'crit_damage', base: 0.06, per: 0.02 }],
  blade:    [{ suf: '刀意心经', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '霸道心诀', stat: 'attack_pct', base: 0.05, per: 0.015 }],
  fist:     [{ suf: '拳道真经', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '铁壁心法', stat: 'defense_pct', base: 0.05, per: 0.015 }],
  spear:    [{ suf: '枪道心经', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '破甲心法', stat: 'defense_break', base: 0.04, per: 0.012 }],
  palm:     [{ suf: '掌道心经', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '指力心法', stat: 'crit_rate', base: 0.04, per: 0.012 }],
  body:     [{ suf: '体修内功', stat: 'cultivation_mult', base: 0.03, per: 0.012 }, { suf: '不灭心经', stat: 'max_hp_pct', base: 0.06, per: 0.02 }],
  qi:       [{ suf: '五行内功', stat: 'cultivation_mult', base: 0.06, per: 0.02 }, { suf: '灵气心法', stat: 'maxSpirit', base: 5, per: 2 }],
  pill:     [{ suf: '丹道心经', stat: 'cultivation_mult', base: 0.05, per: 0.018 }, { suf: '药理内功', stat: 'hp_regen_pct', base: 0.002, per: 0.001 }],
  forge:    [{ suf: '器道心经', stat: 'cultivation_mult', base: 0.05, per: 0.018 }, { suf: '锻体心法', stat: 'defense_pct', base: 0.04, per: 0.012 }],
  talisman: [{ suf: '符道心经', stat: 'cultivation_mult', base: 0.05, per: 0.018 }, { suf: '灵识心法', stat: 'maxSpirit', base: 8, per: 3 }],
  array:    [{ suf: '阵道心经', stat: 'cultivation_mult', base: 0.06, per: 0.02 }, { suf: '阵基内功', stat: 'defense_pct', base: 0.04, per: 0.012 }],
  beast:    [{ suf: '兽道心经', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '御兽心法', stat: 'life_steal', base: 0.03, per: 0.01 }],
  plant:    [{ suf: '灵植心经', stat: 'cultivation_mult', base: 0.06, per: 0.02 }, { suf: '草木内功', stat: 'hp_regen_pct', base: 0.003, per: 0.001 }],
  buddha:   [{ suf: '佛门心经', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '金刚内功', stat: 'max_hp_pct', base: 0.05, per: 0.015 }],
  demon:    [{ suf: '魔道心经', stat: 'cultivation_mult', base: 0.05, per: 0.018 }, { suf: '嗜血内功', stat: 'life_steal', base: 0.04, per: 0.012 }],
  music:    [{ suf: '音道心经', stat: 'cultivation_mult', base: 0.04, per: 0.015 }, { suf: '摄魂内功', stat: 'defense_break', base: 0.03, per: 0.01 }],
  monster:  [{ suf: '妖道心经', stat: 'cultivation_mult', base: 0.05, per: 0.018 }, { suf: '妖血内功', stat: 'attack_pct', base: 0.05, per: 0.015 }],
};

// Generate techniques programmatically
(function() {
  const schools = Object.keys(_outerTemplates);
  let idCounter = 100;

  for (let pi = 0; pi < _periods.length; pi++) {
    const period = _periods[pi];
    const pName = _periodNames[period];

    for (const school of schools) {
      const sInfo = GameData.techniqueSchools.find(s => s.id === school);
      const sName = sInfo ? sInfo.name : school;

      // Generate 2 outer techniques per school per period
      const outerDefs = _outerTemplates[school];
      for (let ti = 0; ti < outerDefs.length; ti++) {
        const tmpl = outerDefs[ti];
        const id = `te_${school}_${period}_${ti}`;
        const techObj = {
          id,
          name: `${pName}·${sName}${tmpl.suf}`,
          kind: 'outer',
          period,
          school,
          maxLevel: 10,
          effect: {
            stat: tmpl.stat,
            type: tmpl.stat.includes('pct') || tmpl.stat === 'crit_rate' || tmpl.stat === 'crit_damage' ||
                  tmpl.stat === 'defense_break' || tmpl.stat === 'life_steal' || tmpl.stat === 'hp_regen_pct' ? 'flat' : 'flat',
            base: tmpl.base,
            perLevel: tmpl.per,
          },
          cost: Math.floor(200 * _periodScale[pi] * (ti + 1)),
          source: 'technique_shop',
        };
        GameData.techniques.push(techObj);
      }

      // Generate 2 inner techniques per school per period
      const innerDefs = _innerTemplates[school];
      for (let ti = 0; ti < innerDefs.length; ti++) {
        const tmpl = innerDefs[ti];
        const id = `ti_${school}_${period}_${ti}`;
        const techObj = {
          id,
          name: `${pName}·${sName}${tmpl.suf}`,
          kind: 'inner',
          period,
          school,
          maxLevel: 10,
          effect: {
            stat: tmpl.stat,
            type: 'flat',
            base: tmpl.base,
            perLevel: tmpl.per,
          },
          cost: Math.floor(300 * _periodScale[pi] * (ti + 1)),
          source: 'technique_shop',
        };
        GameData.techniques.push(techObj);
      }
    }
  }
})();

GameData.techniqueKindNames = { outer: '外功', inner: '内功' };

// Outer/inner slot limits per realm period
GameData.techniqueSlotLimits = {
  lianqi:   { outer: 2, inner: 1 },
  zhuji:    { outer: 3, inner: 2 },
  jindan:   { outer: 4, inner: 2 },
  yuanying: { outer: 5, inner: 3 },
  huashen:  { outer: 6, inner: 3 },
  lianxu:   { outer: 7, inner: 4 },
  heti:     { outer: 8, inner: 4 },
  dacheng:  { outer: 9, inner: 5 },
  dujie:    { outer: 10, inner: 6 },
};
