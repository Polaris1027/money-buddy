import { describe, it, expect } from 'vitest';
import { parseIntent } from '../src/services/nluService';

describe('修改预算意图（规则模式）', () => {
  it('"错 我需要将预算改为5000" → update_budget', () => {
    const r = parseIntent('错 我需要将预算改为5000');
    expect(r.intent).toBe('update_budget');
    expect(r.entities.newBudget).toBe(5000);
  });

  it('"把预算改成3000" → update_budget', () => {
    const r = parseIntent('把预算改成3000');
    expect(r.intent).toBe('update_budget');
    expect(r.entities.newBudget).toBe(3000);
  });

  it('"我的月预算是5000" → update_budget', () => {
    const r = parseIntent('我的月预算是5000');
    expect(r.intent).toBe('update_budget');
    expect(r.entities.newBudget).toBe(5000);
  });

  it('"预算调到2500" → update_budget', () => {
    const r = parseIntent('预算调到2500');
    expect(r.intent).toBe('update_budget');
    expect(r.entities.newBudget).toBe(2500);
  });

  it('"预算改成两千五" → 中文金额', () => {
    const r = parseIntent('预算改成两千五');
    expect(r.intent).toBe('update_budget');
    expect(r.entities.newBudget).toBe(2500);
  });

  it('"预算" 单独 → update_budget 但金额缺失', () => {
    const r = parseIntent('我想改预算');
    expect(r.intent).toBe('update_budget');
    expect(r.entities.newBudget).toBeUndefined();
  });

  it('"奶茶15" 不应误判为预算', () => {
    const r = parseIntent('奶茶15');
    expect(r.intent).toBe('add_transaction');
  });
});
