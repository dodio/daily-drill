export type Grade = 1 | 2;
export type Volume = 'up' | 'down';
/** poem=古诗文，text=日积月累里的传统韵文（数九歌、节气歌、弟子规等） */
export type EntryKind = 'poem' | 'text';

export interface Poem {
  id: string;
  title: string;
  /** 民歌、俗谚一类没有作者，留空 */
  author: string;
  dynasty: string;
  grade: Grade;
  volume: Volume;
  kind: EntryKind;
  /** 按顺序排列的诗句，接句题依赖这个顺序 */
  lines: string[];
}

export const GRADE_LABELS: Record<Grade, string> = {
  1: '一年级',
  2: '二年级',
};

export const VOLUME_LABELS: Record<Volume, string> = {
  up: '上册',
  down: '下册',
};

/**
 * 统编版（部编版）小学语文一、二年级教材内要求背诵的古诗文。
 *
 * 篇目与分册依据：统编版语文一上 6 首、一下 7 首、二上 7 首、二下 7 首；
 * 另收二上/二下「日积月累」中成段的传统韵文（数九歌、二十四节气歌、弟子规节选）。
 *
 * 只收教材原文，不做扩写和改写；现代白话课文原文涉及版权，未收录。
 * 课本标注「节选」的按课本篇幅截取（古朗月行、赋得古原草送别）。
 */
