/**
 * 理财知识库 - 至少 20 条常见问答对
 * 风格：口语化、生活化比喻、不推销具体产品
 */

export interface KnowledgeEntry {
  id: string;
  category: 'concept' | 'product' | 'risk' | 'practice';
  keywords: string[];
  question: string;
  answer: string;
  related?: string[];
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ========= 基础概念类 =========
  {
    id: 'k001',
    category: 'concept',
    keywords: ['基金', '什么是基金'],
    question: '什么是基金？',
    answer:
      '简单说，基金就像「凑份子」～大家把钱交给基金经理，由他帮咱们去买一篮子股票或债券🧺\n好处是分散风险，不用自己研究；坏处是要付一点点管理费。\n新手可以先了解「货币基金」和「指数基金」，门槛低一些哦~',
    related: ['货币基金', '指数基金', '定投'],
  },
  {
    id: 'k002',
    category: 'concept',
    keywords: ['复利', '复利是什么'],
    question: '复利是什么？',
    answer:
      '复利就是「利滚利」💰 比如本金100元，每年5%收益：第一年105，第二年是105×5%再加上去，时间越长雪球越大～\n爱因斯坦说复利是世界第八大奇迹哦，但前提是「时间够长」和「不要中断」✨',
    related: ['定投', '储蓄'],
  },
  {
    id: 'k003',
    category: 'concept',
    keywords: ['余额宝', '货币基金'],
    question: '余额宝安全吗？',
    answer:
      '好问题～\n📌 余额宝本质是货币基金，不是银行存款\n📌 历史上从未亏损过，但理论上有极小概率亏损\n📌 不受存款保险保护（银行存款50万以内100%赔付）\n\n学姐建议：日常周转放微信零钱通/银行卡，短期闲钱可以放余额宝，但别把应急钱全放里面哦💡',
    related: ['货币基金', '存款', '应急金'],
  },
  {
    id: 'k004',
    category: 'concept',
    keywords: ['存款', '定期', '活期'],
    question: '定期和活期存款的区别？',
    answer:
      '活期就是随时可取，利息超低（约 0.2%）；\n定期是约定期限（比如3个月、1年），中途取出会按活期算，但利息高一些（1.5%-2%）。\n💡学姐心得：刚开始攒钱可以用活期，养成习惯后再转定期，强制自己别动它😎',
    related: ['储蓄', '应急金'],
  },
  {
    id: 'k005',
    category: 'product',
    keywords: ['指数基金', '宽基'],
    question: '指数基金是什么？',
    answer:
      '指数基金就是「跟着大盘走」的基金📈 比如沪深300指数基金，就是把这300家最大公司的股票都买一点。\n优点：费率低、不用选股；缺点：跟着大盘涨跌，短期波动大。\n适合长期定投，但学姐不能告诉你具体买哪只哦~需要自己学习+判断！',
    related: ['基金', '定投'],
  },
  {
    id: 'k006',
    category: 'practice',
    keywords: ['定投', '基金定投'],
    question: '什么是基金定投？',
    answer:
      '定投 = 定期定额投资～比如每月固定 200 元买同一只基金，不管涨跌都买。\n好处：摊平成本、强制储蓄、不用择时；适合波动大的指数基金。\n⚠️不过要明白：定投不等于稳赚！只是降低了短期波动的影响哦~',
    related: ['指数基金', '复利'],
  },
  {
    id: 'k007',
    category: 'practice',
    keywords: ['52周攒钱法', '攒钱法'],
    question: '52周攒钱法是什么？',
    answer:
      '一种很适合学生党的攒钱小游戏🎮：\n第1周存10元，第2周存20元，第3周存30元...每周递增10元。\n一年下来能攒：10+20+...+520 = 13780元！\n如果觉得后期压力大，可以改成每周递增5元的「温柔版」哦~',
    related: ['储蓄', '强制储蓄'],
  },
  {
    id: 'k008',
    category: 'practice',
    keywords: ['强制储蓄', '攒钱技巧'],
    question: '怎么强制自己存钱？',
    answer:
      '学姐的亲测三招👇\n1️⃣ 先存后花：发钱第一天先转一笔到「不轻易动」的账户\n2️⃣ 设定小目标：3000元的旅游基金比"我要存钱"更有动力\n3️⃣ 可视化进度：每次打卡看到进度条涨一点，超有成就感📊',
    related: ['52周攒钱法', '储蓄目标'],
  },
  {
    id: 'k009',
    category: 'practice',
    keywords: ['应急金', '应急基金', '应急储蓄'],
    question: '什么是应急金？需要存多少？',
    answer:
      '应急金 = 用来应对突发情况的钱🆘（比如生病、手机摔了、突然要回家）\n学生党建议先攒 1000-2000 元；工作后建议存够 3-6 个月的开销。\n关键是：放在能马上取出来的地方（不要锁定！），且不要拿来投资哦~',
    related: ['活期', '储蓄'],
  },
  {
    id: 'k010',
    category: 'practice',
    keywords: ['记账', '怎么记账'],
    question: '怎么开始记账？',
    answer:
      '学姐的记账三部曲：\n1️⃣ 先「记下来」：每天花 1 分钟记录所有支出，别想太多\n2️⃣ 再「分分类」：周末花 5 分钟看看钱都去哪儿了\n3️⃣ 最后「找漏点」：连续记一个月，会发现自己也吓一跳的小开销😂\n\n咱们的对话框就是最方便的记账工具呀～发"奶茶15"就行！',
    related: ['消费分析', '预算'],
  },

