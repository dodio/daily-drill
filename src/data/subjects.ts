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
  },
  {
    id: 'recite',
    name: '背诵',
    en: 'Recite',
    icon: '📜',
    desc: '古诗接句，读熟记牢',
    route: '/recite',
    ready: true,
  },
  {
    id: 'words',
    name: '单词',
    en: 'Words',
    icon: '🔤',
    desc: '英语单词，看词选义',
    route: '/words',
    ready: false,
  },
];

export function getSubject(id: string): SubjectMeta | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
