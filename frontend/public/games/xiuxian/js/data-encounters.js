// ============================================================
// Encounters Expansion — adds 31 new encounters (total 40)
// Categories: general(10), mid(8), high(7), karma(6)
// ============================================================

(function () {

  const newEncounters = [
    // ===== 通用奇遇（炼气-筑基期，10个）=====
    {
      id: 'e_herbalist', name: '山间采药人',
      minRealm: 0, weight: 18,
      description: '山道弯弯，一位白发老采药人背着竹篓缓缓走来。他见你面善，笑着从篓中取出一株灵气充盈的草药："年轻人，这株百年灵草与你有缘。"',
      choices: [
        { text: '恭敬收下', effects: { reputation: 3 }, outcome: '你双手接过灵草，感受到其中蕴含的浓郁灵气。老采药人点点头，转身消失在山路尽头。', rewards: { tiannian_lingyao: 1 } },
        { text: '以灵石相赠', effects: { reputation: 8 }, outcome: '你取出五十灵石执意相赠。老采药人推辞不过，又回赠你一本简易炼丹心得。', rewards: { tiannian_lingyao: 1, xiulian_dan: 2 }, cost: { lingshi: 50 } },
        { text: '婉言谢绝', effects: { reputation: 2 }, outcome: '你谢过老人的好意，表示自己修为尚浅，不应夺人所爱。老人眼中闪过赞赏之色。', rewards: { cultivation: 'current_rate_120s' } },
      ]
    },
    {
      id: 'e_lost_cultivator', name: '迷途修士',
      minRealm: 0, weight: 16,
      description: '雾气弥漫的山林中，一位年轻修士神色慌张地向你求助。他在探险时迷失了方向，神识耗尽无法返回。',
      choices: [
        { text: '护送他出山', effects: { reputation: 5 }, outcome: '你耗费了一些神识，将迷途修士安全送出山林。他感激不已，留下一些灵石作为谢礼。', rewards: { lingshi: 80, cultivation: 'current_rate_60s' }, cost: { spirit: 15 } },
        { text: '指点方向', effects: { reputation: 3 }, outcome: '你为他指明了出山的路径，年轻修士连连道谢，匆匆离去。', rewards: { cultivation: 'current_rate_60s' } },
        { text: '爱莫能助', effects: {}, outcome: '你摇了摇头，表示自己也在赶路。年轻修士失望地继续摸索前行。', rewards: {} },
      ]
    },
    {
      id: 'e_spirit_spring_bath', name: '灵泉沐浴',
      minRealm: 1, weight: 14,
      description: '穿过一片竹林，你发现了一处隐蔽的灵泉。泉水清澈见底，灵气氤氲如雾，显然是一口天然灵眼。',
      choices: [
        { text: '入泉修炼', effects: {}, outcome: '你褪去外衣浸入灵泉，温暖的泉水包裹全身，灵气顺着毛孔涌入经脉。修炼速度临时提升！', rewards: { julingshi_dan: 1 } },
        { text: '汲取灵水', effects: {}, outcome: '你取出容器收集了满满一壶灵泉水，可用来辅助炼丹。', rewards: { lingcao: 5 } },
        { text: '标记位置后离开', effects: {}, outcome: '你在地图上标记了这个位置，打算日后再带同门前来。', rewards: {} },
      ]
    },
    {
      id: 'e_ancient_page', name: '古书残页',
      minRealm: 2, weight: 12,
      description: '在一座破败的石亭中，你发现了几页泛黄的残破竹简。上面记载着一些模糊的修炼口诀，似乎是某种失传功法的一部分。',
      choices: [
        { text: '潜心研读', effects: {}, outcome: '你静下心来仔细研读残页，虽然功法残缺不全，但仍有所领悟。修为略有精进。', rewards: { cultivation: 'current_rate_300s' } },
        { text: '收好带回研究', effects: {}, outcome: '你将残页小心收好，准备日后找宗门长老解读。', rewards: { xiulian_dan: 2 } },
        { text: '焚毁', effects: { reputation: -2 }, outcome: '你担心这是某种邪功，一把火将其焚毁。烟雾中隐约传来一声叹息。', rewards: {} },
      ]
    },
    {
      id: 'e_spirit_beast_young', name: '灵兽幼崽',
      minRealm: 2, weight: 15,
      description: '草丛中传来微弱的呜咽声。你拨开杂草，发现一只受伤的灵狐幼崽，后腿被猎夹所伤，眼中满是惊恐与哀求。',
      choices: [
        { text: '悉心救治', effects: { reputation: 8 }, outcome: '你用灵力为它疗伤，灵狐幼崽逐渐恢复活力。它蹭了蹭你的手掌，似有所依。此后它会跟随在你身边，为你带来一些机缘。', rewards: { cultivation: 'current_rate_200s' } },
        { text: '喂食后放生', effects: { reputation: 5 }, outcome: '你为它简单处理伤口，喂了一些灵草，然后将它放归山林。灵狐离去前回头望了你一眼，似有灵性。', rewards: { lingcao: 3 } },
        { text: '取其精血', effects: { reputation: -15 }, outcome: '你心一横，取走了灵狐的精血。虽然获得了一些修炼材料，但心中隐隐不安。', rewards: { tiannian_lingyao: 2 } },
      ]
    },
    {
      id: 'e_old_guide', name: '仙人指路人',
      minRealm: 3, weight: 10,
      description: '一位鹤发童颜的神秘老者坐在路边石凳上，仿佛专门在等你。他看了你一眼，淡淡道："修炼瓶颈，在于心不在于法。"',
      choices: [
        { text: '虚心请教', effects: { reputation: 5 }, outcome: '老者微微一笑，为你指点了几句关键心法。你如醍醐灌顶，修炼瓶颈似乎松动了一些。', rewards: { cultivation: 'current_rate_600s' } },
        { text: '以茶代酒敬上', effects: { reputation: 10 }, outcome: '你取出随身灵茶恭敬奉上。老者饮后大笑，赠你一枚蕴含天地灵气的玉简。', rewards: { xiulian_dan: 5 } },
        { text: '默默记下', effects: {}, outcome: '你将老者的话默默记在心中，虽未立刻领悟，但日后或许会有所启发。', rewards: { cultivation: 'current_rate_180s' } },
      ]
    },
    {
      id: 'e_heaven_omen', name: '天降异象',
      minRealm: 3, weight: 8,
      description: '晴空万里，突然一道七彩霞光划破天际，紧接着祥瑞之气弥漫四周。附近的修士纷纷抬头观望，你知道这是天道降下的机缘。',
      choices: [
        { text: '盘膝感悟', effects: { reputation: 10 }, outcome: '你立刻盘膝而坐，感悟天道异象。灵气如潮水般涌入体内，修为大增！', rewards: { cultivation: 'current_rate_1800s' } },
        { text: '寻找异象源头', effects: {}, outcome: '你循着霞光方向搜寻，在一处山崖下发现了一块被天雷淬炼过的奇石。', rewards: { kuangmai: 3 } },
        { text: '无动于衷', effects: {}, outcome: '你认为这只是普通的天象变化，继续赶路。后来听说有修士因此顿悟突破，你不禁有些后悔。', rewards: { lingshi: 30 } },
      ]
    },
    {
      id: 'e_old_friend', name: '旧友重逢',
      minRealm: 1, weight: 14,
      description: '前方路口走来一个熟悉的身影——是你初入仙道时的同门好友。多年未见，他的气质已然不同，眼中多了几分沧桑。',
      choices: [
        { text: '叙旧论道', effects: { reputation: 5 }, outcome: '两人在路边茶馆坐下，畅谈各自修炼心得。交流之中，你获得了新的领悟。', rewards: { cultivation: 'current_rate_300s' } },
        { text: '交换物资', effects: {}, outcome: '你们交换了一些各自多余的修炼物资，各取所需。', rewards: { lingcao: 5, xiulian_dan: 2 }, cost: { lingshi: 100 } },
        { text: '寒暄后告别', effects: {}, outcome: '简短寒暄后各自赶路。修仙之路漫长，每个人都有自己的方向。', rewards: { lingshi: 20 } },
      ]
    },
    {
      id: 'e_mountain_cave', name: '山间洞府',
      minRealm: 4, weight: 12,
      description: '攀登山崖时，你发现了一处隐蔽的洞府入口。石壁上留有前人刻下的字迹："后来者，若有缘，洞中物尽可取。"',
      choices: [
        { text: '入洞探索', effects: {}, outcome: '洞府不大，但布置雅致。石桌上放着几瓶丹药和一枚玉简，显然是前人遗留的修炼之所。', rewards: { xiulian_dan: 3, lingshi: 150 } },
        { text: '仔细搜查', effects: {}, outcome: '你不放过任何角落，在暗格中发现了一些珍贵材料。但也触动了简单的防御阵法，受了些轻伤。', rewards: { tiannian_lingyao: 2, kuangmai: 2 } },
        { text: '拜谢后离去', effects: { reputation: 5 }, outcome: '你对着洞府深深一拜，感谢前人的馈赠之意，但没有取走任何东西。冥冥中似乎有了一丝善缘。', rewards: { cultivation: 'current_rate_240s' } },
      ]
    },
    {
      id: 'e_beast_core', name: '妖兽内丹',
      minRealm: 4, weight: 16,
      description: '山林深处传来激烈的打斗声。你悄悄靠近，发现两只妖兽正在厮杀，其中一只已奄奄一息，体内隐约可见内丹的光芒。',
      choices: [
        { text: '趁机出手', effects: {}, outcome: '你趁虚而入，击杀了两只重伤的妖兽，收获了珍贵的内丹和材料。', rewards: { tiannian_lingyao: 2, lingshi: 200 } },
        { text: '坐收渔利', effects: {}, outcome: '你静静等待，直到胜负分出。获胜的妖兽也因重伤离去，你捡走了战死者的内丹。', rewards: { lingcao: 8, lingshi: 100 } },
        { text: '远离是非', effects: {}, outcome: '你明智的选择远离这场纷争。妖兽之战往往引来更强大的猎食者。', rewards: { cultivation: 'current_rate_120s' } },
      ]
    },

    // ===== 中级奇遇（金丹-元婴期，8个）=====
    {
      id: 'e_sect_tournament', name: '宗门大比',
      minRealm: 8, weight: 14,
      description: '你收到了一封烫金请柬——附近大宗门举办修真大比，邀请各路修士参加。获胜者可获得丰厚奖励和宗门好感。',
      choices: [
        { text: '报名参加', effects: { reputation: 10 }, outcome: '你在比武中一路过关斩将，最终获得了不错的名次。主办宗门赠你丹药作为奖励。', rewards: { jiangchen_dan: 1, lingshi: 500 } },
        { text: '观战学习', effects: { reputation: 5 }, outcome: '你坐在观众席认真观摩各路高手的对决，对战斗技巧有了新的领悟。', rewards: { cultivation: 'current_rate_600s' } },
        { text: '婉拒邀请', effects: {}, outcome: '你觉得自己的修为还不够参加这种层次的比试， politely declined。', rewards: { xiulian_dan: 2 } },
      ]
    },
    {
      id: 'e_secret_realm', name: '秘境开启',
      minRealm: 8, weight: 12,
      description: '远方天际突然出现一道空间裂缝，浓郁的灵气从中涌出。有修士高呼："小秘境开启了！"各路修士纷纷赶往。',
      choices: [
        { text: '率先进入', effects: {}, outcome: '你抢先进入秘境，在其他人到来之前搜刮了一番，收获颇丰。', rewards: { tiannian_lingyao: 3, kuangmai: 3 } },
        { text: '谨慎探索', effects: {}, outcome: '你小心翼翼地探索秘境，避开了几处陷阱，安全地带回了珍贵的材料。', rewards: { longwen_heijin: 1 } },
        { text: '与人结伴', effects: { reputation: 5 }, outcome: '你与几位散修结伴而行，虽然收获平分，但互相照应之下无人受伤。', rewards: { tiannian_lingyao: 2, xiulian_dan: 3 } },
      ]
    },
    {
      id: 'e_demonic_ambush', name: '魔道伏击',
      minRealm: 9, weight: 18,
      description: '行至偏僻之处，四周突然升起黑色雾气。三名魔道修士从暗处现身，将你团团围住。"正道修士，交出储物袋，饶你不死！"',
      choices: [
        { text: '正面迎战', effects: { reputation: 10 }, outcome: 'combat_demonic', rewards: {} },
        { text: '以财买命', effects: { reputation: -5 }, outcome: '你咬咬牙，交出一袋灵石和几瓶丹药。魔修收东西后冷笑着离去。', cost: { lingshi: 500, xiulian_dan: 3 } },
        { text: '施展遁术逃走', effects: {}, outcome: '你消耗大量神识施展遁术逃脱，虽然保住了财物，但神识消耗严重。', cost: { spirit: 40 }, rewards: { cultivation: 'current_rate_60s' } },
      ]
    },
    {
      id: 'e_ancient_legacy', name: '远古传承',
      minRealm: 10, weight: 10,
      description: '在一处荒芜的山谷中，你发现了一块巨大的石碑。碑上刻着远古文字，记载着一位上古修士的传承之地。',
      choices: [
        { text: '接受传承考验', effects: {}, outcome: 'cave_explore_hard', rewards: {} },
        { text: '拓印碑文', effects: {}, outcome: '你将碑文仔细拓印下来，准备日后找博学之士解读。这或许是一部失传功法。', rewards: { cultivation: 'current_rate_900s' } },
        { text: '参悟碑文', effects: {}, outcome: '你坐在碑前苦思冥想三日，虽然未能完全领悟，但收获颇丰。', rewards: { dingshen_dan: 1 } },
      ]
    },
    {
      id: 'e_rare_herb', name: '天材地宝',
      minRealm: 9, weight: 12,
      description: '你感应到一股浓郁的灵气波动。循着气息找去，发现一株千年灵药即将成熟，周围已有几股气息在暗中窥伺。',
      choices: [
        { text: '抢先采摘', effects: {}, outcome: '你以最快的速度冲上前去，在其他人反应过来之前将灵药收入囊中。随后迅速逃离现场。', rewards: { tiannian_lingyao: 5 } },
        { text: '守株待兔', effects: {}, outcome: '你隐藏在暗处，等其他争夺者斗得两败俱伤时才出手，轻松获得灵药。', rewards: { tiannian_lingyao: 3, kuangmai: 2 } },
        { text: '标记后离开', effects: {}, outcome: '你发现觊觎者太多，理智地选择离开。君子不立危墙之下。', rewards: { cultivation: 'current_rate_300s' } },
      ]
    },
    {
      id: 'e_cultivator_market', name: '修仙市集',
      minRealm: 8, weight: 14,
      description: '山脚下突然出现了一片热闹的修仙市集。流动的摊位上摆满了各种修炼材料、丹药和法器，叫卖声此起彼伏。',
      choices: [
        { text: '淘货', effects: {}, outcome: '你在市集上淘到了几件不错的材料，价格比宗门商店便宜不少。', rewards: { kuangmai: 3, lingcao: 10 }, cost: { lingshi: 300 } },
        { text: '出售多余材料', effects: {}, outcome: '你将探险中获得的多余材料出售，换了不少灵石。', rewards: { lingshi: 400 } },
        { text: '闲逛', effects: { reputation: 3 }, outcome: '你在市集中闲逛，与各路修士交流，增长了见识。', rewards: { xiulian_dan: 2 } },
      ]
    },
    {
      id: 'e_master_teach', name: '师徒缘分',
      minRealm: 9, weight: 11,
      description: '一位气质不凡的前辈修士主动找上你。他表示你的修炼资质不错，愿意传授一门绝技，条件是日后替他完成一件事。',
      choices: [
        { text: '拜谢接受', effects: { reputation: 8 }, outcome: '前辈将一门绝技传授给你。虽然日后可能有因果需要了结，但这机缘不可多得。', rewards: { cultivation: 'current_rate_1200s' } },
        { text: '婉言谢绝', effects: { reputation: 3 }, outcome: '你担心日后因果太重， politely declined。前辈不以为忤，反而更加欣赏你的谨慎。', rewards: { huti_dan: 2 } },
        { text: '询问条件', effects: {}, outcome: '你详细询问了前辈的条件。前辈笑而不答，只说你日后自会明白。', rewards: { xiulian_dan: 3 } },
      ]
    },
    {
      id: 'e_tribulation_omen', name: '劫难预兆',
      minRealm: 11, weight: 8,
      description: '你心中突然涌起一阵强烈的不安。抬头望天，发现劫云正在远方聚集。这是天劫将至的预兆！你需要提前做好准备。',
      choices: [
        { text: '寻找避雷之地', effects: {}, outcome: '你找到了一处天然避雷的山洞，布下防御阵法。虽然不能完全抵挡天劫，但能减轻部分伤害。', rewards: { huti_dan: 3 } },
        { text: '炼制渡劫丹药', effects: {}, outcome: '你抓紧最后的时间炼制了一些渡劫辅助丹药，为即将到来的天劫做准备。', rewards: { huixue_dan: 5 } },
        { text: '静心调息', effects: {}, outcome: '你找了一处安静之地打坐调息，将身心调整到最佳状态迎接天劫。', rewards: { cultivation: 'current_rate_600s' } },
      ]
    },

    // ===== 高级奇遇（化神-大乘期，7个）=====
    {
      id: 'e_world_tribulation', name: '天地大劫',
      minRealm: 14, weight: 10,
      description: '天地变色，风云骤起。域外天魔入侵此界，各大宗门纷纷召集修士抵御。这是关乎一界存亡的劫难，无人可以幸免。',
      choices: [
        { text: '挺身而出', effects: { reputation: 30 }, outcome: '你义无反顾地加入了抵抗大军。经过惨烈战斗，你击退了天魔，获得了天道功德赏赐。', rewards: { longwen_heijin: 2, hundun_yuanshi: 1 } },
        { text: '守护凡人', effects: { reputation: 20 }, outcome: '你没有加入正面战场，而是选择守护附近的凡人村庄。你的善举感动了天道。', rewards: { butian_dan: 1 } },
        { text: '闭关躲避', effects: { reputation: -20 }, outcome: '你选择闭关躲避这场劫难。虽然保住了性命，但心中始终有一丝愧疚。', rewards: { cultivation: 'current_rate_1800s' } },
      ]
    },
    {
      id: 'e_ancient_secret', name: '远古秘闻',
      minRealm: 14, weight: 9,
      description: '在一处上古遗迹中，你发现了一块记载着远古秘闻的玉简。玉简中提到了仙界的存在，以及远古时期一场惊天大战。',
      choices: [
        { text: '深入研究', effects: {}, outcome: '你沉浸在对远古秘闻的研究中，对天地大道有了更深的理解。这些知识虽然不能在战斗中直接帮助，但对修炼境界的提升有莫大好处。', rewards: { cultivation: 'current_rate_3600s' } },
        { text: '寻找仙界线索', effects: {}, outcome: '你根据玉简中的线索，在遗迹中找到了一处通往仙界的残破传送阵。虽然无法启动，但你记下了坐标。', rewards: { hundun_yuanshi: 2 } },
        { text: '分享出去', effects: { reputation: 15 }, outcome: '你将玉简的内容分享给了同道。远古秘闻的传播让修真界对仙道之路有了新的认识。', rewards: { lingshi: 2000 } },
      ]
    },
    {
      id: 'e_true_immortal_ruin', name: '真仙遗迹',
      minRealm: 16, weight: 8,
      description: '你意外发现了一处真仙遗留的洞府。洞府外有强大的禁制守护，但禁制因年代久远而出现了一丝裂隙。',
      choices: [
        { text: '强行破阵', effects: {}, outcome: 'cave_explore_hard', rewards: {} },
        { text: '从裂隙潜入', effects: {}, outcome: '你从禁制裂隙处小心潜入，虽然没有深入核心区域，但在外围找到了不少珍贵材料。', rewards: { xianjin: 1, hundun_yuanshi: 2 } },
        { text: '参悟禁制', effects: {}, outcome: '你坐在洞府外，花费大量时间参悟真仙布置的禁制。虽然没有获得实物，但对阵法的理解大大提升。', rewards: { cultivation: 'current_rate_2400s' } },
      ]
    },
    {
      id: 'e_karma_cycle', name: '因果轮回',
      minRealm: 15, weight: 9,
      description: '你在修炼中突然陷入了一种玄妙的状态。前世的记忆碎片浮现——你曾经是一位大乘修士，因渡劫失败转世重修。',
      choices: [
        { text: '接纳前世因果', effects: { reputation: 10 }, outcome: '你接纳了前世的记忆与因果，两世修为叠加，境界突飞猛进。同时，你也记起了前世留下的几处宝藏位置。', rewards: { hundun_yuanshi: 3, butian_dan: 1 } },
        { text: '斩断前世', effects: {}, outcome: '你选择斩断与前世的联系，走出自己的道路。虽然失去了前世传承，但心境更加通透。', rewards: { cultivation: 'current_rate_1800s' } },
        { text: '顺其自然', effects: {}, outcome: '你既不刻意接纳也不排斥，让前世的记忆自然沉淀。这种态度反而让你与天道更加契合。', rewards: { feisheng_dan: 1 } },
      ]
    },
    {
      id: 'e_crossworld_portal', name: '跨界传送',
      minRealm: 17, weight: 7,
      description: '一处古老的传送阵突然自行启动。阵法散发出耀眼的光芒，通往未知的世界。这是前往其他修真界的通道！',
      choices: [
        { text: '踏入传送阵', effects: {}, outcome: '你被传送到一个灵气浓度远超此界的修炼圣地。在那里修炼了一段时间后返回，修为大涨。', rewards: { cultivation: 'current_rate_7200s' } },
        { text: '记录坐标后关闭', effects: { reputation: 10 }, outcome: '你记下了传送阵的坐标和启动方法，然后将其关闭。这种力量不可轻易动用。', rewards: { xianjin: 1 } },
        { text: '研究阵法', effects: {}, outcome: '你花时间研究传送阵的构造，虽然未能完全理解，但阵法造诣大增。', rewards: { hundun_yuanshi: 2 } },
      ]
    },
    {
      id: 'e_dao_insight', name: '天道感悟',
      minRealm: 18, weight: 8,
      description: '万里无云的天空突然出现了一个巨大的"道"字，随即消散。这是天道在向你展示大道的痕迹——千载难逢的顿悟机缘。',
      choices: [
        { text: '全心感悟', effects: {}, outcome: '你忘却了一切，全身心投入对天道的感悟。当意识回归时，你的境界已经提升了一大截。', rewards: { cultivation: 'current_rate_10800s' } },
        { text: '以神识烙印', effects: {}, outcome: '你用全部神识将天道痕迹烙印在识海中，虽然顿悟效果减弱，但可以日后反复参悟。', rewards: { hundun_yuanshi: 3 } },
        { text: '呼朋唤友', effects: { reputation: 20 }, outcome: '你立刻通知附近的同道一起来感悟。虽然个人收获减少，但这份胸襟让天道降下功德。', rewards: { butian_dan: 2 } },
      ]
    },
    {
      id: 'e_immortal_fragment', name: '仙界碎片',
      minRealm: 19, weight: 6,
      description: '天际突然裂开一道缝隙，一块散发着仙灵之气的空间碎片坠落在你面前。这是仙界崩溃时掉落的碎片，其中蕴含着真正的仙气。',
      choices: [
        { text: '吸收仙气', effects: {}, outcome: '你小心翼翼地吸收了碎片中的仙气。凡体吸收仙气的过程极其痛苦，但效果是惊人的——你的体质发生了蜕变。', rewards: { xianjin: 2, hundun_yuanshi: 3 } },
        { text: '炼化入法宝', effects: {}, outcome: '你将仙气引导入本命法宝中。法宝吸收了仙气后品质大增，灵性更足。', rewards: { xianjin: 1, longwen_heijin: 3 } },
        { text: '封存保留', effects: {}, outcome: '你觉得现在不是使用仙气的最佳时机，用秘法将其封存。日后渡劫时使用，成功率会大增。', rewards: { feisheng_dan: 1 } },
      ]
    },

    // ===== 因果链事件（6个）=====
    {
      id: 'e_karma_benefactor', name: '昔日恩人',
      minRealm: 6, weight: 10,
      description: '一位气质不凡的修士登门拜访。他笑着告诉你，多年前你曾在一次探险中救过他的性命。如今他已是一方高手，特来报恩。',
      choices: [
        { text: '欣然接受', effects: { reputation: 5 }, outcome: '昔日恩人留下大量修炼资源和一件珍贵法器后离去。他日若有需要，可随时找他相助。', rewards: { lingshi: 1000, longwen_heijin: 1 } },
        { text: '只取所需', effects: { reputation: 10 }, outcome: '你从他带来的礼物中只取了一小部分你急需的材料，其余奉还。这份气节让对方更加敬佩。', rewards: { tiannian_lingyao: 3 } },
        { text: '以礼相待', effects: { reputation: 8 }, outcome: '你设宴款待恩人，席间论道交流。虽然未取实物，但修炼心得的交换让你收获更多。', rewards: { cultivation: 'current_rate_1200s' } },
      ]
    },
    {
      id: 'e_karma_enemy', name: '仇人寻来',
      minRealm: 7, weight: 12,
      description: '一个面色阴沉的修士找上门来。他声称你曾坏过他的好事（或是你完全不记得的小事），今日要一决生死。',
      choices: [
        { text: '迎战', effects: { reputation: 5 }, outcome: 'combat_demonic', rewards: {} },
        { text: '化解恩怨', effects: { reputation: 15 }, outcome: '你以极大的胸襟化解了这段恩怨，甚至赠送了一些灵石作为歉意。对方最终羞愧离去，恩怨一笔勾销。', cost: { lingshi: 300 }, rewards: { cultivation: 'current_rate_600s' } },
        { text: '避而不战', effects: { reputation: -5 }, outcome: '你施展遁术避开了这场战斗。虽然保住了性命，但这段因果并未了结。', cost: { spirit: 25 }, rewards: {} },
      ]
    },
    {
      id: 'e_karma_successor', name: '传承之人',
      minRealm: 10, weight: 9,
      description: '一位资质不错的年轻修士慕名而来，希望能拜你为师学习修炼之道。看着他那双渴望的眼睛，你仿佛看到了当年的自己。',
      choices: [
        { text: '收为弟子', effects: { reputation: 15 }, outcome: '你收下了这个弟子，将自己所学倾囊相授。弟子带来的新鲜视角也让你对修炼有了新的理解。', rewards: { cultivation: 'current_rate_900s' } },
        { text: '指点一二', effects: { reputation: 8 }, outcome: '你没有正式收徒，但为他指点了一些修炼上的困惑。年轻修士感激涕零，日后必有所成。', rewards: { xiulian_dan: 5 } },
        { text: '推荐宗门', effects: { reputation: 10 }, outcome: '你认为自己不适合教导弟子，将他推荐到了一个合适的宗门。这份善缘日后必有好报。', rewards: { lingshi: 500 } },
      ]
    },
    {
      id: 'e_karma_partner', name: '道侣之缘',
      minRealm: 11, weight: 8,
      description: '一次偶然的相遇，你与另一位修士之间产生了一种奇妙的感应。这是天道安排的道侣之缘——双修之法可以互相促进修为。',
      choices: [
        { text: '接受缘分', effects: { reputation: 10 }, outcome: '你与对方结为道侣，从此修炼之路不再孤单。双修之法让你们的修为都有了显著提升。', rewards: { cultivation: 'current_rate_1800s' } },
        { text: '以友代侣', effects: { reputation: 5 }, outcome: '你觉得现在不是谈论道侣的时候，但可以做修炼之友。虽然没有正式结侣，但也有了互相扶持的伙伴。', rewards: { julingshi_dan: 2 } },
        { text: '婉拒', effects: {}, outcome: '你选择了独自前行的道路。修仙之路本就孤独，你不愿因儿女情长而影响道心。', rewards: { dingshen_dan: 1 } },
      ]
    },
    {
      id: 'e_karma_resolution', name: '因果了结',
      minRealm: 13, weight: 8,
      description: '修炼中，你感应到心中最后一丝因果纠葛即将消散。这是你多年积累的善缘和恶缘同时到了结算的时刻。',
      choices: [
        { text: '顺应天道', effects: { reputation: 20 }, outcome: '你顺应天道，让因果自然流转。善念结善果，你的修为因此获得了天道的赏赐。', rewards: { hundun_yuanshi: 2, butian_dan: 1 } },
        { text: '主动化解', effects: { reputation: 15 }, outcome: '你主动走遍四方，逐一化解了过去的恩怨。这个过程虽然耗费时间和精力，但心境变得前所未有的通透。', rewards: { cultivation: 'current_rate_2400s' } },
        { text: '以力破之', effects: { reputation: -10 }, outcome: '你以强大的修为强行斩断所有因果。虽然短期内修为大涨，但日后可能会有隐患。', rewards: { longwen_heijin: 3 } },
      ]
    },
    {
      id: 'e_karma_reincarnation', name: '轮回转世',
      minRealm: 15, weight: 6,
      description: '你遇到了一个陌生的面孔，但那双眼睛让你心中一震——那是你前世最重要的人。虽然记忆模糊，但灵魂深处的羁绊无法欺骗。',
      choices: [
        { text: '相认', effects: { reputation: 10 }, outcome: '你鼓起勇气上前相认。虽然对方已没有前世记忆，但你们之间依然产生了一种奇妙的联系。天道为这份真情降下功德。', rewards: { hundun_yuanshi: 2, cultivation: 'current_rate_1800s' } },
        { text: '默默守护', effects: { reputation: 15 }, outcome: '你没有打扰对方的新生活，只是默默守护。这份不求回报的守护，让你的道心更加圆满。', rewards: { butian_dan: 1 } },
        { text: '斩断羁绊', effects: {}, outcome: '你狠下心来斩断了与前世的羁绊。从此，你只专注于当下的修仙之路。', rewards: { feisheng_dan: 1 } },
      ]
    },
  ];

  // Merge into GameData.encounters
  if (typeof GameData !== 'undefined' && GameData.encounters) {
    // Avoid duplicates by id
    const existingIds = new Set(GameData.encounters.map(e => e.id));
    for (const enc of newEncounters) {
      if (!existingIds.has(enc.id)) {
        GameData.encounters.push(enc);
      }
    }
  }

})();
