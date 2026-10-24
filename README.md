# 每日一练 · Daily Drill

给小学生每天用的轻量练习应用。做题、记账、看连续天数——不注册、不联网、不上传任何数据。

纯前端，所有练习记录存在浏览器 `localStorage` 里。

## 技术栈

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 构建 | Vite 8 | 和同目录的 keyboard-learn 保持同一代工具链 |
| 框架 | React 19 + TypeScript | strict 模式，`verbatimModuleSyntax` |
| 路由 | 自写 hash 路由（`src/lib/router.ts`） | 零依赖；纯静态托管刷新任意路径不 404 |
| 样式 | 原生 CSS + CSS 变量 | 无 UI 库；`index.css` 里统一管理设计 token，自带暗色适配 |
| 数据 | localStorage | 带 `version` 字段，未来换后端只需替换 `src/lib/storage.ts` |

## 目录结构

```
src/
├── main.tsx                  入口
├── App.tsx                   路由表
├── index.css                 设计 token + 全部样式
├── types/index.ts            全局类型（SessionRecord 是持久化核心）
├── data/
│   ├── subjects.ts           科目注册表（新增科目从这里入手）
│   └── poems.ts              古诗数据
├── lib/
│   ├── router.ts             hash 路由
│   ├── storage.ts            localStorage 读写与容错
│   ├── stats.ts              今日汇总 / 连续打卡 / 7 天趋势
│   ├── date.ts               本地时区日期工具
│   └── id.ts                 唯一 id（局域网 http 下 randomUUID 降级）
├── store/
│   └── DailyLogProvider.tsx  全局练习数据 Context
├── components/               跨模块复用组件
│   ├── Numpad.tsx
│   ├── ResultCard.tsx
│   ├── SubjectCard.tsx
│   └── StreakBadge.tsx
├── modules/                  每个科目一个目录，互相独立
│   ├── math/                 口算
│   │   ├── MathPage.tsx      页面编排：setup → quiz → result
│   │   ├── MathSetup.tsx     难度/题型/题量
│   │   ├── MathQuiz.tsx      答题（数字键盘 + 物理键盘）
│   │   └── generator.ts      题目生成
│   └── recite/               背诵
│       ├── RecitePage.tsx
│       ├── ReciteSetup.tsx
│       ├── ReciteQuiz.tsx
│       └── generator.ts      接句题 + 干扰项
└── pages/
    ├── Home.tsx
    └── NotFound.tsx
```

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc 类型检查 + 打包到 dist/
npm run preview    # 本地预览构建产物
npm run typecheck  # 只做类型检查
```

手机/平板联调：`npm run dev -- --host`，用同一局域网 IP 访问。

## 部署

推到 `main` / `master` 分支后，GitHub Actions 自动构建并发布到 Pages（见 `.github/workflows/deploy.yml`）。

- 仓库名是 `daily-drill` → 访问 `https://<用户名>.github.io/daily-drill/`
- 想绑独立域名 → 去掉 workflow 里的 `VITE_BASE` 环境变量，让 `base` 回到 `/`

## 数据模型

一次练习存成一条 `SessionRecord`：

```ts
{
  id, subject, date,        // date 是本地时区 YYYY-MM-DD，按天聚合靠它
  startedAt, durationMs,
  total, correct,
  wrongItems: [{ prompt, yourAnswer, correctAnswer }]
}
```

首页的「今日题数」「连续天数」「7 天趋势」全部由这个数组派生，不额外存冗余状态。
连续天数的规则：**今天还没练不打断连续**，避免早上打开就看到归零。

## 怎么加一个新科目

以「英语单词」为例：

1. `src/data/subjects.ts` 里把 `words` 的 `ready` 改成 `true`
2. 新建 `src/modules/words/`，照 `math` 的结构写 `WordsPage / WordsSetup / WordsQuiz / generator`
3. `src/App.tsx` 加一条 `case '/words'`
4. 数据（词表）放 `src/data/words.ts`

`SessionRecord.subject` 是 `SubjectId` 联合类型，加科目时记得扩 `src/types/index.ts`。

## 路线图

- [x] 口算：加减乘除、三档难度、数字键盘
- [x] 背诵：古诗接句四选一
- [ ] 英语单词（看词选义）
- [ ] 错题本：跨天沉淀、只练错题
- [ ] 家长视角：一周汇总
- [ ] 可选的后端同步（多设备）
