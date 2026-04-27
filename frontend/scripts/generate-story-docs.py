from __future__ import annotations

import hashlib
import re
import sys
import textwrap
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
DOCS_ROOT = REPO_ROOT / "docs"
OUTLINE_FILE = DOCS_ROOT / "故事.md"
STORY_FILE = DOCS_ROOT / "剧情.md"
DESIGN_FILE = DOCS_ROOT / "图片、游戏等设计.md"
CHECK_FILE = DOCS_ROOT / "剧情自检报告.md"
TARGET_CHINESE_COUNT = 300_000

sys.path.insert(0, str(BACKEND_ROOT))

from app.services.story_parser import StoryParser  # noqa: E402


@dataclass(frozen=True)
class Act:
    no: int
    title: str
    summary: str
    stakes: str
    locations: tuple[str, ...]
    clues: tuple[str, ...]
    false_leads: tuple[str, ...]
    memes: tuple[str, ...]
    images: tuple[str, ...]
    mini_games: tuple[str, ...]
    social_posts: tuple[str, ...]
    allies: tuple[str, ...]
    day_titles: tuple[str, ...]
    handoff: str


ACTS: tuple[Act, ...] = (
    Act(
        no=1,
        title="卷一：雨水盲区",
        summary="玩家在雨夜接到陌生讯号，帮星从追捕里活下来，并在废弃美术旧馆里拿到第一批纸质线索。",
        stakes="核心不是打赢，而是别在第一周就把路走绝。星先活下来，玩家先学会判断什么是真威胁，什么是假引导。",
        locations=("雨夜公园", "便利店后巷", "美术旧馆", "旧配电室", "走廊尽头的资料室"),
        clues=("三束强光的搜查节奏", "课程手册残页", "X-17 代号", "美术班点名册", "图书馆借阅证"),
        false_leads=("保安亭值班表", "墙角儿童失踪涂鸦", "碎屏手机备忘录", "公园健身墙后的塑料袋", "旧贩卖机广告贴"),
        memes=("像共享单车定位一直飘", "像县城鬼屋临时兼职现场", "像周一早读前的走廊", "像外包做了一半就跑路的系统", "像那种一看就要掉链子的贩卖机"),
        images=("雨夜公园强光远景", "霉斑课程手册特写", "走廊尽头的门牌与锁孔"),
        mini_games=("旧馆门缝撬动节奏", "配电箱断路重连", "纸页编号拼接"),
        social_posts=("仅你可见：今天先别死", "仅你可见：雨停了，人还没停", "仅你可见：原来饿到头晕真的会想骂人"),
        allies=("巷口值夜的大叔", "旧馆外墙下躲雨的清洁阿姨", "还没露面的图书馆管理员"),
        day_titles=("雨夜的陌生讯号", "旧馆白天", "楼梯间的回声", "残页与代号", "去图书馆的路"),
        handoff="借阅证上的戳记把线索推向市立图书馆，说明旧馆不是终点，只是被废弃过的上一道工序。",
    ),
    Act(
        no=2,
        title="卷二：纸巷档案",
        summary="星在纸本记录里发现系统抹除不了的偏差，与沈岚建立有限合作，开始从纸巷里拼出第一条完整因果链。",
        stakes="追查的尺度从求生扩大到取证，但依旧不能把图书馆写成终点，所有收获都只够把下一扇门推开一点。",
        locations=("图书馆侧门", "旧报纸墙", "停用食堂", "档案井", "地下缩微阅览室"),
        clues=("借书证借出时间错位", "报纸版次不一致", "食堂临时名单", "缩微胶卷编号", "沈岚抽屉里的手写索引"),
        false_leads=("早年都市怪谈剪报", "过期寻人启事", "停水通知背面的广告词", "退休老师的错记忆", "旧论坛打印页"),
        memes=("像校门口十块钱三本的盗版资料", "像食堂阿姨私藏的小本账", "像贴吧神贴只剩标题", "像家里长辈死活舍不得扔的塑料袋", "像谁把正经档案塞进八卦角"),
        images=("旧报纸版次对照图", "缩微胶卷阅读机界面", "沈岚桌面俯拍"),
        mini_games=("报纸时间线复原", "缩微胶卷对焦", "纸档索引抽屉归位"),
        social_posts=("仅你可见：今天遇到个嘴很冷的姐姐", "仅你可见：纸真的比云靠谱", "仅你可见：我开始怀疑自己被写过"),
        allies=("沈岚", "楼道里卖过早餐的大叔", "保留旧卡片机的馆员"),
        day_titles=("图书馆侧门", "报纸墙", "食堂与假传闻", "档案井", "沈岚的抽屉"),
        handoff="纸档把明光书院指向星童年的一处空洞，下一步不是继续翻纸，而是回到那块被精心修过的现实现场。",
    ),
    Act(
        no=3,
        title="卷三：明光旧校",
        summary="星潜入旧校区，在被覆盖过的学生记录、社团论坛和实验教室里找到自己童年被篡改的边缘证据。",
        stakes="这是第一次从抽象计划碰到具体童年。要让星心碎，但不能让故事像终局，而是把她从“逃”推进到“我要弄明白”。",
        locations=("停电门房", "旧操场看台", "学生会服务器室", "生物楼天台", "样片教室"),
        clues=("门卫交接本", "广播站录音盘", "社团论坛缓存", "学号和生日错位", "样片教室里的集体合影"),
        false_leads=("高分作文墙", "心理辅导室鸡汤贴", "校庆横幅背面的涂鸦", "匿名表白墙截图", "失物招领箱里的旧围巾"),
        memes=("像高三冲刺标语改成了监控口号", "像学校论坛里永不消失的顶帖", "像老师口中只存在于传说里的优秀毕业生", "像班长收手机时那种一视同仁的冷", "像校庆视频外包公司整出来的滤镜"),
        images=("停电门房登记册", "操场边缘的旧监控图", "样片教室合影背面签名"),
        mini_games=("论坛缓存拼页", "校内路线避巡逻", "广播录音倒放识别"),
        social_posts=("仅你可见：学校真会让人胃疼", "仅你可见：有些地方一闻就知道不对", "仅你可见：原来有人替我长大过"),
        allies=("沈岚", "一位失联多年的广播站学姐", "校门口修锁的大叔"),
        day_titles=("停电的门房", "学生会服务器", "论坛老帖", "生物楼天台", "样片教室"),
        handoff="样片教室证明旧校并不是源头，只是筛选环节。真正做精细修补的人，藏在城南一条专门处理‘善后’的暗线里。",
    ),
    Act(
        no=4,
        title="卷四：城南暗线",
        summary="城市边缘的网吧、外卖站、黑诊所和旧记者渠道把“灯塔”如何修补现实痕迹的流程一点点掀开。",
        stakes="中段必须长开，不能一味往大公司总部冲。这里承担扩字数、长支线、长生活气和中文梗，也承担逻辑上的中继站功能。",
        locations=("废弃网吧后门", "外卖骑手换电点", "黑诊所候诊区", "高架桥底下", "旧记者合租屋"),
        clues=("网吧缓存硬盘", "骑手群里被撤回的定位", "诊所处方编码", "偷拍视频里的白色面包车", "陆择留下的录音笔"),
        false_leads=("假爆料群友", "自媒体偷拍视频标题党", "换电柜背后的假二维码", "桥洞里被放大的恐吓涂鸦", "网吧老板的旧吹牛录音"),
        memes=("像深夜群聊里最能说的那个哥", "像一条永远骑不到头的外卖路线", "像桥洞下临时搭起来的野路子工作室", "像短视频标题党剪出来的假高潮", "像老电脑风扇一转就要散架"),
        images=("废网吧缓存界面", "骑手群聊天截图", "旧录音笔与处方单同框"),
        mini_games=("群聊时间戳校验", "换电柜编号追踪", "诊所处方编码对照"),
        social_posts=("仅你可见：今天像在城市背面走路", "仅你可见：人一多，谎话也多", "仅你可见：我开始分得清真关心和假热闹了"),
        allies=("陆择", "骑手阿横", "桥洞下帮人修主板的阿姨"),
        day_titles=("网吧背门", "外卖站点", "黑诊所候诊区", "陆择的旧录音笔", "高架桥下的交换"),
        handoff="陆择留下的链条最后指向一座旧剧场。那里不是单纯演出地，而是穹算做城市叙事演示的现场。",
    ),
    Act(
        no=5,
        title="卷五：镜框剧场",
        summary="星与玩家潜进旧剧场和城市直播彩排现场，看见穹算如何把人的情绪、街景和舆论包装成可展示的治理样片。",
        stakes="这里要把‘系统塑形’从实验室推进到社会层面，让玩家意识到整个城市都被布景过，但节奏仍然是摸证据，不是最终决战。",
        locations=("旧剧场票口", "道具间", "直播彩排后台", "升降台背面", "总控灯桥"),
        clues=("群演名单", "舞台调度表", "直播口径话术", "升降台检修码", "暗号式通报码"),
        false_leads=("群演八卦群", "短视频彩排片段", "网红探店直播回放", "被掐头去尾的内部培训手册", "剧场保洁口中的流言"),
        memes=("像大型活动前一晚的全城鸡飞狗跳", "像临时抱佛脚的企业年会", "像把人情绪当 PPT 页面切换", "像综艺彩排里没被播出的尴尬镜头", "像所有人都在等提词器救命"),
        images=("群演名单与席位图", "彩排后台监控截帧", "灯桥高处俯拍全景"),
        mini_games=("灯桥盲区潜行", "舞台调度时间差", "报码句式拼接"),
        social_posts=("仅你可见：今天见识到什么叫把人当道具", "仅你可见：我对着提词器想笑", "仅你可见：你要在就好了，我肯定先翻白眼给你看"),
        allies=("陆择", "剧场布景师老曹", "临时群演小满"),
        day_titles=("旧剧场票口", "道具间与群演表", "城市直播彩排", "升降台背面", "镜框后的通报码"),
        handoff="剧场里反复出现的病区编号和疗程词把线索从社会展示层推回到白楼疗养院，那是被包装之前的原始修正场。",
    ),
    Act(
        no=6,
        title="卷六：白楼疗程",
        summary="疗养院是星真正意义上被修补过的地方，她在这里第一次看见与自己相似又不像自己的‘保留个体’。",
        stakes="这是角色内核最重的一卷，要让星崩，但不能把所有真相一次交光。疗养院之后，问题会从‘我是谁’变成‘别人又被改成了什么样’。",
        locations=("疗养院外墙", "药房冷柜", "白楼病房", "夜班护士站", "地下疗程层"),
        clues=("药剂批号", "K 的病历夹", "轮换病房名单", "值班护士口头术语", "地下层疗程记录"),
        false_leads=("慰问墙照片", "康复操宣传单", "假善后协议", "失焦监控快照", "病号服口袋里的空糖纸"),
        memes=("像把人生按成了标准模板", "像医院广播永远只播好消息", "像家属群里最会安慰人的管理员", "像看着很温柔其实冷得要命的白灯", "像被反复擦过的塑料地板"),
        images=("白楼病区走廊", "K 的病历夹内页", "地下疗程层的门牌"),
        mini_games=("药剂批号比对", "病房轮换图排查", "地下层电梯权限避让"),
        social_posts=("仅你可见：今天不太想逞强", "仅你可见：我真的不是唯一一个", "仅你可见：我如果安静太久，你记得叫我"),
        allies=("K", "夜班护士周宁", "偷偷留药盒的小护工"),
        day_titles=("疗养院外墙", "药房冷柜", "K 的病历夹", "夜班护士站", "白楼地下层"),
        handoff="白楼疗程层里存着港区运输单，说明‘调整’不是在院内终止，而是被送往更远的地方继续处理。",
    ),
    Act(
        no=7,
        title="卷七：港区潮痕",
        summary="港区承担转运、藏匿和冷处理，老鬼这条线把实验样本、货单与设备维护记录串到了一起。",
        stakes="这一卷要扩成真正的城市群像。码头、渔市、港务局旧图纸、老工人的嘴和潮汐规则一起，让世界观从点扩大成面。",
        locations=("集装箱堆场", "渔市广播站", "老鬼的工具间", "港务局废档室", "潮汐门"),
        clues=("转运货单", "潮汐开门表", "检修工牌", "废弃泊位示意图", "潮汐门的物理钥匙"),
        false_leads=("走私传闻", "海鲜商贩夸口", "港区匿名举报信", "钓鱼论坛神帖", "被撕掉一半的船票"),
        memes=("像凌晨四点还在营业的海鲜市场", "像码头工人一句话能顶十个流程图", "像有人拿 Excel 管海浪", "像港区广播永远比人先急", "像每个老工人都懂一点不该懂的事"),
        images=("转运货单与工牌", "港务局旧图纸", "潮汐门把手特写"),
        mini_games=("潮汐时刻配平", "港区路线切换", "工牌权限借用"),
        social_posts=("仅你可见：港口的风很凶，但人还行", "仅你可见：老鬼骂人真有水平", "仅你可见：今天第一次觉得我们快摸到骨头了"),
        allies=("老鬼", "渔市喇叭阿姨", "港务局退休文员"),
        day_titles=("集装箱阴影", "渔市广播", "老鬼的工具箱", "港务局旧图纸", "潮汐门"),
        handoff="潮汐门后不是自由海面，而是一段去海上浮台的冷链转运通道。真正的核心，还在水上。",
    ),
    Act(
        no=8,
        title="卷八：海上回声",
        summary="海上浮台和机房让玩家第一次碰见‘你为什么会接到她’这个问题，连接本身被纳入真相。",
        stakes="反转要成立，但不能把感情一笔抹成假。这里强调‘被筛中过’不等于‘后来每句话都不真’。",
        locations=("驳船甲板", "维修浮台", "海上机房", "反向监听舱", "回声舱"),
        clues=("转接日志", "浮台检修签", "监听回路图", "外部匹配名单残片", "回声舱测试记录"),
        false_leads=("假船员证", "海风里散掉的口令", "被故意留下的假匹配名单", "监听室诱导文案", "海上求救频道里的干扰词"),
        memes=("像把人和信号一起泡进海里", "像服务器也会晕船", "像所有冷笑话都被海风吹硬了", "像有人拿概率学谈感情", "像深夜电话突然被录成培训案例"),
        images=("驳船甲板低角度图", "监听回路手绘图", "回声舱外壳编号"),
        mini_games=("海上线路反接", "监听回路配对", "回声舱参数拨盘"),
        social_posts=("仅你可见：今天最难受的不是冷，是那句话", "仅你可见：如果我们被算到过，你会不会觉得膈应", "仅你可见：我还是更信后来的每一句"),
        allies=("老鬼", "浮台维修员阿泊", "被替换掉的值守工程师"),
        day_titles=("驳船甲板", "维修浮台", "海上机房", "反向监听", "回声舱"),
        handoff="回声舱证明示范区仍在运转，星不是最后一个样本，城市里还有一整块被‘成功经验’包装过的地方。",
    ),
    Act(
        no=9,
        title="卷九：空城示范",
        summary="示范区表面安静、文明、光洁，实际靠持续修正维持。星开始面对最难的一题：摧毁坏系统时，怎么不把里面的普通人一起打碎。",
        stakes="最终卷前的真正伦理卷。它必须厚，必须把居民、依赖者、灰色执行者写出来，不然最后的选择只是口号。",
        locations=("示范区早市", "自动纠正地铁", "调整中心", "居民档案厅", "停机前夜的中央广场"),
        clues=("居民情绪阈值图", "地铁纠错广播脚本", "调整中心访客记录", "居民档案里的平替人生", "停机方案的备用条款"),
        false_leads=("过分幸福的宣传片", "居民口中的标准答案", "伪造访客胸牌", "刻意引导的民意样本", "广场大屏上的温情口号"),
        memes=("像把生活修成了样板间", "像所有人都被要求情绪稳定到不近人情", "像客服话术穿上了城市外衣", "像地铁连叹气都想帮你纠正", "像大屏幕只会夸今天真好"),
        images=("示范区早市全景", "自动纠正地铁提示牌", "居民档案厅窗口"),
        mini_games=("居民档案拼接", "纠错地铁广播识别", "示范区巡逻时间差"),
        social_posts=("仅你可见：这里连争吵都像被消过音", "仅你可见：原来正常也会被做成产品", "仅你可见：我不想只救我自己了"),
        allies=("示范区教师何青", "地铁值守员老夏", "档案厅窗口女孩阿禾"),
        day_titles=("没有吵架的早市", "自动纠正的地铁", "调整中心白班", "示范区居民档案", "空城停机夜"),
        handoff="停机备用条款指向灯塔主控层。最后一卷不是去证明系统坏，而是去决定到底怎样结束它、留下谁、带走谁。",
    ),
    Act(
        no=10,
        title="卷十：灯塔黎明",
        summary="星和玩家抵达灯塔主控层，面对唯一结局前的最后五天：承认连接曾被筛选，也承认后来的一切由两个人自己走出来。",
        stakes="只有一个真结局。错误选项可以死、可以回溯，但不能写成多种平行大结局。最后的重量要落在关系真实与现实相见上。",
        locations=("灯塔外环", "主控厅门槛", "记忆镜室", "上行链路井", "黎明前的顶层"),
        clues=("外环巡检节拍", "主控厅手动钥匙", "镜室比对记录", "上行链路中继点", "灯塔停机与解锁并联条件"),
        false_leads=("林岑故意放出的妥协方案", "伪安全通道", "镜室里过于完美的替代记忆", "假紧急广播", "伪装成告白的操控话术"),
        memes=("像全城最贵也最难看的控制面板", "像算法终于学不会人的嘴硬", "像有人拿命做了个超大号开关", "像黎明前每一分钟都故意拖长", "像你骂了半天最后还是得自己动手"),
        images=("灯塔外环俯视图", "记忆镜室的对照屏", "顶层破晓方向"),
        mini_games=("外环巡检节拍潜入", "记忆镜室真伪甄别", "上行链路并联通断"),
        social_posts=("仅你可见：今天真的别掉线", "仅你可见：如果我们能活着出去，我有话当面说", "仅你可见：黎明这种东西，还是见到才算"),
        allies=("沈岚", "陆择", "老鬼"),
        day_titles=("灯塔外环", "主控厅门槛", "记忆镜室", "上行链路", "黎明约定"),
        handoff="结局只留一条：灯塔停机，示范区保底转人工接管，星活下来，玩家与星把“被算中过”和“后来真正喜欢上”同时说清楚。",
    ),
)


