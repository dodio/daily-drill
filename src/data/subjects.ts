import type { SubjectMeta } from '../types/index.ts';

/** 科目注册表：首页入口、统计聚合都从这里读取，新增科目只改这里 + 加一个模块目录。 */
export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'math',
    name: '口算',
    en: 'Mental Math',
    icon: '🔢',
    desc: '加减乘除，一天一组',
    route: '/math',
    ready: true,
    group: 'study',
    unit: '题',
  },
  {
    id: 'recite',
    name: '背诵',
    en: 'Recite',
    icon: '📜',
    desc: '一、二年级古诗文接句',
    route: '/recite',
    ready: true,
    group: 'study',
    unit: '题',
  },
  {
    id: 'words',
    name: '单词',
    en: 'Words',
    icon: '🔤',
    desc: '英语单词，看词选义',
    route: '/words',
    ready: false,
    group: 'study',
    unit: '题',
  },
  {
    id: 'puzzle',
    name: '像素拼接',
    en: 'Pixel Fit',
    icon: '🧩',
    desc: '把碎块拼满整个盘子',
    route: '/puzzle',
    ready: true,
    group: 'puzzle',
    unit: '关',
  },
];

export function getSubject(id: string): SubjectMeta | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
