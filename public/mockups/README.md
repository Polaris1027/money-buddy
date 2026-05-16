# 攒钱搭子 · 设计稿

## chat-mockup.svg

手机聊天界面矢量图（390 × 844，iPhone 14 Pro 尺寸），与项目实际 UI 一致。

### 包含元素
- 手机外壳 + 灵动岛状态栏（9:41 / 信号 / WiFi / 电池）
- 顶部绿色渐变导航栏（小钱学姐头像 + 「攒钱搭子 🎓」标题 + 「小钱学姐 · 🧠 Agent 模式」副标题）
- 7 条对话：
  1. 学姐欢迎语（白底气泡 + 左上小尖角）
  2. 年级选择胶囊按钮（大一 / 大二 / 大三 / 大四）
  3. 用户回复：大一 🎉（绿色渐变气泡）
  4. 学姐引导记账
  5. 用户输入：奶茶15 午餐18
  6. 学姐返回 📊 今日消费记录卡片（含奶茶 -¥15、午餐 -¥18、合计 -¥33）
  7. 学姐打字中（三跳动点 SMIL 动画）
- 快捷入口栏：📊 消费分析 / 💰 收入分析 / 🎯 储蓄目标 / 💡 理财 / 👥 社区
- 输入区：语音圆按钮 + 灰底圆角输入框 + 表情 + 绿色发送按钮
- 底部 Home Indicator

### 设计规范来源
| 元素 | 来源 |
|---|---|
| `#4CAF50` 主绿、`#E8F5E9` / `#C8E6C9` 浅绿 | `tailwind.config.js` brand 色系 |
| 用户气泡右对齐 + `rounded-br-md` | `src/components/ChatBubble.tsx` |
| 学姐头像（齐刘海 + 圆眼镜 + 金币 ¥） | `src/components/Avatars.tsx` |
| 顶部栏布局与文案 | `src/pages/ChatPage.tsx` |
| 输入框 placeholder 文案 | `src/pages/ChatPage.tsx` |

### 使用方式
- 直接在浏览器或 Figma / Sketch 打开 SVG 即可预览。
- 项目运行时可通过 `/mockups/chat-mockup.svg` 访问（Vite 会自动暴露 `public/` 目录）。
- SVG 包含 SMIL 动画（学姐"打字中…"三点跳动）。