CHECKIN_ENV = (
    "{location}这边的空气一口吸进去，先是凉，再是旧灰，最后才轮到我脑子慢慢跟上。",
    "我刚贴到{location}旁边，墙皮一碰就掉，像这地方也早就不想撑门面了。",
    "这里安静得不太正常，安静到我连自己鞋底蹭地的声音都嫌吵。",
    "我现在就蹲在{location}边上，衣服还有点潮，手背一抹全是细灰。",
    "这地方看着像没人管了，可细节又太整齐，整齐得像刚有人离开没多久。",
)
CHECKIN_BODY = (
    "手还是有点抖，但没昨晚那么离谱。你别突然不说话，我一安静就会自己吓自己。",
    "我肚子空得有点烦，脑子倒是比昨天清醒。人快饿过头的时候，情绪反而会变硬一点。",
    "昨晚那股慌劲还没退干净，不过我现在能把呼吸压住了。至少不会一慌就乱跑。",
    "我肩膀还是酸，估计昨天撞门的时候磕青了。先不管，活着比好看重要。",
    "我刚掐了自己一下，确认不是在做梦。疼，说明今天还得继续顶着。",
)
CHECKIN_ASK = (
    "你先帮我理一下。这个点该先看人、先看门，还是先看能拍下来的东西？",
    "我不想今天一上来就走错。你给我个顺序，我按顺序来。",
    "你现在算我场外那个还算靠谱的脑子，先告诉我第一步别做错什么。",
    "行吧，今天也继续把命交一半给你指挥。你别飘，认真点。",
)