export const POEMS: Poem[] = [
  // ---------- 一年级上册 ----------
  {
    id: 'yonge',
    title: '咏鹅',
    author: '骆宾王',
    dynasty: '唐',
    grade: 1,
    volume: 'up',
    kind: 'poem',
    lines: ['鹅鹅鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'],
  },
  {
    id: 'jiangnan',
    title: '江南',
    author: '汉乐府',
    dynasty: '',
    grade: 1,
    volume: 'up',
    kind: 'poem',
    lines: [
      '江南可采莲',
      '莲叶何田田',
      '鱼戏莲叶间',
      '鱼戏莲叶东',
      '鱼戏莲叶西',
      '鱼戏莲叶南',
      '鱼戏莲叶北',
    ],
  },
  {
    id: 'hua',
    title: '画',
    author: '佚名',
    dynasty: '',
    grade: 1,
    volume: 'up',
    kind: 'poem',
    lines: ['远看山有色', '近听水无声', '春去花还在', '人来鸟不惊'],
  },
  {
    id: 'minnong-2',
    title: '悯农（其二）',
    author: '李绅',
    dynasty: '唐',
    grade: 1,
    volume: 'up',
    kind: 'poem',
    lines: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'],
  },
  {
    id: 'gulangyuexing',
    title: '古朗月行（节选）',
    author: '李白',
    dynasty: '唐',
    grade: 1,
    volume: 'up',
    kind: 'poem',
    lines: ['小时不识月', '呼作白玉盘', '又疑瑶台镜', '飞在青云端'],
  },
  {
    id: 'feng',
    title: '风',
    author: '李峤',
    dynasty: '唐',
    grade: 1,
    volume: 'up',
    kind: 'poem',
    lines: ['解落三秋叶', '能开二月花', '过江千尺浪', '入竹万竿斜'],
  },

  // ---------- 一年级下册 ----------
  {
    id: 'chunxiao',
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    grade: 1,
    volume: 'down',
    kind: 'poem',
    lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
  },
  {
    id: 'zengwanglun',
    title: '赠汪伦',
    author: '李白',
    dynasty: '唐',
    grade: 1,
    volume: 'down',
    kind: 'poem',
    lines: ['李白乘舟将欲行', '忽闻岸上踏歌声', '桃花潭水深千尺', '不及汪伦送我情'],
  },
  {
    id: 'jingyesi',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    grade: 1,
    volume: 'down',
    kind: 'poem',
    lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
  },
  {
    id: 'xunyinzhe',
    title: '寻隐者不遇',
    author: '贾岛',
    dynasty: '唐',
    grade: 1,
    volume: 'down',
    kind: 'poem',
    lines: ['松下问童子', '言师采药去', '只在此山中', '云深不知处'],
  },
  {
    id: 'chishang',
    title: '池上',
    author: '白居易',
    dynasty: '唐',
    grade: 1,
    volume: 'down',
    kind: 'poem',
    lines: ['小娃撑小艇', '偷采白莲回', '不解藏踪迹', '浮萍一道开'],
  },
  {
    id: 'xiaochi',
    title: '小池',
    author: '杨万里',
    dynasty: '宋',
    grade: 1,
    volume: 'down',
    kind: 'poem',
    lines: ['泉眼无声惜细流', '树阴照水爱晴柔', '小荷才露尖尖角', '早有蜻蜓立上头'],
  },
  {
    id: 'huaji',
    title: '画鸡',
    author: '唐寅',
    dynasty: '明',
    grade: 1,
    volume: 'down',
    kind: 'poem',
    lines: ['头上红冠不用裁', '满身雪白走将来', '平生不敢轻言语', '一叫千门万户开'],
  },

  // ---------- 二年级上册 ----------
  {
    id: 'meihua',
    title: '梅花',
    author: '王安石',
    dynasty: '宋',
    grade: 2,
    volume: 'up',
    kind: 'poem',
    lines: ['墙角数枝梅', '凌寒独自开', '遥知不是雪', '为有暗香来'],
  },
  {
    id: 'xiaoerchuidiao',
    title: '小儿垂钓',
    author: '胡令能',
    dynasty: '唐',
    grade: 2,
    volume: 'up',
    kind: 'poem',
    lines: ['蓬头稚子学垂纶', '侧坐莓苔草映身', '路人借问遥招手', '怕得鱼惊不应人'],
  },
  {
    id: 'dengguanquelou',
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    grade: 2,
    volume: 'up',
    kind: 'poem',
    lines: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'],
  },
  {
    id: 'wanglushanpubu',
    title: '望庐山瀑布',
    author: '李白',
    dynasty: '唐',
    grade: 2,
    volume: 'up',
    kind: 'poem',
    lines: ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天'],
  },
  {
    id: 'jiangxue',
    title: '江雪',
    author: '柳宗元',
    dynasty: '唐',
    grade: 2,
    volume: 'up',
    kind: 'poem',
    lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'],
  },
  {
    id: 'yesushansi',
    title: '夜宿山寺',
    author: '李白',
    dynasty: '唐',
    grade: 2,
    volume: 'up',
    kind: 'poem',
    lines: ['危楼高百尺', '手可摘星辰', '不敢高声语', '恐惊天上人'],
  },
  {
    id: 'chilege',
    title: '敕勒歌',
    author: '北朝民歌',
    dynasty: '',
    grade: 2,
    volume: 'up',
    kind: 'poem',
    lines: ['敕勒川，阴山下', '天似穹庐，笼盖四野', '天苍苍，野茫茫', '风吹草低见牛羊'],
  },
  {
    id: 'shujiuge',
    title: '数九歌',
    author: '民间',
    dynasty: '',
    grade: 2,
    volume: 'up',
    kind: 'text',
    lines: [
      '一九二九不出手',
      '三九四九冰上走',
      '五九六九沿河看柳',
      '七九河开，八九燕来',
      '九九加一九，犁牛遍地走',
    ],
  },

  // ---------- 二年级下册 ----------
  {
    id: 'cunju',
    title: '村居',
    author: '高鼎',
    dynasty: '清',
    grade: 2,
    volume: 'down',
    kind: 'poem',
    lines: ['草长莺飞二月天', '拂堤杨柳醉春烟', '儿童散学归来早', '忙趁东风放纸鸢'],
  },
  {
    id: 'yongliu',
    title: '咏柳',
    author: '贺知章',
    dynasty: '唐',
    grade: 2,
    volume: 'down',
    kind: 'poem',
    lines: ['碧玉妆成一树高', '万条垂下绿丝绦', '不知细叶谁裁出', '二月春风似剪刀'],
  },
  {
    id: 'gucaoyuan',
    title: '赋得古原草送别（节选）',
    author: '白居易',
    dynasty: '唐',
    grade: 2,
    volume: 'down',
    kind: 'poem',
    lines: ['离离原上草', '一岁一枯荣', '野火烧不尽', '春风吹又生'],
  },
  {
    id: 'xiaochujingci',
    title: '晓出净慈寺送林子方',
    author: '杨万里',
    dynasty: '宋',
    grade: 2,
    volume: 'down',
    kind: 'poem',
    lines: ['毕竟西湖六月中', '风光不与四时同', '接天莲叶无穷碧', '映日荷花别样红'],
  },
  {
    id: 'jueju',
    title: '绝句',
    author: '杜甫',
    dynasty: '唐',
    grade: 2,
    volume: 'down',
    kind: 'poem',
    lines: ['两个黄鹂鸣翠柳', '一行白鹭上青天', '窗含西岭千秋雪', '门泊东吴万里船'],
  },
  {
    id: 'minnong-1',
    title: '悯农（其一）',
    author: '李绅',
    dynasty: '唐',
    grade: 2,
    volume: 'down',
    kind: 'poem',
    lines: ['春种一粒粟', '秋收万颗子', '四海无闲田', '农夫犹饿死'],
  },
  {
    id: 'zhouyeshujian',
    title: '舟夜书所见',
    author: '查慎行',
    dynasty: '清',
    grade: 2,
    volume: 'down',
    kind: 'poem',
    lines: ['月黑见渔灯', '孤光一点萤', '微微风簇浪', '散作满河星'],
  },
  {
    id: 'erxieqi',
    title: '二十四节气歌',
    author: '民间',
    dynasty: '',
    grade: 2,
    volume: 'down',
    kind: 'text',
    lines: ['春雨惊春清谷天', '夏满芒夏暑相连', '秋处露秋寒霜降', '冬雪雪冬小大寒'],
  },
  {
    id: 'dizigui',
    title: '弟子规（节选）',
    author: '李毓秀',
    dynasty: '清',
    grade: 2,
    volume: 'down',
    kind: 'text',
    lines: [
      '冠必正，纽必结',
      '袜与履，俱紧切',
      '置冠服，有定位',
      '勿乱顿，致污秽',
      '惟德学，惟才艺',
      '不如人，当自励',
      '若衣服，若饮食',
      '不如人，勿生戚',
    ],
  },
];

export function getPoem(id: string): Poem | undefined {
  return POEMS.find((p) => p.id === id);
}

/** 按年级 + 册筛出这一学期的篇目，顺序与教材一致。 */
export function poemsFor(grade: Grade, volume: Volume): Poem[] {
  return POEMS.filter((p) => p.grade === grade && p.volume === volume);
}

/** 教材出处，用来在题面上标注「《静夜思》唐·李白」。没有作者时只显示朝代。 */
export function sourceLabel(poem: Poem): string {
  const tail = [poem.dynasty, poem.author].filter(Boolean).join('·');
  return tail ? `《${poem.title}》 ${tail}` : `《${poem.title}》`;
}
