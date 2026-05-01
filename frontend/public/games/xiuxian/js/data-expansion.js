// ============================================================
// Data Expansion — integrates deep-research report content
// Adds: herbs, materials, recipes, artifacts, talismans,
//       spirit beasts, spirit plants, named techniques
// ============================================================

(function () {

  // ---- 30 Herbs from Report 1 ----
  const herbs = {
    ningshen_hua:    { name: '宁神花', nameEn: 'Peacebloom', type: 'herb', rarity: 'common', desc: '凝神安识，水属常见草药', element: 'water' },
    hengxin_cao:     { name: '恒心草', nameEn: 'Steadfast Grass', type: 'herb', rarity: 'common', desc: '养气聚元，土属常见草药', element: 'earth' },
    ningxin_cao:     { name: '宁心草', nameEn: 'Mindcalm Herb', type: 'herb', rarity: 'common', desc: '清心振气，走火压制辅药', element: 'water' },
    tianqing_hua:    { name: '天青花', nameEn: 'Skyblue Flower', type: 'herb', rarity: 'common', desc: '活血醒神，火修辅药', element: 'fire' },
    yinyue_hua:      { name: '银月花', nameEn: 'Silver Moon Flower', type: 'herb', rarity: 'common', desc: '固元活血，阴寒系丹药辅材', element: 'water' },
    ningxue_cao:     { name: '凝血草', nameEn: 'Bloodclot Herb', type: 'herb', rarity: 'common', desc: '生息混元，土修、拳修用药', element: 'earth' },
    honglin_cao:     { name: '红绫草', nameEn: 'Red Silk Grass', type: 'herb', rarity: 'common', desc: '培元生息，土火连击流辅药', element: 'fire' },
    dihuang_shen:    { name: '地黄参', nameEn: 'Earth Yellow Ginseng', type: 'herb', rarity: 'common', desc: '御气强土，炼甲丹主药', element: 'earth' },
    shexian_guo:     { name: '蛇涎果', nameEn: 'Snake Saliva Fruit', type: 'herb', rarity: 'common', desc: '聚灵兼具毒性，木毒流药材', element: 'wood' },
    yejiao_teng:     { name: '夜交藤', nameEn: 'Nightvine', type: 'herb', rarity: 'common', desc: '聚元凝神，佛修、魂修辅材', element: 'water' },
    qingling_cao:    { name: '轻灵草', nameEn: 'Light Spirit Grass', type: 'herb', rarity: 'common', desc: '活血养气提身法，指修掌修用药', element: 'wood' },
    jianlu:          { name: '剑芦', nameEn: 'Sword Reed', type: 'herb', rarity: 'uncommon', desc: '振气养剑意，金剑流辅药', element: 'metal' },
    baicao_lu:       { name: '百草露', nameEn: 'Hundred Herb Dew', type: 'herb', rarity: 'uncommon', desc: '调和药性，通用辅药', element: 'wood' },
    butian_zhi:      { name: '补天芝', nameEn: 'Heaven Mending Fungus', type: 'herb', rarity: 'uncommon', desc: '补缺养气生息，土修丹修主药', element: 'earth' },
    shilong_rui:     { name: '石龙芮', nameEn: 'Stone Dragon Rue', type: 'herb', rarity: 'uncommon', desc: '强土定脉，凝土丹辅药', element: 'earth' },
    jiuye_zhi:       { name: '九叶芝', nameEn: 'Nineleaf Fungus', type: 'herb', rarity: 'uncommon', desc: '洗髓御气，体修木修主药', element: 'earth' },
    zihou_hua:       { name: '紫猴花', nameEn: 'Purple Monkey Flower', type: 'herb', rarity: 'uncommon', desc: '解毒，木毒流、妖修辅药', element: 'wood' },
    fulong_shen:     { name: '伏龙参', nameEn: 'Subdued Dragon Ginseng', type: 'herb', rarity: 'uncommon', desc: '强金活血，金修枪修主药', element: 'metal' },
    puti_hua:        { name: '菩提花', nameEn: 'Bodhi Flower', type: 'herb', rarity: 'uncommon', desc: '炼气明心，佛修火修丹修辅药', element: 'fire' },
    jianxin_zhu:     { name: '剑心竹', nameEn: 'Sword Heart Bamboo', type: 'herb', rarity: 'uncommon', desc: '剑意养锋，剑修专属辅药', element: 'metal' },
    huanxin_cao:     { name: '幻心草', nameEn: 'Illusion Heart Grass', type: 'herb', rarity: 'uncommon', desc: '调和御气幻心摄神', element: 'wood' },
    tianling_guo:    { name: '天灵果', nameEn: 'Heaven Spirit Fruit', type: 'herb', rarity: 'uncommon', desc: '定煞聚元，土修魔修辅药', element: 'earth' },
    fengxiang_zhi:   { name: '枫香脂', nameEn: 'Maple Resin', type: 'herb', rarity: 'uncommon', desc: '强木生息，木修灵植流辅药', element: 'wood' },
    longwen_cao:     { name: '龙纹草', nameEn: 'Dragon Pattern Grass', type: 'herb', rarity: 'uncommon', desc: '活血培元，火修枪修器修辅药', element: 'fire' },
    guijiu_cao:      { name: '鬼臼草', nameEn: 'Ghost Basin Herb', type: 'herb', rarity: 'rare', desc: '养魂，魔修魂修符修辅药', element: 'wood' },
    wuliu_gen:       { name: '五柳根', nameEn: 'Five Willow Root', type: 'herb', rarity: 'uncommon', desc: '聚灵振气，水修丹修辅药', element: 'water' },
    longlin_guo:     { name: '龙鳞果', nameEn: 'Dragon Scale Fruit', type: 'herb', rarity: 'uncommon', desc: '锻体聚元，体修妖修主药', element: 'earth' },
    xuening_hua:     { name: '雪凝花', nameEn: 'Snow Condense Flower', type: 'herb', rarity: 'rare', desc: '强水延寿，水修佛修主药', element: 'water' },
    xuanbing_hua:    { name: '玄冰花', nameEn: 'Mystic Ice Flower', type: 'herb', rarity: 'rare', desc: '清心振气寒凝，寒系丹药主药', element: 'water' },
    dengxin_cao:     { name: '灯心草', nameEn: 'Wick Grass', type: 'herb', rarity: 'rare', desc: '强火振气，凝丹底材', element: 'fire' },
  };

  Object.assign(GameData.items, herbs);

  // ---- Herb species for garden (from report 1+2) ----
  const newHerbSpecies = [
    { id: 'ningshen_hua', name: '宁神花', interval: 200, yield: 2, minRealm: 0, seedCost: 30 },
    { id: 'hengxin_cao', name: '恒心草', interval: 220, yield: 2, minRealm: 0, seedCost: 35 },
    { id: 'jianlu', name: '剑芦', interval: 600, yield: 1, minRealm: 3, seedCost: 400 },
    { id: 'baicao_lu', name: '百草露', interval: 500, yield: 2, minRealm: 3, seedCost: 350 },
    { id: 'butian_zhi', name: '补天芝', interval: 1200, yield: 1, minRealm: 5, seedCost: 2000 },
    { id: 'jianxin_zhu', name: '剑心竹', interval: 1000, yield: 1, minRealm: 5, seedCost: 1800 },
    { id: 'xuanbing_hua', name: '玄冰花', interval: 2400, yield: 1, minRealm: 8, seedCost: 10000 },
    { id: 'dengxin_cao', name: '灯心草', interval: 2000, yield: 1, minRealm: 8, seedCost: 9000 },
    { id: 'longlin_guo', name: '龙鳞果', interval: 3600, yield: 1, minRealm: 11, seedCost: 50000 },
    { id: 'guijiu_cao', name: '鬼臼草', interval: 4800, yield: 1, minRealm: 14, seedCost: 200000 },
    // Spirit plants from Report 2
    { id: 'yuelu_teng', name: '月露藤', interval: 300, yield: 2, minRealm: 0, seedCost: 50 },
    { id: 'chixin_cao', name: '赤心草', interval: 350, yield: 2, minRealm: 0, seedCost: 60 },
    { id: 'xuanshuang_kui', name: '玄霜葵', interval: 1500, yield: 1, minRealm: 5, seedCost: 2500 },
    { id: 'dimai_zhi', name: '地脉芝', interval: 1800, yield: 1, minRealm: 8, seedCost: 8000 },
    { id: 'suo_ling_ji', name: '锁灵棘', interval: 400, yield: 3, minRealm: 3, seedCost: 200 },
    { id: 'chi_sha_hua', name: '炽砂花', interval: 500, yield: 2, minRealm: 3, seedCost: 300 },
    { id: 'huiyuan_guo', name: '回元果', interval: 600, yield: 2, minRealm: 5, seedCost: 800 },
  ];

  // Merge herb species — avoid duplicates by id
  const existingIds = new Set(GameData.herbSpecies.map(h => h.id));
  for (const hs of newHerbSpecies) {
    if (!existingIds.has(hs.id)) {
      GameData.herbSpecies.push(hs);
    }
  }

  // Spirit plant items from Report 2 (for inventory display)
  const spiritPlantItems = {
    yuelu_teng:    { name: '月露藤', nameEn: 'Moon Dew Vine', type: 'herb', rarity: 'common', desc: '回灵制露，夜修辅材', element: 'water' },
    chixin_cao:    { name: '赤心草', nameEn: 'Red Heart Grass', type: 'herb', rarity: 'common', desc: '炼体战意丹主材', element: 'fire' },
    xuanshuang_kui:{ name: '玄霜葵', nameEn: 'Mystic Frost Sunflower', type: 'herb', rarity: 'rare', desc: '定神寒系丹主材', element: 'water' },
    dimai_zhi:     { name: '地脉芝', nameEn: 'Earth Vein Fungus', type: 'herb', rarity: 'rare', desc: '护脉回元，土修主材', element: 'earth' },
    jianwen_zhu:   { name: '剑纹竹', nameEn: 'Sword Pattern Bamboo', type: 'herb', rarity: 'rare', desc: '剑意药饵、符杆', element: 'metal' },
    ting_lei_tai:  { name: '听雷苔', nameEn: 'Thunder Moss', type: 'herb', rarity: 'rare', desc: '催生雷木灵植', element: 'wood' },
    jinghun_lian:  { name: '静魂莲', nameEn: 'Silent Soul Lotus', type: 'herb', rarity: 'rare', desc: '养神镇魂', element: 'water' },
    suo_ling_ji:   { name: '锁灵棘', nameEn: 'Spirit Lock Thorn', type: 'herb', rarity: 'common', desc: '封路护园', element: 'metal' },
    wuse_dou:      { name: '五色豆', nameEn: 'Five Color Bean', type: 'herb', rarity: 'rare', desc: '五行调和育种', element: 'neutral' },
    chi_sha_hua:   { name: '炽砂花', nameEn: 'Blazing Sand Flower', type: 'herb', rarity: 'common', desc: '炽焰丹火阵引材', element: 'fire' },
    huiyuan_guo:   { name: '回元果', nameEn: 'Return Source Fruit', type: 'herb', rarity: 'common', desc: '长战回元', element: 'earth' },
    lie_jia_pu:    { name: '裂甲蒲', nameEn: 'Armor Break Cattail', type: 'herb', rarity: 'common', desc: '破甲散锋刃抛光', element: 'metal' },
  };
  Object.assign(GameData.items, spiritPlantItems);

  // ---- 30 Materials from Report 2 ----
  const materials = {
    // Ores (10)
    xuantie_sui:   { name: '玄铁髓', nameEn: 'Mystic Iron Marrow', type: 'material', rarity: 'common', desc: '剑胚阵钉基础矿材', element: 'metal' },
    chiyan_tong:   { name: '赤炎铜', nameEn: 'Blazing Copper', type: 'material', rarity: 'common', desc: '炉件刀器火系矿材', element: 'fire' },
    hanpo_yin:     { name: '寒魄银', nameEn: 'Frost Soul Silver', type: 'material', rarity: 'uncommon', desc: '护心镜封印器', element: 'water' },
    houtu_jing:    { name: '厚土精', nameEn: 'Thick Earth Essence', type: 'material', rarity: 'common', desc: '器核壳阵基土属矿材', element: 'earth' },
    xingyun_jing:  { name: '星陨晶', nameEn: 'Star Meteor Crystal', type: 'material', rarity: 'rare', desc: '飞剑阵钉高级矿材', element: 'metal' },
    xuanci_shi:    { name: '玄磁石', nameEn: 'Mystic Magnet Stone', type: 'material', rarity: 'rare', desc: '引兵器磁阵特殊矿材', element: 'earth' },
    yunmu_sui:     { name: '云母髓', nameEn: 'Mica Marrow', type: 'material', rarity: 'common', desc: '轻身器符纸粉', element: 'water' },
    heiyo_sha:     { name: '黑曜砂', nameEn: 'Obsidian Sand', type: 'material', rarity: 'common', desc: '爆器阵眼火土矿材', element: 'fire' },
    yuepo_jing:    { name: '月魄晶', nameEn: 'Moon Soul Crystal', type: 'material', rarity: 'rare', desc: '神识器幻器水属矿材', element: 'water' },
    gengjin_sha:   { name: '庚金砂', nameEn: 'Geng Metal Sand', type: 'material', rarity: 'common', desc: '剑锋透甲丹金砂', element: 'metal' },
    // Spirit Woods & Beast Materials (10)
    qingwen_shansha:{ name: '青纹灵杉', nameEn: 'Green Vein Spirit Cedar', type: 'material', rarity: 'common', desc: '剑匣阵杆灵木', element: 'wood' },
    longxu_mu:     { name: '龙须木', nameEn: 'Dragon Whisker Wood', type: 'material', rarity: 'uncommon', desc: '枪杆弓臂灵木', element: 'wood' },
    huosang_xin:   { name: '火桑心', nameEn: 'Fire Mulberry Heart', type: 'material', rarity: 'common', desc: '炉芯火符纸灵木', element: 'fire' },
    xuanshuang_zhu:{ name: '玄霜竹', nameEn: 'Mystic Frost Bamboo', type: 'material', rarity: 'uncommon', desc: '冰剑符杆灵竹', element: 'water' },
    yanghun_yu:    { name: '养魂榆', nameEn: 'Soul Nourishing Elm', type: 'material', rarity: 'rare', desc: '魂器傀儡阴属灵木', element: 'wood' },
    xuanjia_guake: { name: '玄甲龟壳', nameEn: 'Mystic Armor Turtle Shell', type: 'material', rarity: 'common', desc: '盾器护符底兽甲', element: 'water' },
    lieshan_xijiao:{ name: '裂山犀角', nameEn: 'Mountain Split Rhino Horn', type: 'material', rarity: 'uncommon', desc: '破阵枪首兽骨', element: 'earth' },
    chiyu_huangling:{ name: '赤羽凰翎', nameEn: 'Red Phoenix Plume', type: 'material', rarity: 'rare', desc: '火遁器疾符羽材', element: 'fire' },
    youlang_jigu:  { name: '幽狼脊骨', nameEn: 'Shadow Wolf Spine', type: 'material', rarity: 'common', desc: '刀柄咒器兽骨', element: 'earth' },
    yutong_huwei:  { name: '玉瞳狐尾', nameEn: 'Jade Eye Fox Tail', type: 'material', rarity: 'uncommon', desc: '幻器匿符兽材', element: 'water' },
    // Cores & Array Materials (10)
    qihe_puzhu:    { name: '器核胚珠', nameEn: 'Artifact Core Bead', type: 'material', rarity: 'uncommon', desc: '本命器核心', element: 'earth' },
    leixi_dianang: { name: '雷蜥电囊', nameEn: 'Thunder Lizard Sac', type: 'material', rarity: 'uncommon', desc: '雷器启灵灵核', element: 'wood' },
    xuangui_xinhe: { name: '玄龟心核', nameEn: 'Mystic Turtle Heart Core', type: 'material', rarity: 'rare', desc: '盾器护山阵灵核', element: 'water' },
    yanshi_chilhe: { name: '炎狮炽核', nameEn: 'Flame Lion Blazing Core', type: 'material', rarity: 'rare', desc: '爆器火阵灵核', element: 'fire' },
    yuehu_huanhe:  { name: '月狐幻核', nameEn: 'Moon Fox Illusion Core', type: 'material', rarity: 'rare', desc: '幻阵迷器灵核', element: 'water' },
    wuse_zhenqibu: { name: '五色阵旗布', nameEn: 'Five Color Array Cloth', type: 'material', rarity: 'common', desc: '阵旗底布', element: 'neutral' },
    suo_ling_yinding:{ name:'锁灵银钉', nameEn: 'Spirit Lock Silver Nail', type: 'material', rarity: 'common', desc: '定阵眼封缝阵材', element: 'metal' },
    dimai_luopan:  { name: '地脉罗盘', nameEn: 'Earth Vein Compass', type: 'material', rarity: 'uncommon', desc: '寻龙点穴阵师工具', element: 'earth' },
    zhongpin_lingshi:{ name:'中品灵石', nameEn: 'Mid Grade Spirit Stone', type: 'material', rarity: 'uncommon', desc: '供能驱阵开炉通用', element: 'neutral' },
    kongwen_jingpian:{ name:'空纹晶片', nameEn: 'Void Pattern Chip', type: 'material', rarity: 'rare', desc: '传送符阵折叠空间', element: 'metal' },
  };
  Object.assign(GameData.items, materials);

  // ---- 20 Alchemy Recipes from Report 2 ----
  const newRecipes = [
    // Healing
    { id: 'r_huimai', result: 'huimai_dan', amount: 2, materials: { ningshen_hua: 2, yejiao_teng: 1, baicao_lu: 1 }, difficulty: 2 },
    { id: 'r_chiluo', result: 'huixue_dan', amount: 3, materials: { dihuang_shen: 2, longlin_guo: 1, honglin_cao: 1 }, difficulty: 4 },
    { id: 'r_guixi', result: 'huti_dan', amount: 2, materials: { ningxue_cao: 2, shilong_rui: 1, yinyue_hua: 1 }, difficulty: 3 },
    { id: 'r_qingpo', result: 'xiulian_dan', amount: 2, materials: { jianlu: 1, xuanbing_hua: 1, ningxin_cao: 1 }, difficulty: 3 },
    // Breakthrough
    { id: 'r_pozhang', result: 'zhuji_dan', amount: 1, materials: { butian_zhi: 3, fulong_shen: 1, wuliu_gen: 1, gengjin_sha: 1 }, difficulty: 5 },
    { id: 'r_wuqi', result: 'julingshi_dan', amount: 1, materials: { ningshen_hua: 2, dengxin_cao: 1, baicao_lu: 1 }, difficulty: 4 },
    { id: 'r_zifu', result: 'dingshen_dan', amount: 1, materials: { yinyue_hua: 3, xuanbing_hua: 2, jianxin_zhu: 1, yuepo_jing: 1 }, difficulty: 8 },
    { id: 'r_yuantal', result: 'butian_dan', amount: 1, materials: { longlin_guo: 3, longwen_cao: 2, puti_hua: 1, dimai_luopan: 1 }, difficulty: 12 },
    // Buff
    { id: 'r_fengxing', result: 'fengxing_dan', amount: 2, materials: { qingling_cao: 2, jianlu: 1, yunmu_sui: 1 }, difficulty: 2 },
    { id: 'r_xuanshuang_ds', result: 'xuanshuang_ds_dan', amount: 1, materials: { xuening_hua: 2, ningshen_hua: 1, xuanbing_hua: 1 }, difficulty: 5 },
    { id: 'r_lieyang', result: 'lieyang_dan', amount: 2, materials: { dengxin_cao: 2, longwen_cao: 1, tianqing_hua: 1 }, difficulty: 3 },
    { id: 'r_kunlu', result: 'kunlu_dan', amount: 1, materials: { hengxin_cao: 3, dihuang_shen: 2, butian_zhi: 1 }, difficulty: 4 },
    { id: 'r_qiyao', result: 'qiyao_dan', amount: 1, materials: { jianxin_zhu: 2, puti_hua: 1, yinyue_hua: 1, gengjin_sha: 1 }, difficulty: 7 },
    // Poison
    { id: 'r_shijing', result: 'shijing_dan', amount: 1, materials: { shexian_guo: 2, guijiu_cao: 1, yejiao_teng: 1 }, difficulty: 6 },
    { id: 'r_fansha', result: 'fansha_dan', amount: 1, materials: { longlin_guo: 2, dengxin_cao: 1, chiyan_tong: 1 }, difficulty: 10 },
    // Artifact/Beast Core
    { id: 'r_qihe_wenyang', result: 'qihe_dan', amount: 1, materials: { fulong_shen: 2, gengjin_sha: 1, dihuang_shen: 1 }, difficulty: 5 },
    { id: 'r_linghe_qiming', result: 'linghe_dan', amount: 1, materials: { baicao_lu: 2, ningshen_hua: 1, fengxiang_zhi: 1 }, difficulty: 7 },
    { id: 'r_shouxiang', result: 'shouxiang_dan', amount: 1, materials: { longlin_guo: 2, wuliu_gen: 1, tianling_guo: 1 }, difficulty: 12 },
  ];
  GameData.recipes.push(...newRecipes);

  // Consumable pills from new recipes
  const newPills = {
    huimai_dan:      { name: '回脉青露丹', nameEn: 'Vein Restore Pill', type: 'consumable', rarity: 'uncommon', desc: '修复经脉灼伤', effect: { type: 'heal_percent', value: 0.4 } },
    fengxing_dan:    { name: '风行轻骨丹', nameEn: 'Windwalk Pill', type: 'consumable', rarity: 'common', desc: '提身法与闪避30秒', effect: { type: 'cultivation_mult', value: 1.2, duration: 1800 } },
    xuanshuang_ds_dan:{ name:'玄霜定神丹', nameEn: 'Frost Calm Pill', type: 'consumable', rarity: 'rare', desc: '抗魅惑稳识海', effect: { type: 'defense_mult', value: 1.4, duration: 'battle' } },
    lieyang_dan:     { name: '烈阳战意丹', nameEn: 'Sunfire War Pill', type: 'consumable', rarity: 'common', desc: '爆发攻击提升50%', effect: { type: 'cultivation_mult', value: 1.5, duration: 600 } },
    kunlu_dan:       { name: '坤炉回元丹', nameEn: 'Earth Furnace Pill', type: 'consumable', rarity: 'uncommon', desc: '长战回元', effect: { type: 'heal_percent', value: 0.5 } },
    qiyao_dan:       { name: '七曜明识丹', nameEn: 'Seven Star Mind Pill', type: 'consumable', rarity: 'rare', desc: '提悟性1小时', effect: { type: 'cultivation_mult', value: 1.6, duration: 3600 } },
    shijing_dan:     { name: '噬经蚀灵丹', nameEn: 'Bone Erosion Pill', type: 'consumable', rarity: 'rare', desc: '以伤换攻，攻击+80%防御-30%', effect: { type: 'defense_mult', value: 0.7, duration: 'battle' } },
    fansha_dan:      { name: '返煞逆血丹', nameEn: 'Blood Reversal Pill', type: 'consumable', rarity: 'epic', desc: '以血换力，大幅提升攻击', effect: { type: 'cultivation_mult', value: 2.0, duration: 300 } },
    qihe_dan:        { name: '器核温养丹', nameEn: 'Core Nourish Pill', type: 'consumable', rarity: 'rare', desc: '温养本命器核，炼器成功率+10%', effect: { type: 'cultivation_mult', value: 1.1, duration: 1800 } },
    linghe_dan:      { name: '灵核启鸣丹', nameEn: 'Spirit Core Pill', type: 'consumable', rarity: 'rare', desc: '唤醒器灵兽魂', effect: { type: 'cultivation_mult', value: 1.3, duration: 1200 } },
    shouxiang_dan:   { name: '兽相化形丹', nameEn: 'Beast Form Pill', type: 'consumable', rarity: 'epic', desc: '妖修灵兽短时化形', effect: { type: 'cultivation_mult', value: 2.0, duration: 600 } },
  };
  Object.assign(GameData.items, newPills);

  // ---- 15 Artifacts + Forge Recipes from Report 2 ----
  const artifacts = {
    aw_gengwen:   { name: '庚纹裂岳剑', nameEn: 'Metal Rift Blade', type: 'artifact', slot: 'weapon', rarity: 'rare', desc: '多段破甲剑修主武', stats: { attack: 400, attack_pct: 0.15, defense_break: 0.08 } },
    aw_xuanchao:  { name: '玄潮镜珠', nameEn: 'Tide Mirror Orb', type: 'artifact', slot: 'talisman', rarity: 'uncommon', desc: '映照偏折法术', stats: { defense_pct: 0.12, maxSpirit: 15 } },
    aw_fencheng:  { name: '焚城轮', nameEn: 'City Burning Wheel', type: 'artifact', slot: 'weapon', rarity: 'rare', desc: 'AOE火系群战法宝', stats: { attack: 500, attack_pct: 0.18 } },
    ar_kunbi:     { name: '坤壁山印', nameEn: 'Earth Wall Seal', type: 'artifact', slot: 'armor', rarity: 'rare', desc: '立壁镇压护阵', stats: { defense: 800, defense_pct: 0.20, max_hp_pct: 0.10 } },
    aw_fulong_qiang:{ name:'伏龙穿阵枪', nameEn: 'Dragon Piercing Spear', type: 'artifact', slot: 'weapon', rarity: 'rare', desc: '破阵破甲枪修突击', stats: { attack: 350, attack_pct: 0.12, defense_break: 0.10 } },
    at_xuanci_jia:{ name: '玄磁归锋匣', nameEn: 'Magnet Blade Box', type: 'artifact', slot: 'talisman', rarity: 'rare', desc: '收放飞刃机动高', stats: { attack_pct: 0.12, crit_rate: 0.06 } },
    ar_yungu:     { name: '云骨轻靴', nameEn: 'Cloud Bone Boots', type: 'artifact', slot: 'armor', rarity: 'uncommon', desc: '轻身短闪', stats: { defense: 120, crit_rate: 0.04, defense_break: 0.03 } },
    ar_hanpo_jing:{ name: '寒魄护心镜', nameEn: 'Frost Heart Mirror', type: 'artifact', slot: 'armor', rarity: 'uncommon', desc: '防魅惑防心火', stats: { defense: 300, defense_pct: 0.12, maxSpirit: 20 } },
    ar_chiyu_dunhuo:{ name:'赤羽遁火披', nameEn: 'Phoenix Fire Cloak', type: 'artifact', slot: 'armor', rarity: 'rare', desc: '短距火遁', stats: { defense: 500, attack_pct: 0.08, defense_pct: 0.10 } },
    aw_yanghun_mu:{ name: '养魂木傀', nameEn: 'Soul Wood Puppet', type: 'artifact', slot: 'weapon', rarity: 'rare', desc: '傀儡作战可代死', stats: { attack: 600, defense: 200, life_steal: 0.04 } },
    at_suoling:   { name: '锁灵银链', nameEn: 'Spirit Lock Chain', type: 'artifact', slot: 'talisman', rarity: 'uncommon', desc: '锁技禁遁控制强', stats: { attack_pct: 0.08, defense_break: 0.06 } },
    at_wuse_zhenpan:{ name:'五色阵盘', nameEn: 'Five Color Array Plate', type: 'artifact', slot: 'talisman', rarity: 'rare', desc: '快速布小阵泛用高', stats: { cultivation_mult: 0.15, defense_pct: 0.08 } },
    at_yuehu_ling:{ name: '月狐迷踪铃', nameEn: 'Fox Illusion Bell', type: 'artifact', slot: 'talisman', rarity: 'rare', desc: '扰视听迷行幻术', stats: { crit_rate: 0.08, defense_break: 0.08, maxSpirit: 15 } },
    ar_xuanjia_guidun:{ name:'玄甲龟盾', nameEn: 'Mystic Turtle Shield', type: 'artifact', slot: 'armor', rarity: 'rare', desc: '护体分流伤害', stats: { defense: 1200, defense_pct: 0.22, max_hp_pct: 0.12 } },
    aw_yanshi_lu: { name: '炎狮炽炉', nameEn: 'Lion Blazing Furnace', type: 'artifact', slot: 'weapon', rarity: 'epic', desc: '炼丹炼器双用', stats: { attack: 800, cultivation_mult: 0.12, attack_pct: 0.15 } },
  };
  Object.assign(GameData.items, artifacts);

  const newForgeRecipes = [
    { id: 'f_gengwen', result: 'aw_gengwen', amount: 1, materials: { xuantie_sui: 5, gengjin_sha: 3, qihe_puzhu: 1, lingshi: 3000 }, difficulty: 6, minRealm: 5 },
    { id: 'f_xuanchao', result: 'aw_xuanchao', amount: 1, materials: { yuepo_jing: 3, hanpo_yin: 3, lingshi: 2000 }, difficulty: 4, minRealm: 3 },
    { id: 'f_fencheng', result: 'aw_fencheng', amount: 1, materials: { chiyan_tong: 5, yanshi_chilhe: 1, lingshi: 5000 }, difficulty: 7, minRealm: 8 },
    { id: 'f_kunbi', result: 'ar_kunbi', amount: 1, materials: { houtu_jing: 6, xuangui_xinhe: 1, lingshi: 6000 }, difficulty: 7, minRealm: 8 },
    { id: 'f_fulong_qiang', result: 'aw_fulong_qiang', amount: 1, materials: { longxu_mu: 3, lieshan_xijiao: 2, xingyun_jing: 2, lingshi: 5000 }, difficulty: 6, minRealm: 5 },
    { id: 'f_xuanci_jia', result: 'at_xuanci_jia', amount: 1, materials: { xuanci_shi: 4, qingwen_shansha: 3, lingshi: 4000 }, difficulty: 6, minRealm: 5 },
    { id: 'f_yungu', result: 'ar_yungu', amount: 1, materials: { yunmu_sui: 4, yutong_huwei: 2, lingshi: 2500 }, difficulty: 4, minRealm: 3 },
    { id: 'f_hanpo_jing', result: 'ar_hanpo_jing', amount: 1, materials: { hanpo_yin: 4, xuanshuang_zhu: 3, lingshi: 3000 }, difficulty: 5, minRealm: 5 },
    { id: 'f_chiyu_dunhuo', result: 'ar_chiyu_dunhuo', amount: 1, materials: { chiyu_huangling: 2, huosang_xin: 4, lingshi: 6000 }, difficulty: 7, minRealm: 8 },
    { id: 'f_yanghun_mu', result: 'aw_yanghun_mu', amount: 1, materials: { yanghun_yu: 2, youlang_jigu: 3, lingshi: 8000 }, difficulty: 8, minRealm: 8 },
    { id: 'f_suoling', result: 'at_suoling', amount: 1, materials: { suo_ling_yinding: 4, hanpo_yin: 2, lingshi: 3000 }, difficulty: 4, minRealm: 3 },
    { id: 'f_wuse_zhenpan', result: 'at_wuse_zhenpan', amount: 1, materials: { wuse_zhenqibu: 3, zhongpin_lingshi: 2, dimai_luopan: 1, lingshi: 6000 }, difficulty: 6, minRealm: 5 },
    { id: 'f_yuehu_ling', result: 'at_yuehu_ling', amount: 1, materials: { yuehu_huanhe: 1, yutong_huwei: 3, lingshi: 7000 }, difficulty: 7, minRealm: 8 },
    { id: 'f_xuanjia_guidun', result: 'ar_xuanjia_guidun', amount: 1, materials: { xuanjia_guake: 3, xuangui_xinhe: 1, lingshi: 8000 }, difficulty: 8, minRealm: 8 },
    { id: 'f_yanshi_lu', result: 'aw_yanshi_lu', amount: 1, materials: { chiyan_tong: 5, yanshi_chilhe: 1, houtu_jing: 3, lingshi: 20000 }, difficulty: 12, minRealm: 11 },
  ];
  GameData.forgeRecipes.push(...newForgeRecipes);

  // ---- 20 Talismans (consumable items) from Report 2 ----
  const talismans = {
    tal_lihuo:     { name: '离火爆鸣符', nameEn: 'Fire Explosion Talisman', type: 'consumable', rarity: 'common', desc: '火系攻击符，对敌人造成高额伤害', effect: { type: 'cultivation', value: 0 } },
    tal_xuanbing:  { name: '玄冰迟滞符', nameEn: 'Ice Slow Talisman', type: 'consumable', rarity: 'common', desc: '冰系控场符，降低敌人速度', effect: { type: 'heal_percent', value: 0.15 } },
    tal_jinfeng:   { name: '金锋破甲符', nameEn: 'Metal Pierce Talisman', type: 'consumable', rarity: 'uncommon', desc: '金系攻击符，无视部分防御', effect: { type: 'cultivation', value: 0 } },
    tal_qingteng:  { name: '青藤缚身符', nameEn: 'Vine Bind Talisman', type: 'consumable', rarity: 'common', desc: '木系控制符，束缚敌人', effect: { type: 'heal_percent', value: 0.1 } },
    tal_kunbi_hushen:{ name:'坤壁护身符', nameEn: 'Earth Shield Talisman', type: 'consumable', rarity: 'common', desc: '土系防御符，短时大幅提升防御', effect: { type: 'defense_mult', value: 1.6, duration: 'battle' } },
    tal_fengxing_qing:{ name:'风行轻身符', nameEn: 'Light Body Talisman', type: 'consumable', rarity: 'common', desc: '轻身增益符，提升修炼速度', effect: { type: 'cultivation_mult', value: 1.5, duration: 1800 } },
    tal_huiling:   { name: '回灵甘霖符', nameEn: 'Spirit Rain Talisman', type: 'consumable', rarity: 'uncommon', desc: '回复大量神识', effect: { type: 'heal_percent', value: 0.6 } },
    tal_jingxin:   { name: '净心清魄符', nameEn: 'Mind Purify Talisman', type: 'consumable', rarity: 'uncommon', desc: '驱散负面状态，回复生命', effect: { type: 'heal_percent', value: 0.5 } },
    tal_xiaonuoyi: { name: '小挪移符', nameEn: 'Minor Teleport Talisman', type: 'consumable', rarity: 'rare', desc: '传送至已探索地点，节省旅费', effect: { type: 'cultivation', value: 0 } },
    tal_chuanxun:  { name: '传讯飞羽符', nameEn: 'Message Feather Talisman', type: 'consumable', rarity: 'common', desc: '远程通信', effect: { type: 'cultivation', value: 0 } },
    tal_suoling_fengqiao:{ name:'锁灵封窍符', nameEn: 'Spirit Seal Talisman', type: 'consumable', rarity: 'uncommon', desc: '封印敌人灵力', effect: { type: 'defense_mult', value: 1.8, duration: 'battle' } },
    tal_zhenhun:   { name: '镇魂安神符', nameEn: 'Soul Calm Talisman', type: 'consumable', rarity: 'uncommon', desc: '稳定心神，防止走火入魔', effect: { type: 'heal_percent', value: 0.4 } },
    tal_yigui:     { name: '役鬼拘魂符', nameEn: 'Ghost Command Talisman', type: 'consumable', rarity: 'rare', desc: '召唤鬼魂作战', effect: { type: 'cultivation', value: 0 } },
    tal_qushou:    { name: '驱兽安驯符', nameEn: 'Beast Tame Talisman', type: 'consumable', rarity: 'common', desc: '驯服低阶灵兽', effect: { type: 'cultivation', value: 0 } },
    tal_juling_yangmai:{ name:'聚灵养脉符', nameEn: 'Gather Spirit Talisman', type: 'consumable', rarity: 'common', desc: '静室修炼速度+30%', effect: { type: 'cultivation_mult', value: 1.3, duration: 3600 } },
    tal_yinxi:     { name: '隐息匿形符', nameEn: 'Conceal Talisman', type: 'consumable', rarity: 'uncommon', desc: '隐匿气息', effect: { type: 'cultivation_mult', value: 1.2, duration: 1800 } },
    tal_yinlei:    { name: '引雷催发符', nameEn: 'Thunder Trigger Talisman', type: 'consumable', rarity: 'rare', desc: '引雷催发灵植或攻击', effect: { type: 'cultivation', value: 0 } },
    tal_jihuo:     { name: '祭火答愿符', nameEn: 'Fire Wish Talisman', type: 'consumable', rarity: 'uncommon', desc: '祈福增益', effect: { type: 'cultivation_mult', value: 1.4, duration: 2400 } },
    tal_pozhen:    { name: '破阵识纹符', nameEn: 'Array Break Talisman', type: 'consumable', rarity: 'uncommon', desc: '识别并破解阵法', effect: { type: 'cultivation', value: 0 } },
    tal_fanzhao:   { name: '返照回收符', nameEn: 'Recycle Talisman', type: 'consumable', rarity: 'common', desc: '回收残符灵墨', effect: { type: 'cultivation', value: 0 } },
  };
  Object.assign(GameData.items, talismans);

  // ---- 20 Spirit Beasts as new zone enemies ----
  const spiritBeasts = {
    z_village: [
      { name: '潮声獭', hp: 80, attack: 10, defense: 5, drops: { lingshi: [15, 40], lingcao: [1, 2] } },
      { name: '赤翎鸦', hp: 60, attack: 15, defense: 3, drops: { lingshi: [10, 35] } },
    ],
    z_forest: [
      { name: '月瞳狐', hp: 250, attack: 45, defense: 18, drops: { lingshi: [60, 150], yinyue_hua: [1, 2] } },
      { name: '青藤猿', hp: 180, attack: 30, defense: 20, drops: { lingcao: [3, 6], lingshi: [40, 100] } },
      { name: '灵须蜂', hp: 80, attack: 55, defense: 5, drops: { baicao_lu: [1, 2], lingshi: [20, 50] } },
    ],
    z_mine: [
      { name: '石背熊', hp: 800, attack: 80, defense: 60, drops: { kuangmai: [2, 5], houtu_jing: [1, 2], lingshi: [120, 300] } },
      { name: '药背驼', hp: 600, attack: 50, defense: 40, drops: { lingcao: [5, 10], hengxin_cao: [2, 4], lingshi: [100, 250] } },
      { name: '炽尾蜥', hp: 500, attack: 100, defense: 30, drops: { chiyan_tong: [1, 3], lingshi: [80, 200] } },
    ],
    z_ruins: [
      { name: '岩角犀', hp: 3500, attack: 280, defense: 150, drops: { lieshan_xijiao: [1, 2], kuangmai: [3, 6], lingshi: [300, 600] } },
      { name: '云纹豹', hp: 2500, attack: 350, defense: 100, drops: { yutong_huwei: [1, 2], tiannian_lingyao: [2, 4], lingshi: [200, 500] } },
      { name: '金喙隼', hp: 2000, attack: 400, defense: 80, drops: { gengjin_sha: [2, 4], longwen_heijin: [0, 1], lingshi: [250, 500] } },
    ],
    z_abyss: [
      { name: '霜角鹿', hp: 20000, attack: 1500, defense: 700, drops: { xuening_hua: [1, 2], hanpo_yin: [2, 4], lingshi: [1000, 3000] } },
      { name: '灰冥狼', hp: 25000, attack: 1800, defense: 900, drops: { youlang_jigu: [2, 4], longwen_heijin: [1, 3], lingshi: [1500, 4000] } },
      { name: '听雷猫', hp: 18000, attack: 2200, defense: 600, drops: { leixi_dianang: [1, 2], hundun_yuanshi: [0, 1], lingshi: [1200, 3000] } },
    ],
    z_chaos: [
      { name: '炎鬃狮', hp: 150000, attack: 10000, defense: 5000, drops: { yanshi_chilhe: [1, 2], hundun_yuanshi: [1, 2], lingshi: [5000, 15000] } },
      { name: '蜃光蚌', hp: 80000, attack: 15000, defense: 8000, drops: { yuehu_huanhe: [1, 2], yuepo_jing: [2, 4], lingshi: [8000, 20000] } },
      { name: '银羽鹤', hp: 120000, attack: 12000, defense: 4000, drops: { xingyun_jing: [1, 3], hundun_yuanshi: [1, 2], lingshi: [6000, 18000] } },
    ],
  };

  // Merge spirit beasts into existing zone enemies
  for (const [zone, beasts] of Object.entries(spiritBeasts)) {
    if (!GameData.enemies[zone]) GameData.enemies[zone] = [];
    GameData.enemies[zone].push(...beasts);
  }

  // ---- Named Techniques from Report 流派库 ----
  const namedTechniques = [
    // Metal schools
    { id: 't_gengwen', name: '庚纹断岳流', nameEn: 'Metal Rift School', tier: 'heaven', school: 'sword', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.18, perLevel: 0.04 }, source: 'adventure', cost: 3000 },
    { id: 't_baihong', name: '白虹裂甲流', nameEn: 'White Rainbow School', tier: 'heaven', school: 'sword', kind: 'outer', maxLevel: 15, effect: { stat: 'defense_break', type: 'flat', base: 0.08, perLevel: 0.02 }, source: 'adventure', cost: 3500 },
    { id: 't_xuanci', name: '玄磁御锋流', nameEn: 'Magnet Blade School', tier: 'heaven', school: 'sword', kind: 'outer', maxLevel: 15, effect: { stat: 'crit_rate', type: 'flat', base: 0.06, perLevel: 0.02 }, source: 'adventure', cost: 3200 },
    { id: 't_jinsha', name: '金砂铸魄流', nameEn: 'Gold Sand Forge School', tier: 'earth', school: 'body', kind: 'outer', maxLevel: 10, effect: { stat: 'defense_pct', type: 'flat', base: 0.12, perLevel: 0.03 }, source: 'sect_shop', cost: 800 },
    // Wood schools
    { id: 't_qingluo', name: '青萝缠岳流', nameEn: 'Vine Bind School', tier: 'heaven', school: 'palm', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.14, perLevel: 0.035 }, source: 'adventure', cost: 3000 },
    { id: 't_kurong', name: '枯荣回春流', nameEn: 'Wither Bloom School', tier: 'heaven', school: 'plant', kind: 'inner', maxLevel: 15, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.20, perLevel: 0.05 }, source: 'adventure', cost: 4000 },
    { id: 't_baigu', name: '百蛊噬心流', nameEn: 'Hundred Gu School', tier: 'forbidden', school: 'palm', kind: 'outer', maxLevel: 10, effect: { stat: 'attack_pct', type: 'flat', base: 0.30, perLevel: 0.06 }, source: 'adventure', special: 'sacrifice_hp' },
    // Water schools
    { id: 't_xuanchao_liu', name: '玄潮镜湖流', nameEn: 'Tide Mirror School', tier: 'heaven', school: 'qi', kind: 'inner', maxLevel: 15, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.18, perLevel: 0.04 }, source: 'adventure', cost: 3500 },
    { id: 't_bingpo_fengmai', name: '冰魄封脉流', nameEn: 'Frost Seal School', tier: 'heaven', school: 'qi', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.16, perLevel: 0.04 }, source: 'adventure', cost: 3200 },
    { id: 't_cangming', name: '沧溟折波流', nameEn: 'Ocean Wave School', tier: 'heaven', school: 'palm', kind: 'outer', maxLevel: 15, effect: { stat: 'defense_pct', type: 'flat', base: 0.15, perLevel: 0.04 }, source: 'adventure', cost: 3000 },
    // Fire schools
    { id: 't_chiyao', name: '赤曜焚城流', nameEn: 'Sunfire School', tier: 'heaven', school: 'blade', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.22, perLevel: 0.05 }, source: 'adventure', cost: 4000 },
    { id: 't_jinyu', name: '烬羽回火流', nameEn: 'Ember Feather School', tier: 'heaven', school: 'blade', kind: 'outer', maxLevel: 15, effect: { stat: 'crit_damage', type: 'flat', base: 0.15, perLevel: 0.04 }, source: 'adventure', cost: 3800 },
    { id: 't_zhusa', name: '朱砂炼骨流', nameEn: 'Cinnabar Bone School', tier: 'heaven', school: 'body', kind: 'outer', maxLevel: 15, effect: { stat: 'defense_pct', type: 'flat', base: 0.15, perLevel: 0.04 }, source: 'adventure', cost: 3000 },
    // Earth schools
    { id: 't_huangting', name: '黄庭镇岳流', nameEn: 'Imperial Earth School', tier: 'heaven', school: 'body', kind: 'inner', maxLevel: 15, effect: { stat: 'defense_pct', type: 'flat', base: 0.20, perLevel: 0.05 }, source: 'adventure', cost: 3500 },
    { id: 't_liusha_zhen', name: '流沙葬阵流', nameEn: 'Quicksand Tomb School', tier: 'heaven', school: 'array', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.14, perLevel: 0.035 }, source: 'adventure', cost: 3200 },
    { id: 't_kunlu_yangmai', name: '坤炉养脉流', nameEn: 'Earth Furnace School', tier: 'heaven', school: 'pill', kind: 'inner', maxLevel: 15, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.16, perLevel: 0.04 }, source: 'adventure', cost: 3000 },
    // Martial schools
    { id: 't_gangmen', name: '罡门镇狱拳', nameEn: 'Prison Gate Fist', tier: 'heaven', school: 'fist', kind: 'outer', maxLevel: 15, effect: { stat: 'defense_pct', type: 'flat', base: 0.16, perLevel: 0.04 }, source: 'adventure', cost: 3000 },
    { id: 't_chaosheng', name: '潮生断脉掌', nameEn: 'Tide Palm', tier: 'heaven', school: 'palm', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.15, perLevel: 0.04 }, source: 'adventure', cost: 3200 },
    { id: 't_xuanxu_zhi', name: '玄虚封窍指', nameEn: 'Void Seal Finger', tier: 'heaven', school: 'palm', kind: 'outer', maxLevel: 15, effect: { stat: 'crit_rate', type: 'flat', base: 0.08, perLevel: 0.025 }, source: 'adventure', cost: 3500 },
    { id: 't_xuehe_dao', name: '血河断命刀', nameEn: 'Blood River Blade', tier: 'forbidden', school: 'blade', kind: 'outer', maxLevel: 10, effect: { stat: 'attack_pct', type: 'flat', base: 0.35, perLevel: 0.07 }, source: 'adventure', special: 'sacrifice_hp' },
    { id: 't_longji_qiang', name: '龙脊破阵枪', nameEn: 'Dragon Spear', tier: 'heaven', school: 'spear', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.16, perLevel: 0.04 }, source: 'adventure', cost: 3500 },
    { id: 't_xingqi_jian', name: '星炁分光剑', nameEn: 'Star Split Sword', tier: 'heaven', school: 'sword', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.17, perLevel: 0.04 }, source: 'adventure', cost: 3800 },
    // Six Arts schools
    { id: 't_jiuzhuan_wenlu', name: '九转温炉派', nameEn: 'Nine Turn Furnace', tier: 'heaven', school: 'pill', kind: 'inner', maxLevel: 15, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.18, perLevel: 0.04 }, source: 'adventure', cost: 3500 },
    { id: 't_bailian_lingpei', name: '百炼灵胚派', nameEn: 'Hundred Forge School', tier: 'heaven', school: 'forge', kind: 'inner', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.12, perLevel: 0.03 }, source: 'adventure', cost: 3000 },
    { id: 't_xuanqi_yvling', name: '玄契驭灵派', nameEn: 'Beast Pact School', tier: 'heaven', school: 'beast', kind: 'inner', maxLevel: 15, effect: { stat: 'life_steal', type: 'flat', base: 0.05, perLevel: 0.015 }, source: 'adventure', cost: 3500 },
    { id: 't_jiugong_huanwei', name: '九宫换位派', nameEn: 'Nine Palace School', tier: 'heaven', school: 'array', kind: 'inner', maxLevel: 15, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.16, perLevel: 0.04 }, source: 'adventure', cost: 3800 },
    { id: 't_qiyao_dieFu', name: '七曜叠符派', nameEn: 'Seven Star Talisman', tier: 'heaven', school: 'talisman', kind: 'outer', maxLevel: 15, effect: { stat: 'attack_pct', type: 'flat', base: 0.15, perLevel: 0.04 }, source: 'adventure', cost: 3200 },
    { id: 't_baicao_yvmai', name: '百草育脉派', nameEn: 'Hundred Herb School', tier: 'heaven', school: 'plant', kind: 'inner', maxLevel: 15, effect: { stat: 'cultivation_mult', type: 'flat', base: 0.22, perLevel: 0.05 }, source: 'adventure', cost: 4000 },
    // Special schools
    { id: 't_dabei_jinzhong', name: '大悲金钟流', nameEn: 'Golden Bell School', tier: 'heaven', school: 'buddha', kind: 'inner', maxLevel: 15, effect: { stat: 'defense_pct', type: 'flat', base: 0.18, perLevel: 0.04 }, source: 'adventure', cost: 3500 },
    { id: 't_xueyuan_huanming', name: '血渊换命流', nameEn: 'Blood Abyss School', tier: 'forbidden', school: 'demon', kind: 'outer', maxLevel: 10, effect: { stat: 'attack_pct', type: 'flat', base: 0.38, perLevel: 0.08 }, source: 'adventure', special: 'sacrifice_hp' },
    { id: 't_yuyin_sheshen', name: '余音摄神流', nameEn: 'Echo Soul School', tier: 'heaven', school: 'music', kind: 'outer', maxLevel: 15, effect: { stat: 'crit_rate', type: 'flat', base: 0.10, perLevel: 0.03 }, source: 'adventure', cost: 3500 },
    { id: 't_yaoren_aoti', name: '药人熬体流', nameEn: 'Body Forged School', tier: 'heaven', school: 'body', kind: 'inner', maxLevel: 15, effect: { stat: 'max_hp_pct', type: 'flat', base: 0.15, perLevel: 0.04 }, source: 'adventure', cost: 3000 },
  ];

  // Add named techniques — avoid duplicates by id
  const existingTechIds = new Set(GameData.techniques.map(t => t.id));
  for (const tech of namedTechniques) {
    if (!existingTechIds.has(tech.id)) {
      GameData.techniques.push(tech);
    }
  }

  // ---- Array items for cave/garden upgrades from Report 2 ----
  const arrayItems = {
    arr_wuxing_suo:  { name: '五行锁灵阵图', nameEn: 'Five Element Lock Diagram', type: 'material', rarity: 'uncommon', desc: '布五行锁灵阵用阵图', element: 'neutral' },
    arr_jiugong_pan: { name: '九宫换位阵盘', nameEn: 'Nine Palace Plate', type: 'material', rarity: 'rare', desc: '布九宫换位阵用阵盘', element: 'neutral' },
    arr_dimai_wen:   { name: '地脉温养阵旗', nameEn: 'Earth Vein Warm Flag', type: 'material', rarity: 'uncommon', desc: '地脉温养阵用阵旗', element: 'earth' },
    arr_xuanshuang_feng:{ name:'玄霜封山阵旗', nameEn: 'Frost Seal Flag', type: 'material', rarity: 'rare', desc: '玄霜封山阵用阵旗', element: 'water' },
    arr_lithuo_fen:  { name: '离火焚廊阵旗', nameEn: 'Fire Corridor Flag', type: 'material', rarity: 'rare', desc: '离火焚廊阵用阵旗', element: 'fire' },
  };
  Object.assign(GameData.items, arrayItems);

  // ---- Add new exploration zone drops for new materials ----
  const newZoneDrops = {
    z_village: { drops: ['ningshen_hua', 'hengxin_cao'], dropRates: [0.25, 0.20] },
    z_forest:  { drops: ['qingling_cao', 'baicao_lu', 'yejiao_teng'], dropRates: [0.20, 0.15, 0.15] },
    z_mine:    { drops: ['xuantie_sui', 'chiyan_tong', 'gengjin_sha', 'houtu_jing'], dropRates: [0.20, 0.15, 0.20, 0.15] },
    z_ruins:   { drops: ['jianlu', 'jianxin_zhu', 'xuantie_sui', 'xuanci_shi'], dropRates: [0.15, 0.10, 0.20, 0.10] },
    z_abyss:   { drops: ['butian_zhi', 'xuanbing_hua', 'hanpo_yin', 'xingyun_jing'], dropRates: [0.15, 0.10, 0.12, 0.08] },
    z_chaos:   { drops: ['dengxin_cao', 'guijiu_cao', 'yuepo_jing', 'longlin_guo'], dropRates: [0.12, 0.08, 0.10, 0.10] },
  };

  // Extend zone drops with new materials
  for (const [zoneId, extra] of Object.entries(newZoneDrops)) {
    const zone = GameData.zones.find(z => z.id === zoneId);
    if (zone) {
      zone.drops.push(...extra.drops);
      zone.dropRates.push(...extra.dropRates);
    }
  }

})();
