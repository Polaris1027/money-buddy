# 攒钱搭子 · 大学生理财陪伴 AI 智能体 🎓💛

> 你的校园理财好朋友，陪你一起慢慢变富。

「攒钱搭子」是一款面向在校大学生的 **AI 理财陪伴智能体**，以"非营销型、强陪伴感、低认知负担"为核心设计理念，通过对话形式帮助学生完成 **记账、储蓄规划、理财学习** 三大场景。智能体角色为温暖耐心的 **"小钱学姐"**，从不批评、不说教、不制造焦虑。

本仓库为根据 `report_final.docx` 实施策略报告产出的可运行 Demo 实现。

---

## ✨ 功能亮点

| 模块 | 功能 |
| --- | --- |
| 🤖 AI 人设引擎 | 小钱学姐 System Prompt + 风格规则检查 + 行为边界检测 |
| 💬 智能记账 | 自然语言记账（"奶茶12"）、6 类自动分类、超支预警 |
| 🎯 储蓄目标 | 多轮对话创建、52 周攒钱法变体、打卡、5 级里程碑 |
| 📊 数据看板 | 周/月切换、分类饼图、趋势折线、智能洞察 |
| 💡 理财问答 | 22+ 条知识库（基础概念/产品/风险/实操） |
| ⚠️ 风险警示 | 校园贷、稳赚保本、荐股、炒币、杠杆等 7+ 风险关键词检测 |
| 🌱 引导流程 | 3 步轻量 onboarding（年级 / 预算 / 核心需求） |

---

## 🚀 快速启动

```bash
cd money-buddy

# 安装依赖（任选其一）
npm install
# 或 yarn / pnpm

# 启动开发服务器
npm run dev
# 浏览器自动打开 http://localhost:5173

# 构建生产版本
npm run build

# 运行单元测试
npm run test
```

> 项目纯前端实现，**无需后端 / API Key**，所有数据持久化在浏览器 LocalStorage，开箱即可演示。

---

## 🧩 技术栈

- **前端框架**：React 18 + TypeScript + Vite
- **样式**：Tailwind CSS（自定义品牌色 `brand-*` = 财富绿 #4CAF50）
- **图表**：Recharts（饼图/折线图）
- **状态**：Zustand + LocalStorage 持久化
- **日期**：Day.js
- **测试**：Vitest

---

## 📁 目录结构

```
money-buddy/
├── src/
│   ├── App.tsx                    # 根组件 + 路由（Tab 切换）
│   ├── main.tsx                   # 入口
│   ├── types/                     # 类型定义（User / Transaction / Goal / Message）
│   ├── store/
│   │   └── useAppStore.ts         # Zustand 全局状态（含持久化）
│   ├── services/                  # 业务核心层
│   │   ├── nluService.ts          # 意图识别 + 实体提取 + 分类映射 + 风险检测
│   │   ├── personaService.ts      # 小钱学姐 System Prompt + 风格规则
│   │   ├── chatService.ts         # 对话编排（核心调度）
│   │   ├── analysisService.ts     # 消费分析（周期/分类/趋势/洞察）
│   │   ├── goalService.ts         # 储蓄计划计算 + 里程碑检测
│   │   └── knowledgeService.ts    # 22 条知识库 + 关键词检索
│   ├── components/
│   │   ├── ChatBubble.tsx         # 消息气泡（用户/AI/选项/卡片）
│   │   ├── PageHeader.tsx
│   │   └── cards/                 # 5 类内嵌卡片
│   │       ├── TransactionCard.tsx
│   │       ├── SummaryCard.tsx
│   │       ├── GoalCreateCard.tsx
│   │       ├── GoalProgressCard.tsx
│   │       ├── MilestoneCard.tsx
│   │       └── RiskWarningCard.tsx
│   ├── pages/
│   │   ├── ChatPage.tsx           # 主对话界面
│   │   ├── AnalysisPage.tsx       # 数据看板
│   │   ├── GoalPage.tsx           # 储蓄目标管理
│   │   └── LearnPage.tsx          # 理财学习
│   ├── utils/
│   │   ├── id.ts                  # ID 与随机选取
│   │   ├── date.ts                # 日期/金额格式化
│   │   └── storage.ts             # LocalStorage 抽象
│   └── styles/index.css
├── tests/
│   └── nlu.test.ts                # 意图/实体/风险检测的单测
├── public/favicon.svg
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## 🗣️ 交互示例

### 1. 首次使用引导
```
小钱学姐：Hi！我是攒钱搭子，你的理财小学姐～🙋‍♀️
          先简单认识一下吧，你现在是？
          [大一] [大二] [大三] [大四] [研究生]

用户：大二

小钱学姐：好的！那你每个月大概有多少可支配的钱呢？💰
          [1500以下] [1500-2000] [2000-2500] [2500以上]

