import { describe, it, expect } from 'vitest';
import { parseChineseNumber, extractChineseNumber } from '../src/utils/chineseNumber';
import { extractAmount, parseIntent } from '../src/services/nluService';

describe('parseChineseNumber', () => {
  it('个位数', () => {
    expect(parseChineseNumber('一')).toBe(1);
    expect(parseChineseNumber('两')).toBe(2);
    expect(parseChineseNumber('五')).toBe(5);
  });
  it('十位', () => {
    expect(parseChineseNumber('十')).toBe(10);
    expect(parseChineseNumber('十二')).toBe(12);
    expect(parseChineseNumber('五十')).toBe(50);
    expect(parseChineseNumber('五十八')).toBe(58);
  });
  it('百位', () => {
    expect(parseChineseNumber('一百')).toBe(100);
    expect(parseChineseNumber('一百零五')).toBe(105);
    expect(parseChineseNumber('两百三十')).toBe(230);
  });
  it('千位（含末位省略）', () => {
    expect(parseChineseNumber('两千')).toBe(2000);
    expect(parseChineseNumber('一千五')).toBe(1500); // 末位省略：五 → 五百
    expect(parseChineseNumber('三千八')).toBe(3800);
    expect(parseChineseNumber('三千八百')).toBe(3800);
    expect(parseChineseNumber('三千八百五十')).toBe(3850);
  });
  it('万位', () => {
    expect(parseChineseNumber('一万')).toBe(10000);
    expect(parseChineseNumber('两万')).toBe(20000);
    expect(parseChineseNumber('一万二')).toBe(12000); // 末位省略：二 → 两千
    expect(parseChineseNumber('两万五千')).toBe(25000);
    expect(parseChineseNumber('十万')).toBe(100000);
    expect(parseChineseNumber('五十万')).toBe(500000);
  });
  it('大写', () => {
    expect(parseChineseNumber('壹仟伍佰')).toBe(1500);
    expect(parseChineseNumber('贰万')).toBe(20000);
  });
});

describe('extractChineseNumber 在文本中提取', () => {
  it('从句子里抽数字', () => {
    expect(extractChineseNumber('我想攒两千块')).toBe(2000);
    expect(extractChineseNumber('攒一千五去旅游')).toBe(1500);
    expect(extractChineseNumber('存了五十')).toBe(50);
  });
});

describe('extractAmount 综合', () => {
  it('中文金额', () => {
    expect(extractAmount('我想攒两千')).toBe(2000);
    expect(extractAmount('我想攒两千块')).toBe(2000);
    expect(extractAmount('我想攒两千块去旅游')).toBe(2000);
    expect(extractAmount('攒一千五')).toBe(1500);
    expect(extractAmount('攒三千八百')).toBe(3800);
    expect(extractAmount('要存一万二')).toBe(12000);
    expect(extractAmount('十万')).toBe(100000);
    expect(extractAmount('五十块')).toBe(50);
  });
  it('阿拉伯数字仍然有效', () => {
    expect(extractAmount('午饭15')).toBe(15);
    expect(extractAmount('我想攒3000')).toBe(3000);
    expect(extractAmount('¥18')).toBe(18);
  });
});

describe('parseIntent 识别中文金额场景', () => {
  it('中文创建目标', () => {
    const r = parseIntent('我想攒两千块去旅游');
    expect(r.intent).toBe('create_goal');
    expect(r.entities.amount).toBe(2000);
  });
  it('中文打卡', () => {
    const r = parseIntent('今天存了五十');
    expect(r.intent).toBe('checkin');
    expect(r.entities.amount).toBe(50);
  });
  it('中文记账', () => {
    const r = parseIntent('奶茶十二块');
    expect(r.intent).toBe('add_transaction');
    expect(r.entities.amount).toBe(12);
  });
});