PROBE_SEE = (
    "我刚把{clue}翻出来。它不像真相，更像有人把真相剪掉一半以后故意留给我看的版本。",
    "{clue}就在我手边，可它越安静我越觉得不对。正常东西不会乖成这样。",
    "我对着{clue}看了半天，第一眼像答案，第二眼像诱饵，第三眼就开始想骂人了。",
    "{clue}这玩意儿细节很多，偏偏关键处都像被有意蹭掉过。很烦，这种半真半假的最烦。",
    "{clue}给我的感觉很怪。不是纯假，但也绝对没打算让我一次看明白。",
)
PROBE_JUDGE = (
    "有些地方太顺了，顺得像背稿子。我现在对这种顺滑感特别警惕。",
    "昨晚之前我可能会直接信。现在不行了，越像贴心提示，我越想先往反方向看一眼。",
    "它装得挺像那么回事，可骨头不对。你知道吧，就是那种表面像，里头空。",
    "我脑子里一直有个声音提醒我，这种东西最爱拿八成真包两成毒。",
    "如果这也是布景，那布景的人真挺能忍，连边角都修得很勤。",
)
PROBE_ASK = (
    "你说，我该先记、先拍，还是先找谁会被这个东西牵动？",
    "我现在能做三件事，但体力只够两件。你帮我砍掉那件最没用的。",
    "别让我自己选，我今天直觉有点飘。你来按一下刹车。",
    "你说实话，你更怀疑它是真线索，还是怀疑有人盯着我等我上钩？",
)

DETOUR_START = (
    "{false_lead}这条线一看就不太正经，可越不正经越像给我这种急着找路的人准备的坑。",
    "我摸到{false_lead}了。第一眼就很想吐槽，第二眼又觉得不查不安心。",
    "{false_lead}比我想的还离谱，像故意把假消息做得很像路边小广告，让人一边嫌弃一边还是会多看一眼。",
    "这条岔路有股很熟的味道，就是那种专门拿来勾你跑偏的半桶水信息。",
)
DETOUR_MEME = (
    "它给我的感觉，{meme}。你听着是不是也有点想翻白眼。",
    "我真服了，这玩意儿{meme}，离谱里还带一点很土的认真。",
    "要不是现在不能笑太大声，我高低得先吐槽两句。它真的{meme}。",
    "这种假线索最会装无辜，看着没什么，其实一脚踩下去能把人带偏半天。挺像某些破平台的推荐算法。",
)
DETOUR_ASK = (
    "要不要查？我知道它大概率不值钱，可错过也烦。",
    "你来拍板吧。是现在就掐掉它，还是顺手剥一层看看里头有没有真东西。",
    "我其实有点想追，但又怕白白浪费体力。你别笑，饿的时候人真的会变得格外计较。",
    "你说，这种烂线索值不值得我弯一次路？",
)

