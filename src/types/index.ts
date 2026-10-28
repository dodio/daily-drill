/** 科目标识。新增科目时在此扩展，并在 src/modules 下建立对应目录。 */
export type SubjectId = 'math' | 'recite' | 'words' | 'puzzle';

/** 单道错题的快照，用于复盘。 */
export interface WrongItem {
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
}

/** 一次练习的完整记录，是持久化的最小单元。 */
export interface SessionRecord {
  id: string;
  subject: SubjectId;
  /** 本地时区日期 YYYY-MM-DD，用于按天聚合与连续打卡计算 */
  date: string;
  startedAt: number;
  durationMs: number;
  total: number;
  correct: number;
  /** 练法。旧记录没有这个字段，按「按题数」处理 */
  mode?: 'count' | 'timed';
  /**
   * 练习还是游戏。旧记录没有这个字段，按练习处理。
   * 分这个是因为拼图不是「做题」，混进题数和正确率里会让家长看到的学习量失真。
   */
  kind?: 'quiz' | 'game';
  wrongItems: WrongItem[];
}

/** localStorage 中的根数据结构。version 变更时应提供迁移逻辑。 */
export interface AppData {
  version: 1;
  sessions: SessionRecord[];
}

/** 一次练习的结果，由各模块的答题组件回传给页面。 */
export interface PracticeResult {
  total: number;
  correct: number;
  durationMs: number;
  wrongItems: WrongItem[];
}

/** 科目展示元信息 */
export interface SubjectMeta {
  id: SubjectId;
  name: string;
  en: string;
  icon: string;
  desc: string;
  route: string;
  ready: boolean;
  /** 首页分组：学习科目 / 益智游戏 */
  group: 'study' | 'puzzle';
  /** 计量单位，决定首页是「今天已练 N 题」还是「今天玩了 N 关」 */
  unit: '题' | '关';
}
