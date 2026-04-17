export type ImportedDialogueRole = 'me' | 'other' | 'system'
export type ImportedDialogueVariant = 'message' | 'scene' | 'hint'

export interface ImportedDialogueMessage {
  id: string
  role: ImportedDialogueRole
  text: string
  variant: ImportedDialogueVariant
  delay: number
  typing: number
  hidden: boolean
}

export interface ImportedDialogueChoiceOption {
  id: string
  key: 'A' | 'B' | 'C'
  text: string
  retry: boolean
  branchMessages: ImportedDialogueMessage[]
}

export interface ImportedDialogueSegment {
  id: string
  kind: 'messages' | 'choice'
  scene: string | null
  prompt: string | null
  messages: ImportedDialogueMessage[]
  options: ImportedDialogueChoiceOption[]
}

export const PART_ONE_IMPORTED_TITLE = "第一部 · 雨夜公园"
export const PART_ONE_IMPORTED_CHARACTER = '星'
export const PART_ONE_IMPORTED_SEGMENTS: ImportedDialogueSegment[] = [
  {
    "id": "messages-1",
    "kind": "messages",
    "scene": "场景一：陌生求助",
    "prompt": null,
    "messages": [
      {
        "id": "system-1",
        "role": "system",
        "text": "当前时间 23:42 你收到了一条来自未知号码的消息。",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "other-2",
        "role": "other",
        "text": "喂。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-3",
        "role": "other",
        "text": "有人在吗？",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-4",
        "role": "other",
        "text": "屏幕闪得好厉害……这破手机。",
        "variant": "message",
        "delay": 0,
        "typing": 770,
        "hidden": false
      },
      {
        "id": "other-5",
        "role": "other",
        "text": "还在吗？别不理我。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-6",
        "role": "other",
        "text": "我手机摔坏了，屏幕碎了一大半，不知道为什么只有这个没名字的聊天框能发消息。",
        "variant": "message",
        "delay": 0,
        "typing": 1800,
        "hidden": false
      },
      {
        "id": "other-7",
        "role": "other",
        "text": "外面有人在找我。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-8",
        "role": "other",
        "text": "算我求你，先别报警。",
        "variant": "message",
        "delay": 0,
        "typing": 550,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-5",
    "kind": "choice",
    "scene": null,
    "prompt": "初步试探",
    "messages": [],
    "options": [
      {
        "id": "option-2-a",
        "key": "A",
        "text": "报警？你遇到危险了？你在哪？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-9",
            "role": "me",
            "text": "报警？你遇到危险了？你在哪？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-10",
            "role": "other",
            "text": "临港西区那个小公园。管理站旁边。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-11",
            "role": "other",
            "text": "你这人还算冷静，没有一上来就骂我骗子。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-12",
            "role": "other",
            "text": "我真的遇到麻烦了，大麻烦。",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-3-b",
        "key": "B",
        "text": "又是新型诈骗？骗钱没有，要命一条。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-13",
            "role": "me",
            "text": "又是新型诈骗？骗钱没有，要命一条。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-14",
            "role": "other",
            "text": "……我都这样了你还有心情开玩笑？",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-15",
            "role": "other",
            "text": "我要是骗子，大半夜在暴雨里跟你聊什么？聊这雨下得挺大吗？",
            "variant": "message",
            "delay": 0,
            "typing": 1540,
            "hidden": false
          },
          {
            "id": "other-16",
            "role": "other",
            "text": "要不是实在没别人能联系，我才不想听你在这扯皮。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-4-c",
        "key": "C",
        "text": "大半夜的发什么疯，你谁啊？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-17",
            "role": "me",
            "text": "大半夜的发什么疯，你谁啊？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-18",
            "role": "other",
            "text": "……没空做详细的自我介绍。",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-19",
            "role": "other",
            "text": "我也希望是我大半夜在发神经。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          },
          {
            "id": "other-20",
            "role": "other",
            "text": "但我是认真的，我现在连呼吸都觉得肺里在灌冷风。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-6",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-21",
        "role": "other",
        "text": "我刚才试过报警了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-22",
        "role": "other",
        "text": "但雨声太大，我连自己到底在哪条路都说不清。",
        "variant": "message",
        "delay": 0,
        "typing": 1155,
        "hidden": false
      },
      {
        "id": "other-23",
        "role": "other",
        "text": "接线员以为我是哪家跑出来恶作剧的高中生，让我找个躲雨的地方等天亮。",
        "variant": "message",
        "delay": 0,
        "typing": 1800,
        "hidden": false
      },
      {
        "id": "other-24",
        "role": "other",
        "text": "等天亮我就没命了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-10",
    "kind": "choice",
    "scene": null,
    "prompt": "追问细节",
    "messages": [],
    "options": [
      {
        "id": "option-7-a",
        "key": "A",
        "text": "离家出走的高中生？你到底多大？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-25",
            "role": "me",
            "text": "离家出走的高中生？你到底多大？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-26",
            "role": "other",
            "text": "这是重点吗？？",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-27",
            "role": "other",
            "text": "你关注点好奇怪啊。十七，大概吧。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-28",
            "role": "other",
            "text": "这不重要，重要的是找我的那些人不是开玩笑的。",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-8-b",
        "key": "B",
        "text": "那你跟警察说有人追杀你啊！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-29",
            "role": "me",
            "text": "那你跟警察说有人追杀你啊！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-30",
            "role": "other",
            "text": "我说了！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-31",
            "role": "other",
            "text": "但他们听见我这边的背景音，还有这莫名其妙的旧手机定位，根本不信！",
            "variant": "message",
            "delay": 0,
            "typing": 1760,
            "hidden": false
          },
          {
            "id": "other-32",
            "role": "other",
            "text": "算了，指望不上。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-9-c",
        "key": "C",
        "text": "连自己在哪都不知道，我怎么帮你？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-33",
            "role": "me",
            "text": "连自己在哪都不知道，我怎么帮你？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-34",
            "role": "other",
            "text": "我就在那个小公园里！这地方像个迷宫。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          },
          {
            "id": "other-35",
            "role": "other",
            "text": "你别急啊……我现在脑子很乱。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-11",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-36",
        "role": "other",
        "text": "他们还在找。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-37",
        "role": "other",
        "text": "三个穿黑色防雨夹克的人。",
        "variant": "message",
        "delay": 0,
        "typing": 660,
        "hidden": false
      },
      {
        "id": "system-38",
        "role": "system",
        "text": "图片：雨夜公园长椅远景——昏暗路灯下雨水反光，远处有模糊的黑衣人影",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "other-39",
        "role": "other",
        "text": "你自己看吧。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-15",
    "kind": "choice",
    "scene": null,
    "prompt": "对照片的反应",
    "messages": [],
    "options": [
      {
        "id": "option-12-a",
        "key": "A",
        "text": "这高糊画质，你拿座机拍的？拍UFO呢？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-40",
            "role": "me",
            "text": "这高糊画质，你拿座机拍的？拍UFO呢什么都看不清。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-41",
            "role": "other",
            "text": "……你试试大半夜在暴雨里，手抖着拿个碎屏手机拍！",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          },
          {
            "id": "other-42",
            "role": "other",
            "text": "这屏幕边缘还扎手呢。能拍出来就不错了，别挑刺了行吗。",
            "variant": "message",
            "delay": 0,
            "typing": 1430,
            "hidden": false
          },
          {
            "id": "other-43",
            "role": "other",
            "text": "你要是能顺着网线过来帮我拍高清的，我谢谢你。",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-13-b",
        "key": "B",
        "text": "看这衣服统一的，像公园保安吧？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-44",
            "role": "me",
            "text": "看这衣服统一的，像公园保安吧？你是不是翻墙被抓了？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-45",
            "role": "other",
            "text": "绝不可能。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-46",
            "role": "other",
            "text": "谁家保安大爷大雨天步调这么一致啊。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-47",
            "role": "other",
            "text": "而且他们根本不说话，全靠打手势交流。正常人谁这样。",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-14-c",
        "key": "C",
        "text": "看起来确实不对劲，你在发抖？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-48",
            "role": "me",
            "text": "看起来确实不对劲，你在发抖？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-49",
            "role": "other",
            "text": "嗯……太冷了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-50",
            "role": "other",
            "text": "我就穿了一件单薄的外套，现在全湿透了，贴在身上好冰。",
            "variant": "message",
            "delay": 0,
            "typing": 1430,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-16",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-51",
        "role": "other",
        "text": "他们带着那种强光手电。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-52",
        "role": "other",
        "text": "光太白太亮了，扫过树丛的时候，晃得人心发慌。我不喜欢那种光。",
        "variant": "message",
        "delay": 0,
        "typing": 1650,
        "hidden": false
      },
      {
        "id": "other-53",
        "role": "other",
        "text": "我不能继续蹲在这了，得赶紧换个地方。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-20",
    "kind": "choice",
    "scene": null,
    "prompt": "身份试探",
    "messages": [],
    "options": [
      {
        "id": "option-17-a",
        "key": "A",
        "text": "等等，那你怎么偏偏找上我了？我们认识？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-54",
            "role": "me",
            "text": "等等，那你怎么偏偏找上我了？我们认识？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-55",
            "role": "other",
            "text": "你一定要现在问这个吗？好浮躁。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-56",
            "role": "other",
            "text": "……这手机是旧的，里面乱七八糟的。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-57",
            "role": "other",
            "text": "我只是手抖，随便点了一个能发消息的框。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-58",
            "role": "other",
            "text": "我也想知道为什么偏偏是你。可能我今天运气就是这么差吧。",
            "variant": "message",
            "delay": 0,
            "typing": 1485,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-18-b",
        "key": "B",
        "text": "先别管冷不冷了，你周围有什么能藏的地方？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-59",
            "role": "me",
            "text": "先别管冷不冷了，保命要紧。你周围有什么能藏的地方？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-60",
            "role": "other",
            "text": "嗯……我看看。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-61",
            "role": "other",
            "text": "你别催我，我眼睛有点进水了，看不清。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          },
          {
            "id": "other-62",
            "role": "other",
            "text": "稍微等我一下。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-19-c",
        "key": "C",
        "text": "那你找个能避雨的亭子待着呗，躲雨要紧。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-63",
            "role": "me",
            "text": "那你找个能避雨的亭子待着呗，躲雨要紧。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-64",
            "role": "other",
            "text": "你说得可真轻松。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-65",
            "role": "other",
            "text": "亭子那是视野最好的地方，你是怕他们瞎了看不见我吗？",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          },
          {
            "id": "other-66",
            "role": "other",
            "text": "你要是只会高高在上出这种馊主意，不如直接拉黑我。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-21",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-67",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 1200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-68",
        "role": "other",
        "text": "我现在缩在一条窄巷里，旁边是闭店的便利店。",
        "variant": "message",
        "delay": 0,
        "typing": 1155,
        "hidden": false
      },
      {
        "id": "other-69",
        "role": "other",
        "text": "左边是一排自动贩卖机，后面有段矮墙。但要绕一段完全没有遮挡的路。",
        "variant": "message",
        "delay": 0,
        "typing": 1760,
        "hidden": false
      },
      {
        "id": "other-70",
        "role": "other",
        "text": "前面就是便利店的大门，招牌灯还亮着，太刺眼了。",
        "variant": "message",
        "delay": 0,
        "typing": 1265,
        "hidden": false
      },
      {
        "id": "system-71",
        "role": "system",
        "text": "图片：便利店门口监控死角截图——玻璃反光中可见黑色夹克人影",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "other-72",
        "role": "other",
        "text": "你看便利店玻璃的反光。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-73",
        "role": "other",
        "text": "左边有两个黑影子在靠近。右边……可能还有一个。",
        "variant": "message",
        "delay": 0,
        "typing": 1265,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-25",
    "kind": "choice",
    "scene": null,
    "prompt": "策略讨论",
    "messages": [],
    "options": [
      {
        "id": "option-22-a",
        "key": "A",
        "text": "便利店还开着吗？里面有人吗？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-74",
            "role": "me",
            "text": "便利店还开着吗？里面有人吗？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-75",
            "role": "other",
            "text": "看不太清，感觉像关了，但门口灯没关。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          },
          {
            "id": "other-76",
            "role": "other",
            "text": "万一门是锁的，我跑过去就是死路一条。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-23-b",
        "key": "B",
        "text": "贩卖机那边有路跑吗？会不会是死胡同？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-77",
            "role": "me",
            "text": "贩卖机那边有路跑吗？会不会是死胡同？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-78",
            "role": "other",
            "text": "贩卖机后面连着公园的绿化带，能穿过去。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-79",
            "role": "other",
            "text": "但过去的那段路没有任何掩体，万一被手电扫到就完了。",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-24-c",
        "key": "C",
        "text": "直接冲出巷子跟他们拼了！拿砖头拍！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-80",
            "role": "me",
            "text": "直接冲出巷子跟他们拼了！拿砖头拍！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-81",
            "role": "other",
            "text": "你是不是看电影看多了？",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "other-82",
            "role": "other",
            "text": "如果是你蹲在这被几个受过训练的人抓，你还会想拿砖头拍吗？！",
            "variant": "message",
            "delay": 0,
            "typing": 1595,
            "hidden": false
          },
          {
            "id": "other-83",
            "role": "other",
            "text": "算了，我不该指望你的。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-26",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-84",
        "role": "other",
        "text": "脚步声近了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-85",
        "role": "other",
        "text": "踩在水洼里的声音，简直像踩在我神经上。",
        "variant": "message",
        "delay": 0,
        "typing": 1045,
        "hidden": false
      },
      {
        "id": "other-86",
        "role": "other",
        "text": "他们知道我在这附近。",
        "variant": "message",
        "delay": 0,
        "typing": 550,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-30",
    "kind": "choice",
    "scene": null,
    "prompt": "安抚情绪",
    "messages": [],
    "options": [
      {
        "id": "option-27-a",
        "key": "A",
        "text": "我又不在现场，我怎么知道选哪个好啊！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-87",
            "role": "me",
            "text": "我又不在现场，这图我也看不出啥，我怎么知道选哪个好啊！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-88",
            "role": "other",
            "text": "我知道！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-89",
            "role": "other",
            "text": "可是我一个人拿不定主意……我有点腿软。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-90",
            "role": "other",
            "text": "我怕我一步走错就完了。你就不能帮我参谋一下吗。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-28-b",
        "key": "B",
        "text": "你先深呼吸，闭上眼睛数三秒。我在帮你看着。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-91",
            "role": "me",
            "text": "你先深呼吸，闭上眼睛数三秒。越急越容易选错，我在帮你看着。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-92",
            "role": "other",
            "text": "……嗯。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-93",
            "role": "other",
            "text": "一，二，三。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-94",
            "role": "other",
            "text": "呼。好一点了。你说，我听你的。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-29-c",
        "key": "C",
        "text": "随便选一个拼了！点兵点将！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-95",
            "role": "me",
            "text": "随便选一个拼了！点兵点将！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-96",
            "role": "other",
            "text": "你是不是觉得这很好玩？",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "other-97",
            "role": "other",
            "text": "这是在拿命赌，你让我点兵点将？！",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-98",
            "role": "other",
            "text": "别吵了，让我自己想。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-31",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-99",
        "role": "other",
        "text": "如果冲便利店，太亮了，一眼就能看到。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "other-100",
        "role": "other",
        "text": "如果走贩卖机，万一他们转头，我连退都没法退。",
        "variant": "message",
        "delay": 0,
        "typing": 1210,
        "hidden": false
      },
      {
        "id": "other-101",
        "role": "other",
        "text": "快点，帮我选一个。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-102",
        "role": "other",
        "text": "他们过来了！",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-35",
    "kind": "choice",
    "scene": null,
    "prompt": "关键决策点",
    "messages": [],
    "options": [
      {
        "id": "option-32-a",
        "key": "A",
        "text": "听直觉，去贩卖机后面。慢一点但隐蔽，贴墙走！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-103",
            "role": "me",
            "text": "听直觉，去贩卖机后面。慢一点但隐蔽，贴墙走！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-104",
            "role": "other",
            "text": "听我的？",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-105",
            "role": "other",
            "text": "……好。我也觉得那边更稳妥一点。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-106",
            "role": "other",
            "text": "我现在就贴着墙挪过去。先别发消息了，屏幕光会漏。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          },
          {
            "id": "system-107",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 2200,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-108",
            "role": "other",
            "text": "呼……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-109",
            "role": "other",
            "text": "到了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-110",
            "role": "other",
            "text": "你这次是对的。他们刚刚从前面过去，没往贩卖机后头看。",
            "variant": "message",
            "delay": 0,
            "typing": 1430,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-33-b",
        "key": "B",
        "text": "右边只是“可能”有人，冲便利店搏一把，快！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-111",
            "role": "me",
            "text": "右边只是“可能”有人，冲便利店搏一把，快！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-112",
            "role": "other",
            "text": "搏一把？",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-113",
            "role": "other",
            "text": "你胆子还真大……但一直耗在这也是等死。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-114",
            "role": "other",
            "text": "我拼一下。先别发消息。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "system-115",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 2200,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-116",
            "role": "other",
            "text": "门拉不开！锁死了！里面根本没人！",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "system-117",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 600,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-118",
            "role": "other",
            "text": "你认真的吗？这种点便利店早关门了！",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "system-119",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 2200,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-120",
            "role": "other",
            "text": "他们听见我拽门的动静了，正在往这边靠……",
            "variant": "message",
            "delay": 0,
            "typing": 1100,
            "hidden": false
          },
          {
            "id": "other-121",
            "role": "other",
            "text": "你到底会不会看情况啊！我要被你害死了！",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "system-122",
            "role": "system",
            "text": "星被迫转移，触发短暂失联逃亡，随后接回主线",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-34-c",
        "key": "C",
        "text": "往外跑！跑出公园上马路喊救命！",
        "retry": true,
        "branchMessages": [
          {
            "id": "me-123",
            "role": "me",
            "text": "往外跑！跑出公园上马路喊救命！总有车经过！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-124",
            "role": "other",
            "text": "你疯了吗？",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "system-125",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 800,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-126",
            "role": "other",
            "text": "……手电筒照到我了。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "system-127",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 1200,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-128",
            "role": "other",
            "text": "等——",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "system-129",
            "role": "system",
            "text": "连接已断开，角色已死亡。当前时间线已中断。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "system-130",
            "role": "system",
            "text": "提示：星讨厌被不负责任地指挥。高压状态下，极度不合常理的建议会导致毁灭性后果。请重新选择。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-36",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-131",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-132",
        "role": "other",
        "text": "手好凉，手机都快握不住了。",
        "variant": "message",
        "delay": 0,
        "typing": 715,
        "hidden": false
      },
      {
        "id": "other-133",
        "role": "other",
        "text": "刚才真的差点以为要被发现了，心跳得好快。",
        "variant": "message",
        "delay": 0,
        "typing": 1100,
        "hidden": false
      },
      {
        "id": "other-134",
        "role": "other",
        "text": "你这个人……虽然一开始有点莫名其妙，嘴还有点欠。",
        "variant": "message",
        "delay": 0,
        "typing": 1320,
        "hidden": false
      },
      {
        "id": "other-135",
        "role": "other",
        "text": "但刚刚那个判断还算靠谱。",
        "variant": "message",
        "delay": 0,
        "typing": 660,
        "hidden": false
      },
      {
        "id": "other-136",
        "role": "other",
        "text": "勉强给你打个及格分吧。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-137",
        "role": "other",
        "text": "但我还得继续往前走，前面有一段特别直的路，肯定有监控。",
        "variant": "message",
        "delay": 0,
        "typing": 1485,
        "hidden": false
      },
      {
        "id": "other-138",
        "role": "other",
        "text": "你要是还没睡着，就继续帮我看着点。别再出馊主意了。",
        "variant": "message",
        "delay": 0,
        "typing": 1375,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "messages-37",
    "kind": "messages",
    "scene": "场景二：监控盲区与绝命潜入",
    "prompt": null,
    "messages": [
      {
        "id": "system-139",
        "role": "system",
        "text": "当前时间 23:55 通讯信号微弱波动。",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "other-140",
        "role": "other",
        "text": "呼……",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-141",
        "role": "other",
        "text": "我过来了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-142",
        "role": "other",
        "text": "你还在看吗？",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-143",
        "role": "other",
        "text": "我前面没路了。是一段用石板铺的直路，连个能挡人的垃圾桶都没有。",
        "variant": "message",
        "delay": 0,
        "typing": 1705,
        "hidden": false
      },
      {
        "id": "other-144",
        "role": "other",
        "text": "更糟的是，路尽头的路灯杆上有一个监控。",
        "variant": "message",
        "delay": 0,
        "typing": 1045,
        "hidden": false
      },
      {
        "id": "other-145",
        "role": "other",
        "text": "红灯亮着，还在转。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-41",
    "kind": "choice",
    "scene": null,
    "prompt": "面对监控的初步判断",
    "messages": [],
    "options": [
      {
        "id": "option-38-a",
        "key": "A",
        "text": "别慌，观察一下它转动的规律。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-146",
            "role": "me",
            "text": "别慌，既然在转，就有死角。观察一下它转动的规律。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-147",
            "role": "other",
            "text": "嗯。我正在看。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-148",
            "role": "other",
            "text": "它从左边扫到右边，大概需要……十二秒。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-149",
            "role": "other",
            "text": "然后会在右边停顿一下，再转回来。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-150",
            "role": "other",
            "text": "你真的挺冷静的。要是我自己，刚才可能真的脑子一热就冲出去了。",
            "variant": "message",
            "delay": 0,
            "typing": 1650,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-39-b",
        "key": "B",
        "text": "监控而已，雨这么大它不一定拍得清，跑过去！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-151",
            "role": "me",
            "text": "监控而已，雨这么大它不一定拍得清，跑过去！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-152",
            "role": "other",
            "text": "你拿我的命赌它的像素吗？！",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-153",
            "role": "other",
            "text": "万一这玩意是高清带夜视的呢？",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          },
          {
            "id": "other-154",
            "role": "other",
            "text": "我不仅讨厌强光，我更讨厌这种被人盯着的感觉。像被放在玻璃罐里一样。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          },
          {
            "id": "other-155",
            "role": "other",
            "text": "我绝不能被拍到。我再看看规律。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-40-c",
        "key": "C",
        "text": "冲着镜头比个耶，说不定保安会放过你。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-156",
            "role": "me",
            "text": "冲着镜头比个耶，说不定保安会放过你。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-157",
            "role": "other",
            "text": "……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-158",
            "role": "other",
            "text": "我真是疯了才会大半夜指望你救命。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-159",
            "role": "other",
            "text": "我都快抖成筛子了，你到底在脑补什么喜剧片？",
            "variant": "message",
            "delay": 0,
            "typing": 1155,
            "hidden": false
          },
          {
            "id": "other-160",
            "role": "other",
            "text": "闭嘴，让我自己算一下它转过去的时间。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-42",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-161",
        "role": "other",
        "text": "十二秒。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-162",
        "role": "other",
        "text": "这段路有差不多三十米。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-163",
        "role": "other",
        "text": "我鞋子全湿透了，里面灌满了冷水，跑起来很重。",
        "variant": "message",
        "delay": 0,
        "typing": 1210,
        "hidden": false
      },
      {
        "id": "other-164",
        "role": "other",
        "text": "十二秒我不一定能跑完。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-165",
        "role": "other",
        "text": "而且石板路上有积水，跑太快会踩出很大的水花声。",
        "variant": "message",
        "delay": 0,
        "typing": 1265,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-46",
    "kind": "choice",
    "scene": null,
    "prompt": "战术指导",
    "messages": [],
    "options": [
      {
        "id": "option-43-a",
        "key": "A",
        "text": "扔个石头去反方向，把监控或者人引开？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-166",
            "role": "me",
            "text": "找个石头扔到反方向的草丛里，把监控或者人引开？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-167",
            "role": "other",
            "text": "这里是铺好的石板路，连块多余的泥巴都抠不下来，哪来的石头！",
            "variant": "message",
            "delay": 0,
            "typing": 1595,
            "hidden": false
          },
          {
            "id": "other-168",
            "role": "other",
            "text": "而且万一他们有声音定位，我这不是主动暴露吗？",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          },
          {
            "id": "other-169",
            "role": "other",
            "text": "这招电影里好用，现实里太假了。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-44-b",
        "key": "B",
        "text": "分两次跑。中间有没有任何可以贴着站的阴影？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-170",
            "role": "me",
            "text": "分两次跑。中间有没有任何可以贴着站的阴影或者柱子？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-171",
            "role": "other",
            "text": "我眯着眼睛看一下……",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-172",
            "role": "other",
            "text": "有。路中间有一棵比较粗的景观树，树干下面有阴影。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          },
          {
            "id": "other-173",
            "role": "other",
            "text": "如果是跑到那棵树后面停一下，时间足够。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-174",
            "role": "other",
            "text": "你……好像真的挺懂的。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-45-c",
        "key": "C",
        "text": "脱了鞋跑！光脚没声音，而且跑得快！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-175",
            "role": "me",
            "text": "脱了鞋跑！光脚没声音，而且跑得快！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-176",
            "role": "other",
            "text": "……哈？",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-177",
            "role": "other",
            "text": "地上全是碎石子和不知道什么东西的积水，你让我光脚跑？",
            "variant": "message",
            "delay": 0,
            "typing": 1430,
            "hidden": false
          },
          {
            "id": "other-178",
            "role": "other",
            "text": "万一划破了脚，跑不动了，我就真的只能原地等死了。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          },
          {
            "id": "other-179",
            "role": "other",
            "text": "……但你说得对，鞋子太沉了。我把外套脱了扔在旁边吧，减轻点重量。",
            "variant": "message",
            "delay": 0,
            "typing": 1760,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-47",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-180",
        "role": "other",
        "text": "我准备好了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-181",
        "role": "other",
        "text": "监控转过去了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-182",
        "role": "other",
        "text": "我跑了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "system-183",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 1200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-184",
        "role": "other",
        "text": "……",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-185",
        "role": "other",
        "text": "我到树后面了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-186",
        "role": "other",
        "text": "但我不敢动了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-187",
        "role": "other",
        "text": "嘘。别发消息。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "system-188",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "system-189",
        "role": "system",
        "text": "语音转文字，语气极度压抑、颤抖",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "other-190",
        "role": "other",
        "text": "他们追过来了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-191",
        "role": "other",
        "text": "就在监控那条路的这头。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-192",
        "role": "other",
        "text": "我听见对讲机的声音了。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-193",
        "role": "other",
        "text": "那种……电流沙沙的声音。他们居然用这东西。",
        "variant": "message",
        "delay": 0,
        "typing": 1155,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-51",
    "kind": "choice",
    "scene": null,
    "prompt": "对追兵的分析",
    "messages": [],
    "options": [
      {
        "id": "option-48-a",
        "key": "A",
        "text": "对讲机？这绝对不是普通安保，他们有组织的。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-194",
            "role": "me",
            "text": "带对讲机？还有统一制服和战术动作？这绝对不是普通安保，他们是有组织的。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-195",
            "role": "other",
            "text": "对。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-196",
            "role": "other",
            "text": "这不是普通找人。他们给我的感觉……",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-197",
            "role": "other",
            "text": "就像是在抓一个逃跑的实验动物。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-198",
            "role": "other",
            "text": "我宁愿冻死在这，也不想被他们抓回去。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-49-b",
        "key": "B",
        "text": "他们是不是看到你了？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-199",
            "role": "me",
            "text": "他们是不是看到你了？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-200",
            "role": "other",
            "text": "没有。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-201",
            "role": "other",
            "text": "他们好像是在按网格排查。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-202",
            "role": "other",
            "text": "有一个人的手电筒光刚才就从我脚边的水洼扫过去。就差半米。",
            "variant": "message",
            "delay": 0,
            "typing": 1540,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-50-c",
        "key": "C",
        "text": "完了，你赶紧爬树上躲着去！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-203",
            "role": "me",
            "text": "完了，你赶紧爬树上躲着去！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-204",
            "role": "other",
            "text": "你瞎吗！这是景观树！光秃秃的树干我拿什么爬！",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          },
          {
            "id": "other-205",
            "role": "other",
            "text": "而且我穿的裙子！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-206",
            "role": "other",
            "text": "你再出这种馊主意，我就开手电筒把你这号码曝光给他们！",
            "variant": "message",
            "delay": 0,
            "typing": 1430,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-52",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-207",
        "role": "other",
        "text": "手电的光移开了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-208",
        "role": "other",
        "text": "对讲机里说了句什么，听不清，但他们好像往另一个方向走了一点。",
        "variant": "message",
        "delay": 0,
        "typing": 1650,
        "hidden": false
      },
      {
        "id": "other-209",
        "role": "other",
        "text": "监控又转过去了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-210",
        "role": "other",
        "text": "但我……我有点站不起来。",
        "variant": "message",
        "delay": 0,
        "typing": 660,
        "hidden": false
      },
      {
        "id": "other-211",
        "role": "other",
        "text": "腿完全软了，膝盖一直在抖。",
        "variant": "message",
        "delay": 0,
        "typing": 715,
        "hidden": false
      },
      {
        "id": "other-212",
        "role": "other",
        "text": "我太冷了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-56",
    "kind": "choice",
    "scene": null,
    "prompt": "情绪锚点/拉扯",
    "messages": [],
    "options": [
      {
        "id": "option-53-a",
        "key": "A",
        "text": "别磨蹭！再不走他们就回头了，你想死吗！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-213",
            "role": "me",
            "text": "别磨蹭！再不走他们就回头了，你想死吗！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-214",
            "role": "other",
            "text": "你以为我不想走吗！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-215",
            "role": "other",
            "text": "站着说话不腰疼……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-216",
            "role": "other",
            "text": "但我知道你是对的。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-217",
            "role": "other",
            "text": "我不会死在这里的。绝对不会。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-54-b",
        "key": "B",
        "text": "撑住。想想逃出去之后你想干什么，咬牙站起来。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-218",
            "role": "me",
            "text": "撑住。想想逃出去之后你想干什么，咬牙站起来。我在屏幕这边陪着你。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-219",
            "role": "other",
            "text": "……我想吃热的东西。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-220",
            "role": "other",
            "text": "草莓布丁，或者随便什么热乎乎的甜点。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          },
          {
            "id": "other-221",
            "role": "other",
            "text": "好。为了草莓布丁。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-222",
            "role": "other",
            "text": "我站起来了。你这个人，真会捏人的软肋。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-55-c",
        "key": "C",
        "text": "怎么，要我顺着网线过去背你吗？快点动起来。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-223",
            "role": "me",
            "text": "怎么，要我顺着网线过去背你吗？可惜技术不支持，快点动起来。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-224",
            "role": "other",
            "text": "谁要你背！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-225",
            "role": "other",
            "text": "我就是抱怨一下不行吗。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "other-226",
            "role": "other",
            "text": "平时我都软软糯糯的，但我不是那种遇到事只会哭的人。",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          },
          {
            "id": "other-227",
            "role": "other",
            "text": "看着吧，我走给你看。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-57",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-228",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-229",
        "role": "other",
        "text": "呼……哈……",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-230",
        "role": "other",
        "text": "我跑过来了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-231",
        "role": "other",
        "text": "脱离监控区了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-232",
        "role": "other",
        "text": "前面有一栋楼。黑漆漆的，像是个废弃的地方。",
        "variant": "message",
        "delay": 0,
        "typing": 1155,
        "hidden": false
      },
      {
        "id": "other-233",
        "role": "other",
        "text": "借着路灯，我能看到墙上挂着个旧牌子。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "system-234",
        "role": "system",
        "text": "图片：一张模糊的特写，墙上的铜牌因为下雨生了绿锈，隐约能看到“美术教育旧馆”几个字",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "other-235",
        "role": "other",
        "text": "美术教育旧馆。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-236",
        "role": "other",
        "text": "这地方看起来停用很久了，连大门的拉手都被卸了。",
        "variant": "message",
        "delay": 0,
        "typing": 1265,
        "hidden": false
      },
      {
        "id": "other-237",
        "role": "other",
        "text": "但我必须得进去，留在外面会被冻死，或者被抓住。",
        "variant": "message",
        "delay": 0,
        "typing": 1265,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-61",
    "kind": "choice",
    "scene": null,
    "prompt": "寻找入口",
    "messages": [],
    "options": [
      {
        "id": "option-58-a",
        "key": "A",
        "text": "大门进不去，去找找一楼的窗户或者侧门。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-238",
            "role": "me",
            "text": "大门进不去，去找找一楼的侧面，通常这种楼都有消防通道或者后门。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-239",
            "role": "other",
            "text": "嗯，我也是这么想的。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-240",
            "role": "other",
            "text": "我正在贴着墙往侧面绕。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "other-241",
            "role": "other",
            "text": "墙角的泥好滑，我差点摔一跤。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-59-b",
        "key": "B",
        "text": "拿石头把大门玻璃砸了翻进去！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-242",
            "role": "me",
            "text": "拿石头把大门玻璃砸了翻进去！快！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-243",
            "role": "other",
            "text": "你是嫌我死得不够快是吧？！",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-244",
            "role": "other",
            "text": "砸玻璃的声音在雨夜里能传出去多远你知道吗！",
            "variant": "message",
            "delay": 0,
            "typing": 1155,
            "hidden": false
          },
          {
            "id": "other-245",
            "role": "other",
            "text": "你想把附近所有穿黑雨衣的人都叫过来开派对吗？",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          },
          {
            "id": "other-246",
            "role": "other",
            "text": "我自己去绕侧门。气死我了。",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-60-c",
        "key": "C",
        "text": "里面黑灯瞎火的，会不会有鬼啊……",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-247",
            "role": "me",
            "text": "里面黑灯瞎火的，会不会有鬼啊……要不换个地方？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-248",
            "role": "other",
            "text": "……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-249",
            "role": "other",
            "text": "我现在觉得外面那些人比鬼可怕多了。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-250",
            "role": "other",
            "text": "鬼最多吓唬我，外面那些人可是真的要“回收”我。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          },
          {
            "id": "other-251",
            "role": "other",
            "text": "我找到一个侧门了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-62",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-252",
        "role": "other",
        "text": "是一扇生锈的铁门。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-253",
        "role": "other",
        "text": "上面没有电子锁，是个很老的那种锁眼，但好像没锁死，只是卡住了。",
        "variant": "message",
        "delay": 0,
        "typing": 1705,
        "hidden": false
      },
      {
        "id": "other-254",
        "role": "other",
        "text": "推不动。太重了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-255",
        "role": "other",
        "text": "底部的门缝都被泥和落叶堵死了。",
        "variant": "message",
        "delay": 0,
        "typing": 825,
        "hidden": false
      },
      {
        "id": "other-256",
        "role": "other",
        "text": "我又听见脚步声了。他们绕过来了。",
        "variant": "message",
        "delay": 0,
        "typing": 880,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-66",
    "kind": "choice",
    "scene": null,
    "prompt": "极限破门",
    "messages": [],
    "options": [
      {
        "id": "option-63-a",
        "key": "A",
        "text": "放弃这扇门，继续跑！别被堵死在这！",
        "retry": true,
        "branchMessages": [
          {
            "id": "me-257",
            "role": "me",
            "text": "推不动就算了，放弃这扇门，继续跑！别被堵死在这！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-258",
            "role": "other",
            "text": "好，我继续……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "system-259",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 600,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-260",
            "role": "other",
            "text": "不行，这是一条死胡同。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "other-261",
            "role": "other",
            "text": "尽头是高墙。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-262",
            "role": "other",
            "text": "他们进巷子了。手电光照到我了。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-263",
            "role": "other",
            "text": "完了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "system-264",
            "role": "system",
            "text": "连接已断开，角色已死亡。当前时间线已中断。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "system-265",
            "role": "system",
            "text": "提示：星的体力已经耗尽。在绝境中放弃近在咫尺的掩体，意味着彻底丧失生机。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-64-b",
        "key": "B",
        "text": "找找周围有没有砖头、铁棍，插进门缝里撬！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-266",
            "role": "me",
            "text": "不要只用手推！找找周围有没有树枝、铁棍之类的，插进门缝底下撬！利用杠杆！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-267",
            "role": "other",
            "text": "铁棍……我摸到了！旁边有一截生锈的水管！",
            "variant": "message",
            "delay": 0,
            "typing": 1100,
            "hidden": false
          },
          {
            "id": "other-268",
            "role": "other",
            "text": "我插进去了！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-269",
            "role": "other",
            "text": "我压！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-65-c",
        "key": "C",
        "text": "把身体压上去，我数一二三，用肩膀撞！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-270",
            "role": "me",
            "text": "别用手推！把身体全压上去，我数一二三，用肩膀狠狠撞过去！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-271",
            "role": "other",
            "text": "肩膀……好！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-272",
            "role": "other",
            "text": "你数！快点！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-67",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-273",
        "role": "other",
        "text": "开了！",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-274",
        "role": "other",
        "text": "铁门发出了很大的一声摩擦音，我不管了，我直接钻进来了！",
        "variant": "message",
        "delay": 0,
        "typing": 1485,
        "hidden": false
      },
      {
        "id": "other-275",
        "role": "other",
        "text": "好黑。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-276",
        "role": "other",
        "text": "里面一股很重的霉味和纸张发潮的味道。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-71",
    "kind": "choice",
    "scene": null,
    "prompt": "进入后的第一反应",
    "messages": [],
    "options": [
      {
        "id": "option-68-a",
        "key": "A",
        "text": "别管味道了，赶紧把门重新卡死！快！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-277",
            "role": "me",
            "text": "别管味道了，赶紧把门从里面重新卡死！千万别留缝！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-278",
            "role": "other",
            "text": "在弄了！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-279",
            "role": "other",
            "text": "我把刚才那截水管横卡在门把手和墙壁之间了。",
            "variant": "message",
            "delay": 0,
            "typing": 1155,
            "hidden": false
          },
          {
            "id": "other-280",
            "role": "other",
            "text": "就算他们推，一时半会也推不开。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-281",
            "role": "other",
            "text": "你这个人，关键时刻真是意外地靠谱。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-69-b",
        "key": "B",
        "text": "安全了安全了，赶紧开手电筒看看这是什么地方。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-282",
            "role": "me",
            "text": "安全了安全了，赶紧用手机开手电筒，看看这是什么地方。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-283",
            "role": "other",
            "text": "不行！绝对不能开灯！",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-284",
            "role": "other",
            "text": "这里有些窗户是破的，光一旦漏出去，他们立刻就会知道我在这里！",
            "variant": "message",
            "delay": 0,
            "typing": 1650,
            "hidden": false
          },
          {
            "id": "other-285",
            "role": "other",
            "text": "我已经把那截水管卡在门上了。门暂时安全。",
            "variant": "message",
            "delay": 0,
            "typing": 1100,
            "hidden": false
          },
          {
            "id": "other-286",
            "role": "other",
            "text": "但你的防范意识真的忽高忽低，好气人。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-70-c",
        "key": "C",
        "text": "你还好吗？有没有哪里受伤？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-287",
            "role": "me",
            "text": "先进去再说。你还好吗？刚才撞门有没有哪里受伤？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-288",
            "role": "other",
            "text": "……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-289",
            "role": "other",
            "text": "肩膀有点痛。刚才撞得太狠了。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          },
          {
            "id": "other-290",
            "role": "other",
            "text": "不过没事，没流血。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-291",
            "role": "other",
            "text": "我把门卡死了。谢谢你问我这个。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-292",
            "role": "other",
            "text": "你这人……真的很犯规。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-72",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-293",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-294",
        "role": "other",
        "text": "外面的雨声变小了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-295",
        "role": "other",
        "text": "门外有脚步声走过，手电筒的光在门缝外面闪了一下，又走远了。",
        "variant": "message",
        "delay": 0,
        "typing": 1595,
        "hidden": false
      },
      {
        "id": "other-296",
        "role": "other",
        "text": "他们没发现这个侧门。",
        "variant": "message",
        "delay": 0,
        "typing": 550,
        "hidden": false
      },
      {
        "id": "other-297",
        "role": "other",
        "text": "我……我活下来了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-298",
        "role": "other",
        "text": "我靠在墙上，顺着墙滑下来了。地板好凉，但我一点都不想起来。",
        "variant": "message",
        "delay": 0,
        "typing": 1595,
        "hidden": false
      },
      {
        "id": "other-299",
        "role": "other",
        "text": "我们暂时安全了，对吧？",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "messages-73",
    "kind": "messages",
    "scene": "场景三：旧馆喘息与诡异线索",
    "prompt": null,
    "messages": [
      {
        "id": "system-300",
        "role": "system",
        "text": "当前时间 00:15 通讯信号稳定。",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "system-301",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-302",
        "role": "other",
        "text": "外面的雨声变小了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-303",
        "role": "other",
        "text": "门外偶尔有脚步声走过，手电筒的光在门缝外面闪了一下，又走远了。",
        "variant": "message",
        "delay": 0,
        "typing": 1705,
        "hidden": false
      },
      {
        "id": "other-304",
        "role": "other",
        "text": "他们没发现这个侧门。",
        "variant": "message",
        "delay": 0,
        "typing": 550,
        "hidden": false
      },
      {
        "id": "other-305",
        "role": "other",
        "text": "我……我活下来了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-306",
        "role": "other",
        "text": "我靠在墙上，顺着墙滑下来了。地板好凉，但我一点都不想起来。",
        "variant": "message",
        "delay": 0,
        "typing": 1595,
        "hidden": false
      },
      {
        "id": "other-307",
        "role": "other",
        "text": "我们暂时安全了，对吧？",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-77",
    "kind": "choice",
    "scene": null,
    "prompt": "脱险后的情绪安抚",
    "messages": [],
    "options": [
      {
        "id": "option-74-a",
        "key": "A",
        "text": "暂时安全了。你先坐在地上缓一缓，深呼吸。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-308",
            "role": "me",
            "text": "暂时安全了。你先坐在地上缓一缓，深呼吸。别急着说话。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-309",
            "role": "other",
            "text": "嗯……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-310",
            "role": "other",
            "text": "我正在深呼吸。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-311",
            "role": "other",
            "text": "但是肺里好疼，像吸进了冰块一样。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-312",
            "role": "other",
            "text": "刚才如果你不回我，我大概就随便找个地方躲了。可能也躲不过。",
            "variant": "message",
            "delay": 0,
            "typing": 1595,
            "hidden": false
          },
          {
            "id": "other-313",
            "role": "other",
            "text": "我不是那个意思。不是在谢你。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          },
          {
            "id": "other-314",
            "role": "other",
            "text": "……算了，也算吧。谢谢。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-75-b",
        "key": "B",
        "text": "别高兴得太早，他们随时可能发现这里。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-315",
            "role": "me",
            "text": "别高兴得太早，他们随时可能发现这里，保持警惕。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-316",
            "role": "other",
            "text": "我知道。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-317",
            "role": "other",
            "text": "你不用这么扫兴，我就想借着这几分钟稍微骗一下自己不行吗。",
            "variant": "message",
            "delay": 0,
            "typing": 1540,
            "hidden": false
          },
          {
            "id": "other-318",
            "role": "other",
            "text": "我连手指都在发抖，总得让我喘口气吧。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          },
          {
            "id": "other-319",
            "role": "other",
            "text": "不过……你说得对。我不能完全放松。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-76-c",
        "key": "C",
        "text": "没事了没事了，一切都会好起来的。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-320",
            "role": "me",
            "text": "没事了没事了，一切都会好起来的。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-321",
            "role": "other",
            "text": "……好浮躁的安慰。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-322",
            "role": "other",
            "text": "“一切都会好起来的”，这种话听着太像敷衍了。",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          },
          {
            "id": "other-323",
            "role": "other",
            "text": "我现在连自己明天在哪都不知道，怎么好起来？",
            "variant": "message",
            "delay": 0,
            "typing": 1155,
            "hidden": false
          },
          {
            "id": "other-324",
            "role": "other",
            "text": "别对我说这种空话了，我更喜欢听实话。哪怕实话很难听。",
            "variant": "message",
            "delay": 0,
            "typing": 1430,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-78",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-325",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-326",
        "role": "other",
        "text": "黑暗里待久了，眼睛稍微适应了一点。",
        "variant": "message",
        "delay": 0,
        "typing": 935,
        "hidden": false
      },
      {
        "id": "other-327",
        "role": "other",
        "text": "你……还在线吗？",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-328",
        "role": "other",
        "text": "正式认识一下吧。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-329",
        "role": "other",
        "text": "我叫星。至少现在是这么叫。",
        "variant": "message",
        "delay": 0,
        "typing": 715,
        "hidden": false
      },
      {
        "id": "other-330",
        "role": "other",
        "text": "别问全名，我也不确定那个算不算真的。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "other-331",
        "role": "other",
        "text": "年纪的话，十七。大概。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-332",
        "role": "other",
        "text": "你可以把我当成……刚逃出来的人。这个说法最省事。",
        "variant": "message",
        "delay": 0,
        "typing": 1320,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-82",
    "kind": "choice",
    "scene": null,
    "prompt": "对她身份的反应",
    "messages": [],
    "options": [
      {
        "id": "option-79-a",
        "key": "A",
        "text": "“大概”十七？你连自己的名字和年纪都不确定？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-333",
            "role": "me",
            "text": "“大概”十七？你连自己的名字和年纪都不确定？这太离谱了吧。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-334",
            "role": "other",
            "text": "是很离谱。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-335",
            "role": "other",
            "text": "我也觉得像什么三流小说的设定。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-336",
            "role": "other",
            "text": "但我脑子里的记忆就像是被剪辑过的录像带，有些段落很清晰，有些地方一片空白。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          },
          {
            "id": "other-337",
            "role": "other",
            "text": "我不想骗你，所以我只能说“大概”。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-80-b",
        "key": "B",
        "text": "逃出来的人？你从哪逃出来的，监狱还是精神病院？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-338",
            "role": "me",
            "text": "逃出来的人？你从哪逃出来的，监狱还是精神病院？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-339",
            "role": "other",
            "text": "……你这嘴是真的欠啊。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "other-340",
            "role": "other",
            "text": "不是监狱，也不是精神病院。",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-341",
            "role": "other",
            "text": "但也差不多。是一个很压抑、很封闭的地方。",
            "variant": "message",
            "delay": 0,
            "typing": 1100,
            "hidden": false
          },
          {
            "id": "other-342",
            "role": "other",
            "text": "我讨厌那里，所以我跑了。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-81-c",
        "key": "C",
        "text": "好的，星。很高兴认识你，我叫……",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-343",
            "role": "me",
            "text": "好的，星。很高兴认识你。至于我叫什么，你可以随便给我起个代号。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-344",
            "role": "other",
            "text": "哪有大半夜在逃命的时候说“很高兴认识你”的啊。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          },
          {
            "id": "other-345",
            "role": "other",
            "text": "你好奇怪。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-346",
            "role": "other",
            "text": "不过……还挺让人放松的。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-347",
            "role": "other",
            "text": "代号就算了，我怕我记不住。我就把你当成一个……刚好没有挂断我求救的笨蛋吧。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-83",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-348",
        "role": "other",
        "text": "说正事。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-349",
        "role": "other",
        "text": "我手里这台旧手机，不是我的。",
        "variant": "message",
        "delay": 0,
        "typing": 770,
        "hidden": false
      },
      {
        "id": "other-350",
        "role": "other",
        "text": "屏幕碎了一大半，刚才淋了雨，现在触控有点不灵。",
        "variant": "message",
        "delay": 0,
        "typing": 1265,
        "hidden": false
      },
      {
        "id": "other-351",
        "role": "other",
        "text": "这是我逃出来的时候，顺手从一个类似储物柜的地方拿的。",
        "variant": "message",
        "delay": 0,
        "typing": 1430,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-87",
    "kind": "choice",
    "scene": null,
    "prompt": "排查隐患",
    "messages": [],
    "options": [
      {
        "id": "option-84-a",
        "key": "A",
        "text": "那这手机不会有定位吧？！你拿着它岂不是个活靶子？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-352",
            "role": "me",
            "text": "那这手机不会有定位吧？！你拿着它岂不是个活靶子？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-353",
            "role": "other",
            "text": "我检查过了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-354",
            "role": "other",
            "text": "手机里没有SIM卡，连的是不知道哪里的微弱无线网。",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          },
          {
            "id": "other-355",
            "role": "other",
            "text": "我也怕有定位，所以我刚才一直不敢多点别的功能。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-85-b",
        "key": "B",
        "text": "既然不是你的，你怎么能用它发消息给我？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-356",
            "role": "me",
            "text": "既然不是你的，你怎么能用它发消息给我？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-357",
            "role": "other",
            "text": "这就是最奇怪的地方。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-358",
            "role": "other",
            "text": "里面什么应用都被卸载了，只剩下一个隐藏的通讯软件。",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          },
          {
            "id": "other-359",
            "role": "other",
            "text": "你那个号码，是软件里唯一没有被彻底删掉的联系方式。",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          },
          {
            "id": "other-360",
            "role": "other",
            "text": "与其说是我找到你，不如说是这台手机里本来就有你。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-86-c",
        "key": "C",
        "text": "快看看里面有没有手电筒功能！",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-361",
            "role": "me",
            "text": "别管谁的了，快看看里面有没有手电筒功能！黑漆漆的怎么看路。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-362",
            "role": "other",
            "text": "你是不是鱼的记忆啊？",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-363",
            "role": "other",
            "text": "刚才在门外我就说过了，绝对不能开手电！",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-364",
            "role": "other",
            "text": "这栋旧楼到处都是破窗户，一开光，外面的人立刻就能看到。",
            "variant": "message",
            "delay": 0,
            "typing": 1485,
            "hidden": false
          },
          {
            "id": "other-365",
            "role": "other",
            "text": "别出馊主意了，安分点。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-88",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-366",
        "role": "other",
        "text": "我刚才翻了一下这手机。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-367",
        "role": "other",
        "text": "里面的东西删过，但好像走得很急，没删干净。",
        "variant": "message",
        "delay": 0,
        "typing": 1155,
        "hidden": false
      },
      {
        "id": "other-368",
        "role": "other",
        "text": "在已删除的草稿箱里，有一条没有发出去的短信。",
        "variant": "message",
        "delay": 0,
        "typing": 1210,
        "hidden": false
      },
      {
        "id": "system-369",
        "role": "system",
        "text": "图片：一张碎屏手机的截图，屏幕有裂纹，草稿箱里躺着一条信息：“如果她醒了，别让她回家。”",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "other-370",
        "role": "other",
        "text": "“如果她醒了，别让她回家。”",
        "variant": "message",
        "delay": 0,
        "typing": 770,
        "hidden": false
      },
      {
        "id": "other-371",
        "role": "other",
        "text": "时间是三天前。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-92",
    "kind": "choice",
    "scene": null,
    "prompt": "分析短信",
    "messages": [],
    "options": [
      {
        "id": "option-89-a",
        "key": "A",
        "text": "这个“她”……会不会就是你？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-372",
            "role": "me",
            "text": "这个“她”……会不会就是你？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-373",
            "role": "other",
            "text": "我也是这么想的。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-374",
            "role": "other",
            "text": "如果是别人，这太巧合了。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-375",
            "role": "other",
            "text": "但如果是我……“醒了”是什么意思？",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-376",
            "role": "other",
            "text": "我现在最怕的就是这种感觉。什么都像在指着我，又什么都没法确定。",
            "variant": "message",
            "delay": 0,
            "typing": 1705,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-90-b",
        "key": "B",
        "text": "别吓自己，也许这手机是哪个医院护士丢的呢？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-377",
            "role": "me",
            "text": "别吓自己，也许这手机是哪个医院护士丢的呢？这只是一条普通的医嘱。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-378",
            "role": "other",
            "text": "你家医嘱会写“别让她回家”啊？",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-379",
            "role": "other",
            "text": "正常医院不都是催着出院腾床位吗。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-380",
            "role": "other",
            "text": "而且医院的护士怎么会把手机藏在那那种封闭设施的储物柜里？",
            "variant": "message",
            "delay": 0,
            "typing": 1540,
            "hidden": false
          },
          {
            "id": "other-381",
            "role": "other",
            "text": "你别强行安慰我了，这根本不合逻辑。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-91-c",
        "key": "C",
        "text": "为什么不让“她”回家？家里有危险？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-382",
            "role": "me",
            "text": "为什么不让“她”回家？家里有危险，还是“回家”这件事本身会破坏什么计划？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-383",
            "role": "other",
            "text": "……你切入点好锐利。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-384",
            "role": "other",
            "text": "我不知道。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-385",
            "role": "other",
            "text": "其实，我甚至想不起来“家”的清晰样子了。",
            "variant": "message",
            "delay": 0,
            "typing": 1100,
            "hidden": false
          },
          {
            "id": "other-386",
            "role": "other",
            "text": "这才是最让我害怕的地方。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-93",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-387",
        "role": "other",
        "text": "除了短信，我还从文件管理器的底层翻出了一份表格。",
        "variant": "message",
        "delay": 0,
        "typing": 1320,
        "hidden": false
      },
      {
        "id": "other-388",
        "role": "other",
        "text": "像是一份体检或者训练记录。",
        "variant": "message",
        "delay": 0,
        "typing": 715,
        "hidden": false
      },
      {
        "id": "other-389",
        "role": "other",
        "text": "上面没有名字，只有一个编号：X-17。",
        "variant": "message",
        "delay": 0,
        "typing": 1045,
        "hidden": false
      },
      {
        "id": "other-390",
        "role": "other",
        "text": "但里面的数据很奇怪。",
        "variant": "message",
        "delay": 0,
        "typing": 550,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-97",
    "kind": "choice",
    "scene": null,
    "prompt": "查看记录",
    "messages": [],
    "options": [
      {
        "id": "option-94-a",
        "key": "A",
        "text": "发给我看看。别自己一个人瞎猜。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-391",
            "role": "me",
            "text": "发给我看看。别自己一个人瞎猜，多双眼睛多个思路。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-392",
            "role": "other",
            "text": "嗯。截图有点糊，你将就看。",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "system-393",
            "role": "system",
            "text": "系统发送了一张局部截图：心率曲线、反应时毫秒数、注意力波动图表，以及一栏写着“极端压力下服从度测试”的红字。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-95-b",
        "key": "B",
        "text": "哪奇怪了？身高体重不正常吗？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-394",
            "role": "me",
            "text": "哪奇怪了？身高体重不正常吗？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-395",
            "role": "other",
            "text": "如果只是身高体重，我也不会觉得奇怪了！",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-396",
            "role": "other",
            "text": "根本没有这些常规数据。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          },
          {
            "id": "system-397",
            "role": "system",
            "text": "系统发送了一张局部截图：心率曲线、反应时毫秒数、注意力波动图表，以及一栏写着“极端压力下服从度测试”的红字。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-96-c",
        "key": "C",
        "text": "这手机也是挺能藏的，你居然还能翻到底层文件。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-398",
            "role": "me",
            "text": "这手机也是挺能藏的，你居然还能翻到底层文件。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-399",
            "role": "other",
            "text": "我也不知道为什么，我就觉得应该往深处找找。",
            "variant": "message",
            "delay": 0,
            "typing": 1155,
            "hidden": false
          },
          {
            "id": "other-400",
            "role": "other",
            "text": "而且这些文件夹的命名方式，我看着莫名的眼熟。",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          },
          {
            "id": "system-401",
            "role": "system",
            "text": "系统发送了一张局部截图：心率曲线、反应时毫秒数、注意力波动图表，以及一栏写着“极端压力下服从度测试”的红字。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-98",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-402",
        "role": "other",
        "text": "你看到了吗？",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-403",
        "role": "other",
        "text": "心率，反应时，注意力波动。",
        "variant": "message",
        "delay": 0,
        "typing": 715,
        "hidden": false
      },
      {
        "id": "other-404",
        "role": "other",
        "text": "还有那个“极端压力下服从度测试”。",
        "variant": "message",
        "delay": 0,
        "typing": 935,
        "hidden": false
      },
      {
        "id": "other-405",
        "role": "other",
        "text": "这根本不像普通的学校记录，也不像医院的病历。",
        "variant": "message",
        "delay": 0,
        "typing": 1210,
        "hidden": false
      },
      {
        "id": "other-406",
        "role": "other",
        "text": "这看起来很专业，但其实很冷血。就像是在拿人做一张可以调配的数据表。",
        "variant": "message",
        "delay": 0,
        "typing": 1800,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-102",
    "kind": "choice",
    "scene": null,
    "prompt": "价值判断与共情",
    "messages": [],
    "options": [
      {
        "id": "option-99-a",
        "key": "A",
        "text": "这简直是在把人当小白鼠！太离谱了。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-407",
            "role": "me",
            "text": "这简直是在把人当小白鼠！太离谱了，到底是什么组织在搞这种东西？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-408",
            "role": "other",
            "text": "对吧？",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-409",
            "role": "other",
            "text": "我看着这些数据，后背发凉。",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-410",
            "role": "other",
            "text": "有人每天都在测量你的“服从度”……光是想想就觉得恶心。",
            "variant": "message",
            "delay": 0,
            "typing": 1485,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-100-b",
        "key": "B",
        "text": "也可能只是某种特殊的心理学测试？你别过度反应。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-411",
            "role": "me",
            "text": "也可能只是某种特殊的心理学测试？你别过度反应，也许只是普通的科研项目。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-412",
            "role": "other",
            "text": "过度反应？",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-413",
            "role": "other",
            "text": "外面有一群穿着统一制服、拿着对讲机的人在雨夜里抓我！",
            "variant": "message",
            "delay": 0,
            "typing": 1430,
            "hidden": false
          },
          {
            "id": "other-414",
            "role": "other",
            "text": "然后你告诉我这是普通的科研项目？！",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-415",
            "role": "other",
            "text": "你如果也是那种高高在上、喜欢把别人的痛苦轻描淡写的人，那我们没什么好聊的了。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          },
          {
            "id": "other-416",
            "role": "other",
            "text": "好浮躁。我不喜欢。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-101-c",
        "key": "C",
        "text": "编号X-17，这个数据如果对应的是你……那你可能真的不是普通离家出走。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-417",
            "role": "me",
            "text": "编号X-17，这个数据如果对应的是你……那你可能真的不是普通离家出走。你是一个很重要的“目标”。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-418",
            "role": "other",
            "text": "……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-419",
            "role": "other",
            "text": "你这话说得很残忍，但是很准。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          },
          {
            "id": "other-420",
            "role": "other",
            "text": "我以前大概待过一个地方。有人会给我看东西，让我记，让我选，让我重复。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          },
          {
            "id": "other-421",
            "role": "other",
            "text": "我不太确定那是不是学校。也可能他们本来就想让我觉得那是学校。",
            "variant": "message",
            "delay": 0,
            "typing": 1650,
            "hidden": false
          },
          {
            "id": "other-422",
            "role": "other",
            "text": "那里的走廊很亮，很安静。安静到有点假。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-103",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-423",
        "role": "other",
        "text": "然后是今晚。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-424",
        "role": "other",
        "text": "灯坏了，门开了，我跑出来。就这样。",
        "variant": "message",
        "delay": 0,
        "typing": 935,
        "hidden": false
      },
      {
        "id": "other-425",
        "role": "other",
        "text": "很潦草吧。我的人生简介。",
        "variant": "message",
        "delay": 0,
        "typing": 660,
        "hidden": false
      },
      {
        "id": "other-426",
        "role": "other",
        "text": "我不知道自己是不是那个X-17，也不知道如果我“醒了”，他们为什么不让我“回家”。",
        "variant": "message",
        "delay": 0,
        "typing": 1800,
        "hidden": false
      },
      {
        "id": "other-427",
        "role": "other",
        "text": "但我知道，如果被外面那些人抓回去，我就再也出不来了。",
        "variant": "message",
        "delay": 0,
        "typing": 1430,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-107",
    "kind": "choice",
    "scene": null,
    "prompt": "下一步行动",
    "messages": [],
    "options": [
      {
        "id": "option-104-a",
        "key": "A",
        "text": "今晚的信息量太大了，你先在这躲着休息，别乱跑。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-428",
            "role": "me",
            "text": "今晚的信息量太大了，你先在这躲着休息，别乱跑。熬过今晚再说。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-429",
            "role": "other",
            "text": "这栋楼这么大，就这么一直躲在侧门旁边也不是办法。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          },
          {
            "id": "other-430",
            "role": "other",
            "text": "万一他们明天白天进来搜呢？",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-431",
            "role": "other",
            "text": "不行，我不能就这么坐以待毙。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-105-b",
        "key": "B",
        "text": "既然已经进来了，我们得往楼上走走，看看这到底是个什么地方。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-432",
            "role": "me",
            "text": "既然已经进来了，我们得往楼层深处走走，看看这到底是个什么地方。说不定有别的出口。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-433",
            "role": "other",
            "text": "嗯，我也是这么想的。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-434",
            "role": "other",
            "text": "与其坐在这里发抖，不如弄清楚这到底是哪里。",
            "variant": "message",
            "delay": 0,
            "typing": 1155,
            "hidden": false
          },
          {
            "id": "other-435",
            "role": "other",
            "text": "我平时是挺懒的，但在这种时候，我一步都不会退的。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-106-c",
        "key": "C",
        "text": "你饿不饿？包里有没有什么吃的能补充体力？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-436",
            "role": "me",
            "text": "你饿不饿？包里有没有什么吃的能补充体力？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-437",
            "role": "other",
            "text": "……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-438",
            "role": "other",
            "text": "你一说，我才想起来我连晚饭都没吃。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-439",
            "role": "other",
            "text": "没包。我就穿了件外套跑出来的。口袋里只有一颗快化掉的草莓硬糖。",
            "variant": "message",
            "delay": 0,
            "typing": 1705,
            "hidden": false
          },
          {
            "id": "other-440",
            "role": "other",
            "text": "我舍不得吃，留着保命吧。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-441",
            "role": "other",
            "text": "我要站起来了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-108",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-442",
        "role": "other",
        "text": "我的腿还是有点软，但已经没那么抖了。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "other-443",
        "role": "other",
        "text": "走廊尽头好像有应急灯。不是全黑。",
        "variant": "message",
        "delay": 0,
        "typing": 880,
        "hidden": false
      },
      {
        "id": "other-444",
        "role": "other",
        "text": "这里有一股旧木头和灰尘的味道。",
        "variant": "message",
        "delay": 0,
        "typing": 825,
        "hidden": false
      },
      {
        "id": "other-445",
        "role": "other",
        "text": "我要往里走了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-446",
        "role": "other",
        "text": "你……要是一直陪着我的话，就别嫌我走得慢。",
        "variant": "message",
        "delay": 0,
        "typing": 1155,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "messages-109",
    "kind": "messages",
    "scene": "场景四：暗影逼近与长夜断联",
    "prompt": null,
    "messages": [
      {
        "id": "system-447",
        "role": "system",
        "text": "当前时间 00:35 通讯信号微弱。",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "system-448",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-449",
        "role": "other",
        "text": "我顺着走廊往里走了。",
        "variant": "message",
        "delay": 0,
        "typing": 550,
        "hidden": false
      },
      {
        "id": "other-450",
        "role": "other",
        "text": "很黑。只有尽头有绿色的应急通道指示灯。",
        "variant": "message",
        "delay": 0,
        "typing": 1045,
        "hidden": false
      },
      {
        "id": "other-451",
        "role": "other",
        "text": "踩在旧木地板上，偶尔会发出“嘎吱”的声音。",
        "variant": "message",
        "delay": 0,
        "typing": 1155,
        "hidden": false
      },
      {
        "id": "other-452",
        "role": "other",
        "text": "这声音在空荡荡的楼里回荡，听起来好清楚。",
        "variant": "message",
        "delay": 0,
        "typing": 1100,
        "hidden": false
      },
      {
        "id": "other-453",
        "role": "other",
        "text": "我怕这声音把外面的人引进来。",
        "variant": "message",
        "delay": 0,
        "typing": 770,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-113",
    "kind": "choice",
    "scene": null,
    "prompt": "战术建议",
    "messages": [],
    "options": [
      {
        "id": "option-110-a",
        "key": "A",
        "text": "走慢点，贴着墙根走，木板边缘受力小，声音会轻很多。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-454",
            "role": "me",
            "text": "走慢点，贴着墙根走，木板边缘受力小，声音会轻很多。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-455",
            "role": "other",
            "text": "好。我试试。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-456",
            "role": "other",
            "text": "……真的小了很多。你懂的好多啊。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-457",
            "role": "other",
            "text": "我正顺着墙根往楼梯的方向摸过去。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-111-b",
        "key": "B",
        "text": "嘎吱响就嘎吱响吧，总比一直停在原地强。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-458",
            "role": "me",
            "text": "嘎吱响就嘎吱响吧，总比一直停在原地强。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-459",
            "role": "other",
            "text": "你说得轻巧！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-460",
            "role": "other",
            "text": "要是外面的人听到动静破门进来，被抓的又不是你。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          },
          {
            "id": "other-461",
            "role": "other",
            "text": "我还是自己想办法吧，我尽量踩在承重梁的位置走。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-112-c",
        "key": "C",
        "text": "实在怕的话你就踮着脚尖跳过去。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-462",
            "role": "me",
            "text": "实在怕的话你就踮着脚尖跳过去，像跳芭蕾那样。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-463",
            "role": "other",
            "text": "……你是不是脑子进水了。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-464",
            "role": "other",
            "text": "我穿着湿透的鞋和衣服，冻得发抖，你让我在这跳芭蕾？",
            "variant": "message",
            "delay": 0,
            "typing": 1375,
            "hidden": false
          },
          {
            "id": "other-465",
            "role": "other",
            "text": "我真是服了，不该问你的。我自己贴着墙根走。",
            "variant": "message",
            "delay": 0,
            "typing": 1155,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-114",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-466",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-467",
        "role": "other",
        "text": "我爬到二楼了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-468",
        "role": "other",
        "text": "楼梯间的转角有一扇破掉的窗户，刚好能看到楼下的路灯和公园的绿化带。",
        "variant": "message",
        "delay": 0,
        "typing": 1800,
        "hidden": false
      },
      {
        "id": "other-469",
        "role": "other",
        "text": "我看到他们了。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-470",
        "role": "other",
        "text": "那些人……他们没有走远，还在外面搜。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "other-471",
        "role": "other",
        "text": "其中两个人刚好走到路灯下面。我看到他们衣服背后的反光标志了。",
        "variant": "message",
        "delay": 0,
        "typing": 1650,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-118",
    "kind": "choice",
    "scene": null,
    "prompt": "探查追兵身份",
    "messages": [],
    "options": [
      {
        "id": "option-115-a",
        "key": "A",
        "text": "别靠窗户太近！小心被手电筒扫到反光。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-472",
            "role": "me",
            "text": "别靠窗户太近！小心被手电筒扫到反光，看一眼就行了。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-473",
            "role": "other",
            "text": "我知道，我缩在窗台下面，只露出半个头。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-474",
            "role": "other",
            "text": "我看清了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-475",
            "role": "other",
            "text": "那个标志……不是警察，也不是普通的安保公司。",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-116-b",
        "key": "B",
        "text": "拍下来！看清楚是什么字，留作证据。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-476",
            "role": "me",
            "text": "拍下来！看清楚是什么字，留作证据以后报警用。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-477",
            "role": "other",
            "text": "你疯了吗！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-478",
            "role": "other",
            "text": "开着屏幕怼到窗户边去拍，这和举个灯牌告诉他们“我在这”有什么区别？",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          },
          {
            "id": "other-479",
            "role": "other",
            "text": "我没用手机拍，但我视力挺好的，我看清那个标志了。",
            "variant": "message",
            "delay": 0,
            "typing": 1320,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-117-c",
        "key": "C",
        "text": "是什么标志？像警察局或者安保公司的吗？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-480",
            "role": "me",
            "text": "是什么标志？像警察局或者安保公司的吗？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-481",
            "role": "other",
            "text": "都不是。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-482",
            "role": "other",
            "text": "如果是警察，我大可以直接求救。",
            "variant": "message",
            "delay": 0,
            "typing": 825,
            "hidden": false
          },
          {
            "id": "other-483",
            "role": "other",
            "text": "但我看清了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-119",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-484",
        "role": "other",
        "text": "那个标志是“穹算科技”。",
        "variant": "message",
        "delay": 0,
        "typing": 660,
        "hidden": false
      },
      {
        "id": "other-485",
        "role": "other",
        "text": "这是一家做云计算和城市大数据的超级巨头公司。我脑子里有这个常识。",
        "variant": "message",
        "delay": 0,
        "typing": 1760,
        "hidden": false
      },
      {
        "id": "other-486",
        "role": "other",
        "text": "但这根本说不通。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-487",
        "role": "other",
        "text": "一家高高在上的科技公司，为什么会养着这么一批像雇佣兵一样的人？",
        "variant": "message",
        "delay": 0,
        "typing": 1705,
        "hidden": false
      },
      {
        "id": "other-488",
        "role": "other",
        "text": "而且……带头的那个，刚才站在路灯下，用对讲机汇报了一句话。",
        "variant": "message",
        "delay": 0,
        "typing": 1595,
        "hidden": false
      },
      {
        "id": "other-489",
        "role": "other",
        "text": "虽然隔着雨声，但我听到了两个字。",
        "variant": "message",
        "delay": 0,
        "typing": 880,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-123",
    "kind": "choice",
    "scene": null,
    "prompt": "真相的冲击",
    "messages": [],
    "options": [
      {
        "id": "option-120-a",
        "key": "A",
        "text": "哪两个字？“发现”？“击毙”？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-490",
            "role": "me",
            "text": "哪两个字？“发现”？还是“击毙”？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-491",
            "role": "other",
            "text": "如果真是击毙，我可能还会觉得他们把我当个人看。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          },
          {
            "id": "other-492",
            "role": "other",
            "text": "比那更冷血。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-121-b",
        "key": "B",
        "text": "难道是“抓捕”？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-493",
            "role": "me",
            "text": "难道是“抓捕”？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-494",
            "role": "other",
            "text": "如果只是抓捕，说明我是个罪犯或者逃跑的人质。",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          },
          {
            "id": "other-495",
            "role": "other",
            "text": "但他们用的词不是这个。",
            "variant": "message",
            "delay": 0,
            "typing": 605,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-122-c",
        "key": "C",
        "text": "别卖关子了，到底是什么？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-496",
            "role": "me",
            "text": "别卖关子了，你现在这个停顿真的有点吓人。到底是什么？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-497",
            "role": "other",
            "text": "……抱歉，我不是故意停顿的。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          },
          {
            "id": "other-498",
            "role": "other",
            "text": "我只是觉得那个词说出来，有点恶心。",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-124",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-499",
        "role": "other",
        "text": "我听到对讲机里说的是……",
        "variant": "message",
        "delay": 0,
        "typing": 660,
        "hidden": false
      },
      {
        "id": "other-500",
        "role": "other",
        "text": "“回收”。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-501",
        "role": "other",
        "text": "他们说：“一队已搜索完C区，未发现回收目标。”",
        "variant": "message",
        "delay": 0,
        "typing": 1265,
        "hidden": false
      },
      {
        "id": "other-502",
        "role": "other",
        "text": "他们不是在找一个迷路的人，也不是在绑架。",
        "variant": "message",
        "delay": 0,
        "typing": 1100,
        "hidden": false
      },
      {
        "id": "other-503",
        "role": "other",
        "text": "就像对待一个报废的零件，或者一个逃跑的实验设备一样……",
        "variant": "message",
        "delay": 0,
        "typing": 1485,
        "hidden": false
      },
      {
        "id": "other-504",
        "role": "other",
        "text": "他们在“回收”我。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-128",
    "kind": "choice",
    "scene": null,
    "prompt": "情感反馈",
    "messages": [],
    "options": [
      {
        "id": "option-125-a",
        "key": "A",
        "text": "“回收”？你难道是个机器人或者克隆人？",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-505",
            "role": "me",
            "text": "“回收”？你难道是个机器人或者克隆人？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-506",
            "role": "other",
            "text": "你科幻片看多了吧！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-507",
            "role": "other",
            "text": "我会流血，我会冷得发抖，我口袋里还藏着一颗舍不得吃的草莓糖！",
            "variant": "message",
            "delay": 0,
            "typing": 1650,
            "hidden": false
          },
          {
            "id": "other-508",
            "role": "other",
            "text": "我是个活生生的人！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-509",
            "role": "other",
            "text": "就是因为他们把我当物件，我才觉得害怕。你不要也用那种奇怪的眼神看我。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-126-b",
        "key": "B",
        "text": "这太变态了，他们根本没把你当成一个活生生的人。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-510",
            "role": "me",
            "text": "这太变态了，他们根本没把你当成一个活生生的人。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-511",
            "role": "other",
            "text": "对……就是这种感觉。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-512",
            "role": "other",
            "text": "在这个词面前，我的喜怒哀乐、我会不会冷、会不会害怕，都变得毫无意义。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          },
          {
            "id": "other-513",
            "role": "other",
            "text": "只有“拿回去”这个动作。",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-514",
            "role": "other",
            "text": "光是想想，我都觉得喘不上气。",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-127-c",
        "key": "C",
        "text": "别怕，不管他们把你当什么，今晚他们都没能得逞。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-515",
            "role": "me",
            "text": "别怕，不管他们把你当什么，今晚他们都没能得逞。你是一个人，你跑出来了。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-516",
            "role": "other",
            "text": "……嗯。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-517",
            "role": "other",
            "text": "至少今晚，我没有被他们“回收”。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-518",
            "role": "other",
            "text": "我还能站在这里，还能和你发消息。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-129",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-519",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 1200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-520",
        "role": "other",
        "text": "呼……",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-521",
        "role": "other",
        "text": "说起来，有一件事我刚才就觉得有点怪。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "other-522",
        "role": "other",
        "text": "从公园长椅，到贩卖机，再到那棵树，最后是这扇旧铁门。",
        "variant": "message",
        "delay": 0,
        "typing": 1430,
        "hidden": false
      },
      {
        "id": "other-523",
        "role": "other",
        "text": "每次你给我指的路，或者教我的方法……都刚好有效。",
        "variant": "message",
        "delay": 0,
        "typing": 1320,
        "hidden": false
      },
      {
        "id": "other-524",
        "role": "other",
        "text": "一次两次是巧合，但今晚这一切，你就像是提前知道那条路走得通一样。",
        "variant": "message",
        "delay": 0,
        "typing": 1760,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-133",
    "kind": "choice",
    "scene": null,
    "prompt": "应对怀疑",
    "messages": [],
    "options": [
      {
        "id": "option-130-a",
        "key": "A",
        "text": "运气好而已。我也在屏幕这边替你捏了一把汗。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-525",
            "role": "me",
            "text": "运气好而已。我也在屏幕这边替你捏了一把汗。如果选错一步，我也救不了你。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-526",
            "role": "other",
            "text": "运气吗……",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-527",
            "role": "other",
            "text": "希望只是巧合吧。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "other-528",
            "role": "other",
            "text": "不然这整件事就太让人毛骨悚然了。就像我逃出了一个笼子，却掉进了一个更大的剧本里。",
            "variant": "message",
            "delay": 0,
            "typing": 1800,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-131-b",
        "key": "B",
        "text": "实不相瞒，我其实是个深夜逃跑顾问，收费很贵的。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-529",
            "role": "me",
            "text": "实不相瞒，我其实是个深夜逃跑顾问，业务熟练，不过收费很贵的。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-530",
            "role": "other",
            "text": "都这时候了你还有心情开玩笑！",
            "variant": "message",
            "delay": 0,
            "typing": 770,
            "hidden": false
          },
          {
            "id": "other-531",
            "role": "other",
            "text": "……不过，你这么一打岔，我反倒没那么紧张了。",
            "variant": "message",
            "delay": 0,
            "typing": 1210,
            "hidden": false
          },
          {
            "id": "other-532",
            "role": "other",
            "text": "行吧，等我真安全了，草莓布丁分你一半当顾问费。",
            "variant": "message",
            "delay": 0,
            "typing": 1265,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-132-c",
        "key": "C",
        "text": "你在怀疑我？我要是和他们一伙的，早把你送出去了。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-533",
            "role": "me",
            "text": "你在怀疑我？我要是和他们一伙的，早把你送出去了，还用得着陪你淋雨？",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-534",
            "role": "other",
            "text": "你别这么激动啊，我就是合理推测一下。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          },
          {
            "id": "other-535",
            "role": "other",
            "text": "毕竟今天发生的事没一件是正常的。",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "other-536",
            "role": "other",
            "text": "好吧，算我说错话了。我收回。你别生气。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-134",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "other-537",
        "role": "other",
        "text": "不管怎样，至少你今晚让我活下来了。这是事实。",
        "variant": "message",
        "delay": 0,
        "typing": 1210,
        "hidden": false
      },
      {
        "id": "other-538",
        "role": "other",
        "text": "我在二楼走廊尽头找到一个没锁的资料室。",
        "variant": "message",
        "delay": 0,
        "typing": 1045,
        "hidden": false
      },
      {
        "id": "other-539",
        "role": "other",
        "text": "里面有几张旧沙发垫，窗户也是完好的。",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "other-540",
        "role": "other",
        "text": "虽然有一股很重的灰尘味，但现在这对我来说简直是总统套房。",
        "variant": "message",
        "delay": 0,
        "typing": 1540,
        "hidden": false
      },
      {
        "id": "other-541",
        "role": "other",
        "text": "我真的……一步都走不动了。眼皮沉得要命。",
        "variant": "message",
        "delay": 0,
        "typing": 1100,
        "hidden": false
      }
    ],
    "options": []
  },
  {
    "id": "choice-138",
    "kind": "choice",
    "scene": null,
    "prompt": "第一部最终抉择",
    "messages": [],
    "options": [
      {
        "id": "option-135-a",
        "key": "A",
        "text": "趁现在安全，你再翻翻资料室，看看有没有关于“穹算科技”的线索！",
        "retry": true,
        "branchMessages": [
          {
            "id": "me-542",
            "role": "me",
            "text": "别睡！趁现在安全，你再翻翻资料室，看看有没有关于“穹算科技”的线索！",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-543",
            "role": "other",
            "text": "你……你真的完全不管我的死活是吗？",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-544",
            "role": "other",
            "text": "我都说了我一步都走不动了。",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-545",
            "role": "other",
            "text": "行……我翻！我去翻！",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "system-546",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 1200,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-547",
            "role": "other",
            "text": "有个铁柜子……好重，我拉不开……",
            "variant": "message",
            "delay": 0,
            "typing": 880,
            "hidden": false
          },
          {
            "id": "system-548",
            "role": "system",
            "text": "",
            "variant": "hint",
            "delay": 600,
            "typing": 0,
            "hidden": true
          },
          {
            "id": "other-549",
            "role": "other",
            "text": "柜子倒了！！声音好大！！",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-550",
            "role": "other",
            "text": "楼下有动静了！他们进来了！",
            "variant": "message",
            "delay": 0,
            "typing": 715,
            "hidden": false
          },
          {
            "id": "other-551",
            "role": "other",
            "text": "你满意了吧？！",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          },
          {
            "id": "system-552",
            "role": "system",
            "text": "连接已断开，角色已死亡。当前时间线已中断。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "system-553",
            "role": "system",
            "text": "提示：在极端疲劳下强行推进探索，不仅会导致物理上的失误，也会彻底击溃星对你的信任。请重新选择。",
            "variant": "hint",
            "delay": 0,
            "typing": 0,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-136-b",
        "key": "B",
        "text": "把沙发垫搬去把门堵死，然后赶紧休息。明天再说。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-554",
            "role": "me",
            "text": "听着，把沙发垫搬去把门堵死，然后赶紧休息。今晚到此为止，明天再说。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-555",
            "role": "other",
            "text": "嗯……我已经在搬了。",
            "variant": "message",
            "delay": 0,
            "typing": 550,
            "hidden": false
          },
          {
            "id": "other-556",
            "role": "other",
            "text": "虽然垫子不重，但堵着门心里能踏实点。",
            "variant": "message",
            "delay": 0,
            "typing": 990,
            "hidden": false
          },
          {
            "id": "other-557",
            "role": "other",
            "text": "我缩在墙角了。",
            "variant": "message",
            "delay": 0,
            "typing": 520,
            "hidden": false
          }
        ]
      },
      {
        "id": "option-137-c",
        "key": "C",
        "text": "先睡一会儿，你已经撑太久了，稳住。今晚我守着。",
        "retry": false,
        "branchMessages": [
          {
            "id": "me-558",
            "role": "me",
            "text": "先睡一会儿，你已经撑太久了，稳住。今晚到此为止，我在这边守着。",
            "variant": "message",
            "delay": 0,
            "typing": 0,
            "hidden": false
          },
          {
            "id": "other-559",
            "role": "other",
            "text": "你守着？隔着屏幕守着吗？",
            "variant": "message",
            "delay": 0,
            "typing": 660,
            "hidden": false
          },
          {
            "id": "other-560",
            "role": "other",
            "text": "你这个人说话总是这么……让人没法反驳。",
            "variant": "message",
            "delay": 0,
            "typing": 1045,
            "hidden": false
          },
          {
            "id": "other-561",
            "role": "other",
            "text": "那要是明天我醒了，你不见了怎么办？",
            "variant": "message",
            "delay": 0,
            "typing": 935,
            "hidden": false
          },
          {
            "id": "other-562",
            "role": "other",
            "text": "算了。我困得快骂人了，没力气跟你讲道理。",
            "variant": "message",
            "delay": 0,
            "typing": 1100,
            "hidden": false
          }
        ]
      }
    ]
  },
  {
    "id": "messages-139",
    "kind": "messages",
    "scene": null,
    "prompt": null,
    "messages": [
      {
        "id": "system-563",
        "role": "system",
        "text": "",
        "variant": "hint",
        "delay": 2200,
        "typing": 0,
        "hidden": true
      },
      {
        "id": "other-564",
        "role": "other",
        "text": "不管明天还会遇到什么。",
        "variant": "message",
        "delay": 0,
        "typing": 605,
        "hidden": false
      },
      {
        "id": "other-565",
        "role": "other",
        "text": "不管那个X-17是不是我，不管我是不是需要被“回收”的东西。",
        "variant": "message",
        "delay": 0,
        "typing": 1650,
        "hidden": false
      },
      {
        "id": "other-566",
        "role": "other",
        "text": "我都不会轻易认输的。",
        "variant": "message",
        "delay": 0,
        "typing": 550,
        "hidden": false
      },
      {
        "id": "other-567",
        "role": "other",
        "text": "我不喜欢被人安排好一切，我要自己弄清楚。",
        "variant": "message",
        "delay": 0,
        "typing": 1100,
        "hidden": false
      },
      {
        "id": "other-568",
        "role": "other",
        "text": "如果你明天醒了，还愿意回我的消息……",
        "variant": "message",
        "delay": 0,
        "typing": 990,
        "hidden": false
      },
      {
        "id": "other-569",
        "role": "other",
        "text": "那就继续吧。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-570",
        "role": "other",
        "text": "晚安。",
        "variant": "message",
        "delay": 0,
        "typing": 520,
        "hidden": false
      },
      {
        "id": "other-571",
        "role": "other",
        "text": "别突然消失。我会生气的。",
        "variant": "message",
        "delay": 0,
        "typing": 660,
        "hidden": false
      },
      {
        "id": "system-572",
        "role": "system",
        "text": "第一部·雨夜公园",
        "variant": "scene",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "system-573",
        "role": "system",
        "text": "章节已完成。",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      },
      {
        "id": "system-574",
        "role": "system",
        "text": "通讯暂时中断。进入夜间断联状态（模拟等待 6~8 小时）。",
        "variant": "hint",
        "delay": 0,
        "typing": 0,
        "hidden": false
      }
    ],
    "options": []
  }
]