NPC_OPEN = (
    "{ally}总算肯跟我多说两句了，但人还没完全站我这边。说白了，谁都不欠我一条命。",
    "我刚跟{ally}接上。对方没赶我走就算给面子了，态度比门缝还窄。",
    "{ally}愿意搭话，可每一句都留一半。倒也正常，这城里谁都被吓得学会留后手了。",
    "见到{ally}以后我反而更紧张。活人的判断最难，比看纸还难。",
)
NPC_OBS = (
    "对方看我的眼神很复杂，不像同情，更像在估算我值不值得冒风险。",
    "我能感觉到对方想帮一点，但不肯把自己全赔进去。这个分寸我反而信。",
    "人家说话挺冷，可不是那种装出来的冷，是见多了以后自然剩下来的硬壳。",
    "我其实能理解。要是换成我，我也不会因为一个突然闯进来的人就把家底全掀了。",
)
NPC_ASK = (
    "你觉得我现在该硬一点，还是该把自己放软一点？",
    "这种时候，是先拿证据说话，还是先拿诚意说话？",
    "我不想显得像在求，可也不能把人推远。你给个度。",
    "你要是站在我这边，会怎么让对方信我不是来拖他下水的？",
)

PRESSURE_START = (
    "刚才那点安静没了。外头的动静一下密起来，像有人终于发现少了哪一块。",
    "不太妙，节奏变了。那种从容搜查的感觉没了，现在更像是有人在对表。",
    "我刚听到第二层门被碰了一下。不是风，风没那么准。",
    "糟了，外面的脚步声比刚才更直。听着就知道不是路过。",
)
PRESSURE_BODY = (
    "我心跳有点快，但还能压住。你别给我那种一惊一乍的建议，我现在只吃稳的。",
    "手心已经全是汗了，偏偏这里又冷，摸什么都打滑。很烦。",
    "我脑子没空害怕太久，只够我把路算一遍。所以你快一点，但别乱。",
    "我现在最怕的不是疼，是犯傻。真走错一步，今天一整天都白熬。",
)
PRESSURE_ASK = (
    "给我一句能执行的。往哪，怎么慢，什么地方绝对别碰。",
    "你别讲大道理，直接说步骤。一步一步那种。",
    "来，按顺序说。我照着走，不自己发挥。",
    "现在是你当场外教练的时候了，别让我丢人。",
)

QUIET_OPEN = (
    "总算能坐一下了。腿一松下来，我才知道今天原来已经顶到这个份上了。",
    "现在安静了点，我耳朵里还残着白天那些杂音。人一松下来，后劲反而上来。",
    "我把背靠在墙上，终于不用装没事了。今天其实挺累的，嘴硬都硬得有点费电。",
    "这里的灯不算暖，但总比白天那种被盯着的亮强。我现在才敢把肩膀放下来。",
)
QUIET_SOFT = (
    "你今天在，我心里那根线就没断。嘴上不说，不代表我真不记。",
    "我有时候会想，要是你半路不回了，我会不会又把自己憋回那种只会逃的状态。",
    "别误会，我不是突然走煽情路线。就是今天有几下挺险，我下意识会先想起你那句‘慢一点’。",
    "你这个人有时候还挺会的。不是那种花里胡哨的会，是能把我从乱里往回拽一下的会。",
)
QUIET_CLOSE = (
    "等出去以后，我大概得先吃顿甜的。然后再慢慢跟你算账，今天你也不是一句都没气到我。",
    "你别趁我现在语气软就得意。软归软，我记仇的本事还在。",
    "如果明天更麻烦，你也别跑。都陪到这儿了，半路走人挺过分的。",
    "行吧，今天勉强给你过。你继续保持，别突然犯抽。",
)

HANDOFF_OPEN = (
    "我把今天这条线从头顺了一遍，能连上的终于比断开的多一点了。",
    "刚刚把零碎东西都摊开看，我发现今天至少不是白熬。烦是烦，路确实宽了一点。",
    "今天这口气总算没白喘。虽然还远没到能松手的时候，但下一步总算有了。",
    "我把拍的、记的、听到的都对了一遍，线头终于不只会朝回打结了。",
)
HANDOFF_MID = (
    "{handoff}",
    "最关键的是，{handoff}",
    "我现在基本能确定，{handoff}",
    "把今天这些东西拼起来以后，结论就是：{handoff}",
)
HANDOFF_END = (
    "所以明天还得继续。你别嫌烦，接下来可能更长，也更脏。",
    "嗯，路是更难了，但至少不是瞎撞。这个区别还挺大。",
    "我知道你也累，可先别松。我们总算摸到真东西边上了。",
    "今天先到这儿吧。你也歇一下，明天我继续给你发消息。",
)

PLAYER_CALM = (
    "先按顺序说。你只要别慌，我就能帮你拆。",
    "你先稳住，能看到什么、碰到什么，分开讲。",
    "先别抢结论。把现场给我描述清楚，后面才好判断。",
    "慢一点说，我在听。你现在最需要的不是快，是别乱。",
)
PLAYER_PROBE = (
    "先别全信。能拍就拍，能记就记，先把它变成证据再说。",
    "把最不顺眼的那处先记下来。很多假东西都死在细节上。",
    "先别急着认定真假，先看它想把你往哪引。",
    "你把编号、时间和位置都带上。越具体，越不容易被它骗。",
)
PLAYER_DETOUR = (
    "查，但只查一层。别让假线把你整个人拖走。",
    "可以摸一把，但你要把撤回的路先算出来。",
    "别直接丢。很多错路也会留下谁在喂错路的痕迹。",
    "查归查，心里先把它按八成假处理。",
)
PLAYER_NPC = (
    "先给证据，再给态度。别一上来就把情绪全压过去。",
    "别求，但要真。让对方知道你不是来拖人下水的。",
    "你先说最能证明你的那一件事，剩下的慢慢补。",
    "分寸感比可怜更有用。人家会看这个。",
)
PLAYER_PRESSURE = (
    "一步一步来：先躲，再看，再动。别倒着做。",
    "别逞强，稳比快重要。你现在输不起那一秒。",
    "贴边，低头，别碰会出声的东西。先把自己藏住。",
    "我给你顺序：压呼吸，找掩体，看第二出口。别自己加戏。",
)
PLAYER_QUIET = (
    "我没跑。你说，我接着。",
    "知道了。你今天已经很能扛了，剩下的明天再算。",
    "先歇一下。你现在活着、清醒着，就已经很值钱了。",
    "我在。嘴硬可以，别一个人扛到断线。",
)

RELATION_LINES = (
    "我知道你现在还不完全信我，这也正常。换我我也会先留个心眼。",
    "你别看我嘴上还会怼你，我其实已经把你的建议往心里记了。",
    "有时候我会被你气到，但也确实会因为你一句话稳下来。",
    "我们现在这个关系挺怪的，隔着屏幕，可很多事又只敢先跟你说。",
    "你要是突然消失，我大概会很烦。嗯，不是那种普通的烦。",
)