  // ========= 风险警示类 =========
  {
    id: 'k011',
    category: 'risk',
    keywords: ['校园贷', '网贷', '借贷'],
    question: '校园贷有多坑？',
    answer:
      '⚠️学姐严肃提醒：校园贷的坑深到吓人！\n• 名义利率看着不高，实际加上手续费、违约金可能超 100%\n• 还不上会爆通讯录、影响征信\n• 国家已明令禁止向在校生发放消费贷\n\n💡如果真的急用钱，先找家人沟通，绝对不要碰任何"无抵押""秒到账""学生专享贷"！',
    related: ['征信', '借钱'],
  },
  {
    id: 'k012',
    category: 'risk',
    keywords: ['高收益', '稳赚', '保本'],
    question: '年化20%的理财靠谱吗？',
    answer:
      '⚠️一句话答案：不靠谱！\n国家明确规定：理财产品不允许承诺保本保收益。\n年化超过 6% 就要打问号，超过 8% 准备好亏一部分本金，超过 10% 大概率是骗局🚨\n记住：你看中人家利息，人家盯着你的本金。',
    related: ['投资骗局', '风险'],
  },
  {
    id: 'k013',
    category: 'risk',
    keywords: ['大V', '荐股', '跟单'],
    question: '能跟着大V买股票吗？',
    answer:
      '⚠️学姐要认真劝你了：\n1. 很多大V是"先买入再喊单"，你买了他卖（俗称割韭菜🌱）\n2. 股市波动大，新手很容易在高点接盘\n3. 用生活费炒股，亏了影响正常吃饭\n\n如果想学投资，从了解基金定投开始；千万千万不要借钱投资！',
    related: ['股票', '基金定投'],
  },
  {
    id: 'k014',
    category: 'risk',
    keywords: ['炒币', '虚拟币', '比特币'],
    question: '可以炒虚拟币吗？',
    answer:
      '⚠️国内不建议碰：\n1. 国内已禁止虚拟货币交易，平台风险极高\n2. 价格波动一天涨跌 50% 都正常\n3. 黑客盗币、平台跑路屡见不鲜\n\n学姐知道你看到过"一夜暴富"的故事，但身边亏掉一年生活费的更多～千万谨慎！',
    related: ['高风险', '投资骗局'],
  },
  {
    id: 'k015',
    category: 'risk',
    keywords: ['杠杆', '配资'],
    question: '杠杆是什么？危险吗？',
    answer:
      '杠杆 = 用借来的钱投资。比如你有 1 万，借 4 万一起炒，5倍杠杆。\n💥 涨 20% 你赚 100%，跌 20% 你血本无归。\n对学生党来说杠杆 = 自杀式操作，借的钱还不上会引发更大问题⚠️\n请远离一切宣传"加杠杆""配资"的平台！',
    related: ['风险', '炒股'],
  },

