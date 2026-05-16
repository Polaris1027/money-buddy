import { describe, it, expect } from 'vitest';
import { extractAmount, inferCategory, parseIntent, detectRisk } from '../src/services/nluService';

describe('extractAmount', () => {
  it('纯数字+元/块', () => {
    expect(extractAmount('午饭花了18块')).toBe(18);
    expect(extractAmount('打车20元')).toBe(20);
    expect(extractAmount('15.5元')).toBe(15.5);
  });
  it('"15块5" 等小数变体', () => {
    expect(extractAmount('15块5')).toBe(15.5);
  });
  it('货币符号', () => {
    expect(extractAmount('¥18')).toBe(18);
    expect(extractAmount('￥99.9')).toBe(99.9);
  });
  it('"花了X" 模式', () => {
    expect(extractAmount('花了50')).toBe(50);
  });
  it('无金额', () => {
    expect(extractAmount('吃饭')).toBe(-1);
  });
});

describe('inferCategory', () => {
  it('餐饮关键词', () => {
    expect(inferCategory('午饭')).toBe('food');
    expect(inferCategory('奶茶12')).toBe('food');
  });
  it('交通', () => {
    expect(inferCategory('打车去学校20元')).toBe('transport');
  });
  it('学习', () => {
    expect(inferCategory('买了本Python书')).toBe('study');
  });
  it('未匹配 → other', () => {
    expect(inferCategory('随便')).toBe('other');
  });
});

describe('parseIntent', () => {
  it('记账意图', () => {
    expect(parseIntent('午饭15').intent).toBe('add_transaction');
    expect(parseIntent('奶茶12').intent).toBe('add_transaction');
  });
  it('查询意图', () => {
    expect(parseIntent('这周花了多少').intent).toBe('query_transaction');
  });
  it('问候意图', () => {
    expect(parseIntent('你好').intent).toBe('greeting');
  });
  it('创建目标', () => {
    expect(parseIntent('我想攒3000块').intent).toBe('create_goal');
  });
  it('打卡', () => {
    expect(parseIntent('今天存了50').intent).toBe('checkin');
  });
  it('知识问答', () => {
    expect(parseIntent('什么是基金').intent).toBe('knowledge_qa');
  });
});

describe('detectRisk', () => {
  it('校园贷高风险', () => {
    const r = detectRisk('校园贷靠谱吗');
    expect(r.hasRisk).toBe(true);
    expect(r.level).toBe('high');
  });
  it('保本骗局', () => {
    const r = detectRisk('听说有个保本20%的理财');
    expect(r.hasRisk).toBe(true);
  });
  it('正常文本', () => {
    expect(detectRisk('午饭15').hasRisk).toBe(false);
  });
});