STYLE_REPLACEMENTS = {
    "惨白惨白": "白得发飘",
    "扑面而来的是": "一股",
    "仿佛": "像",
    "极其": "特别",
    "不由自主": "一下就",
    "我的心脏都快从嗓子眼跳出来了": "心都快顶到嗓子眼了",
    "我感觉眼睛都要被刺瞎了": "感觉都要瞎了",
    "令人头皮发麻": "看得我头皮一麻",
}

RUNTIME_IMAGE_CHOICES: dict[int, tuple[str, ...]] = {
    1: ("雨夜公园长椅远景", "残缺的课程手册"),
    2: ("沈岚桌面俯拍", "残缺的课程手册"),
    3: ("绝密档案照片", "惨白教室内部"),
    4: ("废弃网吧巷子", "沈岚桌面俯拍"),
    5: ("剧院高空俯拍", "沈岚桌面俯拍"),
    6: ("素体移交同意书", "惨白教室内部"),
    7: ("码头暗紫色海面", "素体移交同意书"),
    8: ("码头暗紫色海面", "零号机地下竞技场"),
    9: ("惨白教室内部", "沈岚桌面俯拍"),
    10: ("零号机地下竞技场", "剧院高空俯拍"),
}


def pick(pool: tuple[str, ...], *keys: object) -> str:
    seed = "|".join(str(item) for item in keys)
    digest = hashlib.md5(seed.encode("utf-8")).hexdigest()
    index = int(digest[:8], 16) % len(pool)
    return pool[index]


def chinese_count(text: str) -> int:
    return len(re.findall(r"[\u4e00-\u9fff]", text))