  // ========= 概念补充 =========
  {
    id: 'k016',
    category: 'concept',
    keywords: ['通货膨胀', '通胀'],
    question: '通货膨胀是什么？',
    answer:
      '简单说就是「钱越来越不值钱」💸\n10 年前 5 元能买一碗面，现在要 15 元——这就是通胀。\n所以光把钱存银行（利率 1-2%），可能跑不过通胀（每年 2-3%）。\n这也是为啥很多人会研究投资，不过对学生党来说，先学会记账+攒钱才是第一步~',
    related: ['储蓄', '投资'],
  },
  {
    id: 'k017',
    category: 'concept',
    keywords: ['信用卡', '征信'],
    question: '学生要办信用卡吗？',
    answer:
      '学姐的建议：除非你能 100% 自律按时还款，否则先别办！\n好处：建立征信、应急可用；\n坑：很容易超支、最低还款利率超高（年化 18%+）、逾期会上征信影响以后买房贷款。\n如果真要办，选额度 3000-5000 的，并设置自动全额还款😎',
    related: ['征信', '校园贷'],
  },
  {
    id: 'k018',
    category: 'practice',
    keywords: ['预算', '月预算', '消费预算'],
    question: '怎么做月度预算？',
    answer:
      '学姐推荐「50/30/20 学生版」：\n• 50% 必要支出（吃饭、交通、学习）\n• 30% 想要支出（聚餐、娱乐、购物）\n• 20% 储蓄目标\n\n比如月生活费 2000，那储蓄目标至少 400 元/月。\n刚开始做不到没关系，先 10% 起步也很棒~💪',
    related: ['记账', '攒钱'],
  },
  {
    id: 'k019',
    category: 'practice',
    keywords: ['冲动消费', '剁手'],
    question: '怎么控制冲动消费？',
    answer:
      '学姐亲测有效的「24 小时冷静法」🛒\n看到想买的：先加购物车，关掉 App。\n24 小时后再问自己：还想要吗？真的需要吗？\n你会发现 70% 的东西过一天就不香了～\n另外：直播间、半夜刷淘宝是冲动消费高发区，可以试试「设定每周购物日」哦！',
    related: ['消费', '预算'],
  },
  {
    id: 'k020',
    category: 'concept',
    keywords: ['零钱通', '余额宝', '微信理财'],
    question: '零钱通和余额宝有啥区别？',
    answer:
      '本质都是「货币基金」家族的，区别在背后对接的基金公司不同：\n• 零钱通：腾讯系，对接 5-6 只货币基金\n• 余额宝：阿里系，最大的货币基金之一\n收益率差不多（年化 1.5%-2%），都适合放短期周转资金。\n选哪个看你常用微信还是支付宝就好啦~💡',
    related: ['货币基金', '应急金'],
  },
  {
    id: 'k021',
    category: 'practice',
    keywords: ['副业', '兼职'],
    question: '学生党适合做什么副业？',
    answer:
      '学姐踩过坑后的建议👇\n✅ 推荐：家教、校园代理、设计接单、内容创作（公众号/小红书）\n❌ 谨慎：刷单（90%是诈骗）、打字员（同上）、不需要任何技能就月入过万的（必坑）\n\n核心原则：任何要你先交钱/押金的副业，99% 是骗局🚫',
    related: ['收入', '骗局'],
  },
  {
    id: 'k022',
    category: 'risk',
    keywords: ['刷单', '诈骗', '兼职骗局'],
    question: '刷单兼职是真的吗？',
    answer:
      '⚠️再说一遍：刷单 100% 是诈骗！\n套路是先让你做几单小的返现，让你尝到甜头；然后让你做大单，以"卡单""任务未完成"为由拒绝返还。\n国家公安部已明确：刷单本身违法，受骗后维权也很难。\n看到"日入500""动动手指赚钱"的，直接关掉🙅‍♀️',
    related: ['副业', '骗局'],
  },
];

/**
 * 知识库检索（关键词匹配 + 简单评分）
 */
export function searchKnowledge(query: string, topK = 1): KnowledgeEntry[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_BASE.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.length * 2;
    }
    if (entry.question.toLowerCase().includes(q)) score += 5;
    // 题干词命中
    for (const word of entry.question) {
      if (q.includes(word) && word.length === 1) score += 0.1;
    }
    return { entry, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry);
}

export function getLearningPath(level: 'beginner' | 'intermediate' | 'advanced') {
  const paths: Record<string, Array<{ topic: string; description: string; estimatedTime: string }>> =
    {
      beginner: [
        { topic: '从记账开始', description: '坚持记账 2 周，发现钱去哪儿了', estimatedTime: '2 周' },
        { topic: '设立小目标', description: '攒第一个 1000 元应急金', estimatedTime: '1-2 月' },
        { topic: '了解基础概念', description: '货币基金、定期存款是啥', estimatedTime: '1 周' },
      ],
      intermediate: [
        { topic: '掌握 52 周攒钱法', description: '挑战一年攒 1.3 万', estimatedTime: '1 年' },
        { topic: '了解指数基金', description: '什么是基金定投', estimatedTime: '1 周' },
        { topic: '建立月预算', description: '执行 50/30/20 法则', estimatedTime: '持续' },
      ],
      advanced: [
        { topic: '资产配置', description: '了解不同资产的风险收益', estimatedTime: '1 月' },
        { topic: '风险管理', description: '保险、税务规划', estimatedTime: '持续' },
      ],
    };
  return paths[level] || paths.beginner;
}
