/**
 * 中文数字 → 阿拉伯数字
 * 支持范围：0 ~ 9,999,9999（亿以内）
 * 示例：
 *   两千        → 2000
 *   一千五      → 1500
 *   三千八百    → 3800
 *   一万二      → 12000
 *   十万        → 100000
 *   两万五千   → 25000
 *   一百零五   → 105
 */

const DIGIT: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 贰: 2, 两: 2, 俩: 2,
  三: 3, 叁: 3, 四: 4, 肆: 4, 五: 5, 伍: 5, 六: 6, 陆: 6,
  七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9,
};

const UNIT: Record<string, number> = {
  十: 10, 拾: 10,
  百: 100, 佰: 100,
  千: 1000, 仟: 1000,
  万: 10000, 萬: 10000,
  亿: 100000000, 億: 100000000,
};

const CHINESE_NUM_REGEX = /[零〇一壹二贰两俩三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万萬亿億]+/;

export function isChineseNumeral(s: string): boolean {
  return CHINESE_NUM_REGEX.test(s);
}

/**
 * 解析中文数字字符串。无法解析返回 NaN
 */
export function parseChineseNumber(input: string): number {
  const s = input.trim();
  if (!s) return NaN;
  // 纯阿拉伯数字
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);

  // 处理"亿/万"分段
  // 思路：以"亿"和"万"为分隔，分别计算每段的值
  const parseSection = (str: string): number => {
    if (!str) return 0;
    let total = 0;
    let current = 0;
    let lastUnit = 0; // 用于"一千五"这类省略尾数：尾随单字数字按上一个单位的 1/10
    let sawZero = false; // "零"出现后取消末位省略逻辑（如"一百零五"→105）
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '零' || ch === '〇') {
        sawZero = true;
        continue;
      }
      if (DIGIT[ch] !== undefined) {
        current = DIGIT[ch];
        // 末位省略尾数（如"一千五" = 1500，"五"按百算）；但若中间出现"零"则按个位处理
        if (i === str.length - 1 && lastUnit >= 100 && !sawZero) {
          total += current * (lastUnit / 10);
          current = 0;
        }
      } else if (UNIT[ch] !== undefined) {
        const unit = UNIT[ch];
        if (current === 0) current = 1; // "十二" → 1*10+2
        total += current * unit;
        current = 0;
        lastUnit = unit;
        sawZero = false;
      } else {
        return NaN; // 非法字符
      }
    }
    return total + current;
  };

  // 拆"亿"
  let yiPart = 0;
  let rest = s;
  const yiIdx = Array.from(rest).findIndex((c) => c === '亿' || c === '億');
  if (yiIdx >= 0) {
    yiPart = parseSection(rest.slice(0, yiIdx));
    if (Number.isNaN(yiPart)) return NaN;
    yiPart *= 100000000;
    rest = rest.slice(yiIdx + 1);
  }

  // 拆"万"
  let wanPart = 0;
  const wanIdx = Array.from(rest).findIndex((c) => c === '万' || c === '萬');
  if (wanIdx >= 0) {
    const head = rest.slice(0, wanIdx);
    // "万" 前面可省略 1（如"万元"），但金额场景一般不会
    wanPart = parseSection(head || '一');
    if (Number.isNaN(wanPart)) return NaN;
    wanPart *= 10000;
    rest = rest.slice(wanIdx + 1);

    // 处理"一万二"这类尾随省略：尾随单字数字按千算
    if (rest.length === 1 && DIGIT[rest] !== undefined) {
      wanPart += DIGIT[rest] * 1000;
      rest = '';
    }
  }

  const lowPart = parseSection(rest);
  if (Number.isNaN(lowPart)) return NaN;

  return yiPart + wanPart + lowPart;
}

/**
 * 从文本中提取中文数字片段并解析。
 * 例："想攒两千块" → 2000；"我想攒一千五" → 1500
 */
export function extractChineseNumber(text: string): number {
  const m = text.match(CHINESE_NUM_REGEX);
  if (!m) return NaN;
  return parseChineseNumber(m[0]);
}
