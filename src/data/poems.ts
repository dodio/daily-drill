export interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  /** 按顺序排列的诗句，接句题依赖这个顺序 */
  lines: string[];
}

/** 小学阶段高频古诗。新增只需往数组里加，接句题与干扰项会自动纳入。 */
export const POEMS: Poem[] = [
  {
    id: 'jingyesi',
    title: '静夜思',
    author: '李白',
    dynasty: '唐',
    lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
  },
  {
    id: 'chunxiao',
    title: '春晓',
    author: '孟浩然',
    dynasty: '唐',
    lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
  },
  {
    id: 'dengguanquelou',
    title: '登鹳雀楼',
    author: '王之涣',
    dynasty: '唐',
    lines: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'],
  },
  {
    id: 'yonge',
    title: '咏鹅',
    author: '骆宾王',
    dynasty: '唐',
    lines: ['鹅鹅鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'],
  },
  {
    id: 'minnong',
    title: '悯农',
    author: '李绅',
    dynasty: '唐',
    lines: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'],
  },
  {
    id: 'jiangxue',
    title: '江雪',
    author: '柳宗元',
    dynasty: '唐',
    lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'],
  },
  {
    id: 'wanglushanpubu',
    title: '望庐山瀑布',
    author: '李白',
    dynasty: '唐',
    lines: ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天'],
  },
  {
    id: 'zaifabaidicheng',
    title: '早发白帝城',
    author: '李白',
    dynasty: '唐',
    lines: ['朝辞白帝彩云间', '千里江陵一日还', '两岸猿声啼不住', '轻舟已过万重山'],
  },
  {
    id: 'cunju',
    title: '村居',
    author: '高鼎',
    dynasty: '清',
    lines: ['草长莺飞二月天', '拂堤杨柳醉春烟', '儿童散学归来早', '忙趁东风放纸鸢'],
  },
  {
    id: 'xiaochi',
    title: '小池',
    author: '杨万里',
    dynasty: '宋',
    lines: ['泉眼无声惜细流', '树阴照水爱晴柔', '小荷才露尖尖角', '早有蜻蜓立上头'],
  },
];

export function getPoem(id: string): Poem | undefined {
  return POEMS.find((p) => p.id === id);
}