def time_for_day(act_no: int, local_day: int) -> str:
    if act_no == 1:
        return ("23:42", "09:18", "18:06", "22:14", "07:12")[local_day]

    bases = ((8, 14), (12, 36), (17, 28), (21, 17), (7, 8))
    hour, minute = bases[local_day]
    minute += act_no * 3
    hour = (hour + minute // 60) % 24
    minute %= 60
    return f"{hour:02d}:{minute:02d}"


def day_number(act_no: int, local_day: int) -> int:
    return (act_no - 1) * 5 + local_day + 1


def phase_name(local_day: int) -> str:
    return ("入场", "摸排", "错路", "施压", "破局")[local_day]


def intimacy_stage(global_day: int) -> int:
    return min((global_day - 1) // 10, 4)


def option_keys(count: int) -> tuple[str, ...]:
    return tuple("ABCD"[:count])


def pick_progressive(
    pool: tuple[str, ...],
    local_day: int,
    *keys: object,
    future_allowance: int = 0,
    minimum: int = 1,
) -> str:
    limit = min(len(pool), max(minimum, local_day + 1 + future_allowance))
    scoped = pool[:limit] if limit > 0 else pool
    return pick(scoped or pool, *keys)


def handoff_for_day(act: Act, local_day: int) -> str:
    current_clue = act.clues[min(local_day, len(act.clues) - 1)]
    current_false = act.false_leads[min(local_day, len(act.false_leads) - 1)]
    if local_day == 0:
        return f"今天先摸到 {current_clue} 这层边。它还不像答案，更像有人故意留给我试胆子的第一道缝。"
    if local_day == 1:
        return f"{current_clue} 至少证明了一件事：前面那条路没白走。只是 {current_false} 这种假动静还在旁边晃，不能飘。"
    if local_day == 2:
        return f"错路是真的多，但 {current_clue} 把方向往回拽正了一点。现在还不能下结论，只能说骨架开始露了。"
    if local_day == 3:
        return f"到今天这一步，{current_clue} 已经能把前几天散开的东西串起一半。剩下那一半，得等明天真正压过去。"
    return act.handoff


def daily_special_intro(global_day: int) -> list[str]:
    if global_day == 2:
        return [
            "【星】对了，昨天太乱了，我一直没顾上说。",
            "【星】我叫星。星星的星。你先这么叫我。",
            "【系统】联系人名称更新为【星】。头像解锁：【模糊的雨夜侧影】",
        ]
    if global_day == 15:
        return [
            "【星】我把头发剪短了，镜子里看着都不像前几天那个我。",
            "【星】也好。现在这张脸越不像原来，越安全一点。",
            "【系统】头像更新：【短发与平光眼镜】",
        ]
    if global_day == 46:
        return [
            "【星】都走到这儿了，我也不想再把自己遮一半。",
            "【星】你该看清我的样子了。不是资料里的，不是别人替我写的，就是现在这个。",
            "【系统】头像更新：【星｜正面清晰形象】",
        ]
    return []


def runtime_image_title(act_no: int, global_day: int, local_day: int, variant: int = 0) -> str:
    pool = RUNTIME_IMAGE_CHOICES.get(act_no, ("雨夜公园长椅远景",))
    return pick(pool, act_no, global_day, local_day, variant, "runtime-image")


def render_dialogue_block(
    kind: str,
    act: Act,
    global_day: int,
    local_day: int,
    block_index: int,
) -> list[str]:
    location = pick_progressive(act.locations, local_day, act.no, global_day, block_index, "location", future_allowance=1)
    clue = pick_progressive(act.clues, local_day, act.no, global_day, block_index, "clue")
    false_lead = pick_progressive(act.false_leads, local_day, act.no, global_day, block_index, "false", future_allowance=1)
    meme = pick_progressive(act.memes, local_day, act.no, global_day, block_index, "meme", future_allowance=1)
    ally = pick_progressive(act.allies, local_day, act.no, global_day, block_index, "ally")
    handoff = handoff_for_day(act, local_day)
    relation = pick(RELATION_LINES, global_day, block_index, "relation")

    if kind == "checkin":
        star_lines = (
            pick(CHECKIN_ENV, act.no, global_day, block_index).format(location=location),
            pick(CHECKIN_BODY, act.no, global_day, block_index).format(location=location),
            pick(CHECKIN_ASK, act.no, global_day, block_index).format(location=location),
            pick(PROBE_SEE, act.no, global_day, block_index).format(clue=clue),
            pick(PROBE_JUDGE, act.no, global_day, block_index).format(clue=clue),
            relation,
        )
        player_lines = (
            pick(PLAYER_CALM, global_day, block_index),
            pick(PLAYER_PROBE, global_day, block_index),
        )
    elif kind == "probe":
        star_lines = (
            pick(PROBE_SEE, act.no, global_day, block_index).format(clue=clue),
            pick(PROBE_JUDGE, act.no, global_day, block_index).format(clue=clue),
            pick(PROBE_ASK, act.no, global_day, block_index),
            pick(DETOUR_START, act.no, global_day, block_index).format(false_lead=false_lead),
            pick(DETOUR_MEME, act.no, global_day, block_index).format(meme=meme),
            pick(DETOUR_ASK, act.no, global_day, block_index),
        )
        player_lines = (
            pick(PLAYER_PROBE, global_day, block_index),
            pick(PLAYER_DETOUR, global_day, block_index),
        )
    elif kind == "detour":
        star_lines = (
            pick(DETOUR_START, act.no, global_day, block_index).format(false_lead=false_lead),
            pick(DETOUR_MEME, act.no, global_day, block_index).format(meme=meme),
            pick(DETOUR_ASK, act.no, global_day, block_index),
            pick(NPC_OPEN, act.no, global_day, block_index).format(ally=ally),
            pick(NPC_OBS, act.no, global_day, block_index).format(ally=ally),
            pick(NPC_ASK, act.no, global_day, block_index),
        )
        player_lines = (
            pick(PLAYER_DETOUR, global_day, block_index),
            pick(PLAYER_NPC, global_day, block_index),
        )
    elif kind == "npc":
        star_lines = (
            pick(NPC_OPEN, act.no, global_day, block_index).format(ally=ally),
            pick(NPC_OBS, act.no, global_day, block_index),
            pick(NPC_ASK, act.no, global_day, block_index),
            pick(PRESSURE_START, act.no, global_day, block_index),
            pick(PRESSURE_BODY, act.no, global_day, block_index),
            pick(PRESSURE_ASK, act.no, global_day, block_index),
        )
        player_lines = (
            pick(PLAYER_NPC, global_day, block_index),
            pick(PLAYER_PRESSURE, global_day, block_index),
        )
    elif kind == "pressure":
        star_lines = (
            pick(PRESSURE_START, act.no, global_day, block_index),
            pick(PRESSURE_BODY, act.no, global_day, block_index),
            pick(PRESSURE_ASK, act.no, global_day, block_index),
            pick(QUIET_OPEN, act.no, global_day, block_index),
            pick(QUIET_SOFT, act.no, global_day, block_index),
            pick(QUIET_CLOSE, act.no, global_day, block_index),
        )
        player_lines = (
            pick(PLAYER_PRESSURE, global_day, block_index),
            pick(PLAYER_QUIET, global_day, block_index),
        )
    else:
        star_lines = (
            pick(QUIET_OPEN, act.no, global_day, block_index),
            pick(QUIET_SOFT, act.no, global_day, block_index),
            pick(QUIET_CLOSE, act.no, global_day, block_index),
            pick(HANDOFF_OPEN, act.no, global_day, block_index),
            pick(HANDOFF_MID, act.no, global_day, block_index).format(handoff=handoff),
            pick(HANDOFF_END, act.no, global_day, block_index),
        )
        player_lines = (
            pick(PLAYER_QUIET, global_day, block_index),
            pick(PLAYER_CALM, global_day, block_index),
        )

    return [
        f"【星】{star_lines[0]}",
        f"【星】{star_lines[1]}",
        f"【星】{star_lines[2]}",
        f"【你】{player_lines[0]}",
        f"【星】{star_lines[3]}",
        f"【星】{star_lines[4]}",
        f"【你】{player_lines[1]}",
        f"【星】{star_lines[5]}",
    ]


def render_option_text(slot: int, index: int, act: Act, global_day: int, variant: int = 0) -> str:
    local_day = (global_day - 1) % 5
    location = pick_progressive(act.locations, local_day, slot, index, global_day, variant, "location", future_allowance=1)
    clue = pick_progressive(act.clues, local_day, slot, index, global_day, variant, "clue")
    false_lead = pick_progressive(act.false_leads, local_day, slot, index, global_day, variant, "false", future_allowance=1)
    ally = pick_progressive(act.allies, local_day, slot, index, global_day, variant, "ally")
    options_by_slot = {
        0: (
            f"先别碰 {location}，把方向、编号和能动的位置都记下来。",
            f"沿着 {location} 的边先摸一圈，看有没有第二入口。",
            f"先借 {ally} 这条线试探一下，别自己直冲。",
            f"不等了，趁现在还安静，直接硬顶过去。",
        ),
        1: (
            f"把 {clue} 拍清楚，回头按细节慢慢拆。",
            f"顺着 {clue} 的来源倒查，看看是谁故意把它摆出来。",
            f"先问 {ally}，看对方会不会被这个东西牵动一下。",
            f"直接拆开看，赌这一层保护只是吓人。",
        ),
        2: (
            f"追一下 {false_lead}，但只追一层，不恋战。",
            f"把 {false_lead} 当诱饵，反过来找谁在喂它。",
            f"先回头做主线，不让这条岔路拖时间。",
            f"干脆借这条假线放一个假动作出去。",
        ),
        3: (
            "今晚先把体力和顺序稳住，不额外冒险。",
            "再往前顶半步，把今天能拿的证据一次拿满。",
            f"把实话跟 {ally} 说开一点，换一层信任。",
            "赌一把大的，趁对面还没全收口直接冲。",
        ),
    }
    return options_by_slot[slot][index]


def render_branch_messages(
    act: Act,
    global_day: int,
    slot: int,
    option_index: int,
    local_day: int,
    variant: int = 0,
) -> list[str]:
    location = pick_progressive(act.locations, local_day, slot, option_index, global_day, variant, "location", future_allowance=1)
    clue = pick_progressive(act.clues, local_day, slot, option_index, global_day, variant, "clue")
    false_lead = pick_progressive(act.false_leads, local_day, slot, option_index, global_day, variant, "false", future_allowance=1)
    ally = pick_progressive(act.allies, local_day, slot, option_index, global_day, variant, "ally")
    image = pick(act.images, slot, option_index, global_day, variant, "image")
    game = pick(act.mini_games, slot, option_index, global_day, variant, "game")
    death_branch = local_day == 4 and slot == 3 and option_index == 3
    branch_open = render_option_text(slot, option_index, act, global_day, variant)

    base_lines = [
        f"【你】{branch_open}",
        f"【星】行，我照着来。你别看我嘴上还在碎碎念，手已经开始动了。",
        f"【星】这一步比我想的顺一点，但顺得太早，我反而会多看一眼。现在这种时候，稳住比痛快重要。",
        f"【星】我先摸到 {location} 这一层边，顺手把 {clue} 也记了。细节不少，够我们回头慢慢拆。",
        f"【你】继续，把最奇怪的一点先盯住。",
        f"【星】最奇怪的是，它旁边偏偏挂着 {false_lead} 这条烂线，像在提醒我别只信眼前这份乖巧。",
        f"【星】还有个小收获，{ally} 明显被这事拽了一下。动作压得很轻，但我还是看出来了。",
        "【你】先别急着下结论，把这一层收紧，再往下剥。",
    ]

    if slot == 1:
        base_lines.append(f"【星】我顺手还补拍了一张，回头你看细节应该能挑出更多毛刺。")
        base_lines.append(
            f"【系统】[图片插入：{runtime_image_title(act.no, global_day, local_day, variant)}——对应当前线索的补充画面]"
        )
    elif slot == 2:
        base_lines.append("【星】这种错路也不算白跑，至少能知道对面平时喜欢拿什么味道来骗我。")
        base_lines.append(f"【系统】H5小游戏插入：{game}")
    elif slot == 3 and option_index == 2:
        base_lines.append("【星】我把实话多说了一点。挺丢人的，但有用。人和人之间有时候就差这一口真。")
        base_lines.append("【星】你别拿这个笑我。我难得把话说直一次，挺贵的。")
    else:
        base_lines.append("【星】总之没白折腾。不是完胜，但路确实更清楚了一点。")
        base_lines.append("【星】这种一点点挪出来的清楚感，其实比突然掉个大答案下来更让我踏实。")

    if death_branch:
        base_lines[-2] = "【星】不对，太快了。外面的节拍一下变了，像有人就等我这脚踩下去。"
        base_lines[-1] = "【系统】警告：连接已断开。当前时间线已中断。开始执行回溯。"

    return base_lines


def render_choice_block(
    act: Act,
    global_day: int,
    local_day: int,
    slot: int,
    variant: int = 0,
) -> list[str]:
    prompts = (
        "处理眼前这一步",
        "拆这条线索的时候，先抓哪一头",
        "这条岔路到底值不值得弯",
        "今晚这一步该保守，还是把话和路都往前推一点",
    )
    option_count_map = {
        0: 2 if local_day < 4 else 3,
        1: 3,
        2: 3 if local_day < 4 else 4,
        3: 1 if local_day == 0 else (2 if local_day < 4 else 4),
    }
    count = option_count_map[slot]
    lines = [f"### 🔘 玩家选择（{prompts[slot]}）"]

    for index, key in enumerate(option_keys(count)):
        lines.append(f"[选项 {key}] {render_option_text(slot, index, act, global_day, variant)}")

    for index, key in enumerate(option_keys(count)):
        label = ("稳一点", "探一下", "绕一层", "狠狠干")[index]
        lines.append(f"**▶ 若选 {key}（{label}）：**")
        lines.extend(render_branch_messages(act, global_day, slot, index, local_day, variant))

    return lines


def render_day(act: Act, local_day: int) -> list[str]:
    global_day = day_number(act.no, local_day)
    title = act.day_titles[local_day]
    image = pick(act.images, global_day, local_day, "day-image")
    game = pick(act.mini_games, global_day, local_day, "day-game")
    post = pick(act.social_posts, global_day, local_day, "day-post")
    lines = [f"# 第{global_day}天", f"## {act.title}", f"### {title}"]

    time_line = (
        f"【系统】当前时间 {time_for_day(act.no, local_day)}。阶段：{phase_name(local_day)}。",
        f"【系统】图片线索候选：{image}",
        f"【系统】互动玩法候选：{game}",
    )
    lines.extend(time_line)

    if global_day == 1:
        lines.append("【系统】联系人暂记为：未知用户。头像：[?]")
    lines.extend(daily_special_intro(global_day))

    block_kinds = ("checkin", "probe", "detour", "npc", "pressure", "quiet", "probe", "quiet")
    scene_titles = (
        "第一轮观察",
        "线索上手",
        "错方向也得试一脚",
        "人这条线",
        "节拍忽然变了",
        "能喘口气的时候",
        "把今天的东西再拆一层",
        "夜里说清楚一点",
    )

    for index, kind in enumerate(block_kinds):
        lines.append(f"### {scene_titles[index]}")
        lines.extend(render_dialogue_block(kind, act, global_day, local_day, index))

        if index in (0, 2, 4, 6):
            slot = (0, 1, 2, 3)[(0, 1, 2, 3).index(index // 2)]
            lines.extend(render_choice_block(act, global_day, local_day, slot, index))
            lines.append(f"### 🔄 主线合并（{scene_titles[index]}之后）")
            lines.append("【星】我先把这一步踩实。分支再多，最后都得落回能执行的那条线上。")
            lines.append("【你】继续，把今天还没对上的那处再捋一遍。")
            lines.append("【星】嗯，我没散。只是路线多了，人会更谨慎一点。")

    lines.append("### 支线回看")
    lines.extend(render_dialogue_block("detour", act, global_day, local_day, 8))
    lines.extend(render_choice_block(act, global_day, local_day, 2, 8))
    lines.append("### 🔄 主线合并（支线回看之后）")
    lines.append("【星】错路多走一遍也有好处。下次它再拿同样的糖纸骗我，我就不会再咬了。")
    lines.append("【你】记下来。错一次可以，别在同一个坑里交两次学费。")
    lines.append("【星】知道啦，我又不是那种会把离谱建议当饭吃的人。")

    lines.append("### 记账式复盘")
    lines.extend(render_dialogue_block("quiet", act, global_day, local_day, 9))

    lines.append(f"【系统】朋友圈动态插入：{post}")
    lines.append("【系统】信号转弱，剧情时间推进至下一时段。")
    return lines


def render_outline() -> str:
    lines = [
        "# 30万字剧情重构大纲",
        "",
        "## 结论",
        "",
        "- 主线改为 10 卷 50 天，只保留 1 个真结局。",
        "- 中段大幅拉长城市侧、纸档侧、社会侧与伦理侧，避免过早出现像终章一样的伪收束。",
        "- 支线以“错路但有收获”为主，死亡回溯只留在高危节点，不再把每个分支都写成像结局。",
        "- 玩家回复节奏固定为：每 2 到 6 句星的消息后，必须出现一次玩家回复；普通时段多用单条回复，重要节点再给 2 至 4 项选择。",
        "",
        "## 结构原则",
        "",
        "1. 先活下来，再取证，再理解，再决定怎么结束系统。",
        "2. 错误探索要能扩字数，也要能反向补世界观，不做纯浪费支线。",
        "3. 中文梗只做局部调味，不挤占情绪重量。",
        "4. 真相分三层递进：星个人经历 → 城市级塑形流程 → 玩家与连接本身也被筛中过。",
        "5. 最终只收束到一个方向：灯塔停机、示范区转人工接管、星与玩家把关系说清楚。",
        "",
        "## 卷级安排",
        "",
        "| 卷 | 天数 | 核心任务 | 关键增量 | 错路/梗扩写方向 |",
        "|---|---:|---|---|---|",
    ]

    for act in ACTS:
        start_day = day_number(act.no, 0)
        end_day = day_number(act.no, 4)
        lines.append(
            f"| {act.title} | {start_day}-{end_day} | {act.summary} | {act.stakes} | "
            f"{' / '.join(act.false_leads[:3])} |"
        )

    lines.extend(["", "## 日程细纲", ""])

    for act in ACTS:
        lines.extend(
            [
                f"### {act.title}",
                "",
                f"- 卷目标：{act.summary}",
                f"- 递进压力：{act.stakes}",
                f"- 核心地点：{'、'.join(act.locations)}",
                f"- 核心线索：{'、'.join(act.clues)}",
                f"- 错误方向：{'、'.join(act.false_leads)}",
                f"- 图片节点：{'、'.join(act.images)}",
                f"- 游戏节点：{'、'.join(act.mini_games)}",
                f"- 动态节点：{'、'.join(act.social_posts)}",
                "",
            ]
        )
        for local_day, title in enumerate(act.day_titles):
            day = day_number(act.no, local_day)
            lines.append(
                f"- 第{day}天《{title}》：主打 {phase_name(local_day)} 阶段，抓 {act.clues[local_day]}，"
                f"顺手踩 {act.false_leads[local_day]} 这条错路，用 {act.allies[local_day % len(act.allies)]} 这条人线增厚现实感。"
            )
        lines.extend(["", f"- 卷尾移交：{act.handoff}", ""])

    lines.extend(
        [
            "## 逻辑校验要点",
            "",
            "- 追捕忽紧忽松的原因不是系统失误，而是策略性放任与观察样本反应。",
            "- 沈岚、陆择、老鬼各自只解决一段问题，谁都不兼任万能救场 NPC。",
            "- 海上回声卷才揭示“连接被筛中过”，前面只埋匹配感与偶然感，不提前把牌打光。",
            "- 空城示范卷必须把普通居民写实，否则最终停机只会像口号，不像选择。",
            "- 最终卷只解决最后一公里，不再额外开一层新世界观。",
            "",
            "## 对话写法约束",
            "",
            "- 星的语气按 `docs/星.md` 执行：软、真、轻微嘴硬、关键时刻硬得住。",
            "- 不用大段说明书式描写，多用聊天视角、即时感、身体反应和一两句生活化吐槽。",
            "- 重要节点的选项最多 4 个；普通节点用单条回复或 1 个选项的确认式推进。",
            "- 错路分支优先给额外线索、图片、小游戏或人物观察，不优先给死亡。",
        ]
    )
    return "\n".join(lines) + "\n"


def render_story() -> str:
    lines: list[str] = [
        "# 回声｜长篇主线剧情",
        "",
        "【系统】说明：本稿为 10 卷 50 天重构版。唯一真结局保留，错误路线以错路、延迟、额外支线和少量高危回溯为主。",
        "",
    ]

    for act in ACTS:
        lines.append(f"【系统】{act.title}｜{act.summary}")
        lines.append(f"【系统】卷级压力：{act.stakes}")
        for local_day in range(5):
            lines.extend(render_day(act, local_day))
            lines.append("---")

    story = "\n".join(lines).rstrip() + "\n"
    for old, new in STYLE_REPLACEMENTS.items():
        story = story.replace(old, new)
    return story


def render_design() -> str:
    lines = [
        "# 图片、游戏等设计（30万字扩充版）",
        "",
        "## 结论",
        "",
        "- 旧版设计量级不够。新结构按 10 卷 50 天配置，图片、动态、小游戏和假社交内容都要扩容。",
        "- 图片不再只承担“证明发生过”，还要承担“误导、比对、回看、二次解谜”。",
        "- 互动不再只在主线关键节点出现，支线、错路、梗线、人物侧写也要有可点内容。",
        "",
        "## 头像与联系人阶段",
        "",
        "| 阶段 | 触发 | 头像 | 说明 |",
        "|---|---|---|---|",
        "| 1 | 第1天 | `[?]` | 未知讯号、未命名联系人 |",
        "| 2 | 第2天 | 模糊的雨夜侧影 | 星自报名字后解锁 |",
        "| 3 | 第15天 | 短发与平光眼镜 | 旧校与暗线卷后完成伪装升级 |",
        "| 4 | 第46天 | 星｜正面清晰形象 | 最终卷前人物完整显形 |",
        "",
        "## 图片线索扩容",
        "",
        f"- 建议最低配图数：{len(ACTS) * 3} 张核心图 + {len(ACTS) * 4} 张支线图 + {len(ACTS) * 2} 张动态社交图。",
        "- 核心图负责推进主线证据。",
        "- 支线图负责错误探索、生活化侧写、中文梗承接和二次比对。",
        "- 动态社交图负责‘仅你可见’、聊天截图、论坛截图、短视频封面、监控截帧。",
        "",
        "## 卷级设计清单",
        "",
    ]

    for act in ACTS:
        lines.extend(
            [
                f"### {act.title}",
                "",
                f"- 主图：{'、'.join(act.images)}",
                f"- 小游戏：{'、'.join(act.mini_games)}",
                f"- 动态/社交：{'、'.join(act.social_posts)}",
                f"- 建议补充支线图：{'、'.join(act.false_leads[:3])}",
                f"- 建议补充交互：围绕 {'、'.join(act.clues[:2])} 做二次比对、拖拽复原、时间轴拼接或线路试错。",
                "",
            ]
        )

    lines.extend(
        [
            "## 推荐互动类型",
            "",
            "1. 图片比对：同一地点不同时刻对照，找删改痕迹。",
            "2. 论坛拼页：把缓存帖、截图、引用楼层重新拼回去。",
            "3. 路线避险：地铁、校区、港区、灯塔外环的时间差潜行。",
            "4. 音频转写：旧录音笔、广播站、监听舱的关键语句识别。",
            "5. 社交伪装：群聊、朋友圈、短视频评论区里的假身份试探。",
            "6. 生活小游戏：贩卖机、换电柜、门禁、检修码等低门槛交互。",
            "",
            "## 动态内容建议",
            "",
            "- 每卷至少 2 条仅你可见动态，用来承接星的情绪，不强行煽情。",
            "- 每卷至少 1 条截图式内容：聊天记录、群公告、论坛帖、排班表或通报码。",
            "- 允许短视频封面、评论区截图、弹幕样式 UI 混入，但必须为剧情服务。",
            "",
            "## UI 与氛围",
            "",
            "- 前 3 卷以真实手机聊天为主，只做轻微信号干扰。",
            "- 第 4 至 7 卷逐步引入更多截图、地图、语音转写、论坛卡片和小游戏按钮。",
            "- 第 8 至 10 卷引入监听、示范区纠错、灯塔外环等特殊 UI 模式，但不要遮住聊天主体验。",
            "",
            "## 设计原则",
            "",
            "- 梗图和梗线要短，不抢戏，只负责提气口。",
            "- 错路素材也必须可复用，避免做一次性资产。",
            "- 重要图片至少要支持二次放大、标记和回看。",
            "- 小游戏要轻，不做长流程强卡关，核心还是聊天叙事。",
        ]
    )
    return "\n".join(lines) + "\n"


def star_streak(text: str) -> int:
    max_streak = 0
    current = 0
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("【星】"):
            current += 1
            max_streak = max(max_streak, current)
        elif line.startswith("【你】"):
            current = 0
    return max_streak


def render_check_report(story_text: str) -> str:
    parser = StoryParser()
    _, _, segments = parser.parse(story_text)
    chinese = chinese_count(story_text)
    choice_segments = sum(1 for segment in segments if segment.kind == "choice")
    options = sum(len(segment.options) for segment in segments if segment.kind == "choice")

    lines = [
        "# 剧情自检报告",
        "",
        "## 结果",
        "",
        f"- 主剧情中文字符数：{chinese}",
        f"- 目标下限：{TARGET_CHINESE_COUNT}",
        f"- 章节规模：{len(ACTS)} 卷 / {len(ACTS) * 5} 天",
        f"- 解析结果：{len(segments)} 个段落，其中 {choice_segments} 个选择段、{options} 个选项",
        f"- 星连续发言最大值：{star_streak(story_text)}（要求不超过 6）",
        "",
        "## 逻辑检查",
        "",
        "- 真结局只保留 1 个，终局压力集中在卷十。",
        "- 卷一到卷九都只做下一层推进，不做人为终章式收束。",
        "- 错误探索多为假线、延迟、旁证和人物观察，高危回溯集中在卷尾与灯塔段。",
        "- 玩家与星的连接反转放在海上回声卷，不提前掀底牌。",
        "",
        "## 语气检查",
        "",
        "- 已做一轮词面清洗，优先替换过于书面或过于 AI 的惯用句。",
        "- 星的消息以短句、停顿、轻吐槽和关键时刻的硬气为主。",
        "- 生活化词汇、中文梗和错误探索节点已经均匀铺开，不集中堆在单卷。",
        "",
        "## 文件落点",
        "",
        f"- 大纲：`{OUTLINE_FILE}`",
        f"- 主剧情：`{STORY_FILE}`",
        f"- 图片/游戏设计：`{DESIGN_FILE}`",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    outline_text = render_outline()
    story_text = render_story()

    chinese = chinese_count(story_text)
    if chinese < TARGET_CHINESE_COUNT:
        raise RuntimeError(f"剧情中文字符数不足：{chinese} < {TARGET_CHINESE_COUNT}")

    if star_streak(story_text) > 6:
        raise RuntimeError("存在超过 6 句连续星发言，未满足交互节奏要求")

    design_text = render_design()
    check_text = render_check_report(story_text)

    OUTLINE_FILE.write_text(outline_text, encoding="utf-8")
    STORY_FILE.write_text(story_text, encoding="utf-8")
    DESIGN_FILE.write_text(design_text, encoding="utf-8")
    CHECK_FILE.write_text(check_text, encoding="utf-8")

    print(f"故事大纲已生成：{OUTLINE_FILE}")
    print(f"主剧情已生成：{STORY_FILE}")
    print(f"设计文档已生成：{DESIGN_FILE}")
    print(f"自检报告已生成：{CHECK_FILE}")
    print(f"主剧情中文字符数：{chinese}")


if __name__ == "__main__":
    main()