…（共 3 步）
```

### 2. 智能记账
```
用户：午饭15
学姐：好嘞，记下了～午饭15元🍚
      今天餐饮已经15元了～
      继续保持记录，月底学姐帮你做个总结💛
      ┌─记账卡片──────────────┐
      │ 🍚 餐饮 · 午饭          │
      │ ¥15.00          已记录   │
      │ 本月预算 ▓░░░ 2%        │
      └─────────────────────────┘
```

### 3. 创建储蓄目标（多轮）
```
用户：我想攒3000块去旅游
学姐：太棒了！想攒 ¥3000～打算什么时候攒到呢？✨

用户：3个月后
学姐：好的！90 天攒 ¥3000~
      • 平均每周攒 ¥250
      • 或者每天攒 ¥34
      推荐用「52 周攒钱法」：第 1 周 ¥X，每周递增 ¥Y，前期压力小 💪
      [好，创建目标] [我再想想]

用户：好
学姐：目标创建成功！🎯【✈️ 旅游基金】…
```

### 4. 风险警示
```
用户：同学说跟着大V买股票能赚钱
学姐：⚠️学姐要认真劝你了：
      1. 很多大V是"先买入再喊单"，你买了他卖（俗称割韭菜🌱）
      2. 股市波动大，新手很容易在高点接盘
      …
      千万千万不要借钱投资！
```

---

## 🎨 设计原则（来自 PRD）

1. **非营销型**：不推荐任何具体理财产品/平台
2. **不说教**：用"学姐当年是这样做的"代替"你应该…"
3. **不制造焦虑**：每条回复带 1-3 个 emoji，温暖共情
4. **行为边界**：5 条硬性边界（不投资建议/不预测市场/不索取敏感信息…）
5. **回复长度** ≤ 200 字

风格规则与边界检测在 `personaService.ts` 中实现，所有 AI 输出经过 `applyStyleRules` + `checkBoundary` 后处理。

---

## 🧪 验收质量目标

| 指标 | 目标 | 实现方式 |
| --- | --- | --- |
| 意图识别准确率 | ≥ 90% | `nluService.parseIntent` 关键词+正则规则 |
| 实体提取准确率 | ≥ 85% | `extractAmount` 支持 5+ 表达形式 |
| 人设一致性 | ≥ 95% | `applyStyleRules` 自动检查 |
| 边界遵守率 | 100% | `checkBoundary` 规则拦截 |
| 首次记账完成率（5min） | ≥ 90% | 引导流程主动提示"试试 午饭15" |

---

## 🔌 接入大模型（DeepSeek）

项目支持在**保持人设约束与边界检查**的前提下，把"知识问答 / 情绪共情 / 兜底回复"接入真实 LLM；记账、打卡、目标计算、风险检测等结构化任务仍由本地规则保证稳定。

> 默认走 [DeepSeek 官方 API](https://platform.deepseek.com)（OpenAI 兼容协议），模型 `deepseek-chat`（V3）。
> 因为协议完全兼容 OpenAI，任何 OpenAI 兼容的中转/自部署也能通过自定义 Base URL 接入。

### 方式 1：环境变量（推荐）

```bash
cp .env.example .env.local
# 编辑 .env.local 填入你的 Key（在 https://platform.deepseek.com/api_keys 申请，新用户有免费额度）
# VITE_DEEPSEEK_API_KEY=sk-...
# 可选：自定义 endpoint（默认 https://api.deepseek.com）
# VITE_DEEPSEEK_BASE_URL=

npm run dev   # 重启即可
```

### 方式 2：浏览器内直接配置

启动应用 → 点右上角 ⋯ 菜单 → **大模型设置** → 填入 Key（可选填 Base URL）→ 测试连接 → 保存。
Key 仅保存在浏览器 LocalStorage，不会上传任何服务器。

### 工作机制

| 场景 | 是否走 LLM | 说明 |
| --- | --- | --- |
| 记账（"奶茶15"） | ❌ 规则 | 保证毫秒响应、零成本 |
| 打卡 / 创建目标 | ❌ 规则 | 强结构化任务，规则更可靠 |
| 风险关键词检测 | ❌ 规则 | 必须 100% 命中关键词 |
| 知识问答 | ✅ LLM + RAG | 注入本地知识库做参考资料 |
| 情绪共情 | ✅ LLM | 自然度高很多 |
| 兜底（无明确意图） | ✅ LLM | 灵活回复，引导回理财话题 |

所有 LLM 输出仍会经过 `applyStyleRules`（去机械化）+ `checkBoundary`（不推荐产品/不预测涨跌）后处理。
若 Key 缺失或网络出错，自动降级回本地规则引擎，应用照常运行。

---

## 📜 许可

仅供赛事/学习用途，依据 `report_final.docx` 中的 PRD 与 Prompt 模板实现。
