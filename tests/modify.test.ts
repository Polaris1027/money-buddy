import { describe, it, expect } from 'vitest';
import { parseIntent } from '../src/services/nluService';

describe('修改/撤销意图识别', () => {
  it('"不对 租房是两千五" → modify_transaction', () => {
    const r = parseIntent('不对 租房是两千五');
    expect(r.intent).toBe('modify_transaction');
    expect(r.entities.amount).toBe(2500);
  });

  it('"改成2500" → modify_transaction', () => {
    const r = parseIntent('改成2500');
    expect(r.intent).toBe('modify_transaction');
    expect(r.entities.amount).toBe(2500);
  });

  it('"我说错了，是50" → modify_transaction', () => {
    const r = parseIntent('我说错了，是50');
    expect(r.intent).toBe('modify_transaction');
    expect(r.entities.amount).toBe(50);
  });

  it('"其实是奶茶12块" → modify_transaction', () => {
    const r = parseIntent('其实是奶茶12块');
    expect(r.intent).toBe('modify_transaction');
    expect(r.entities.amount).toBe(12);
    expect(r.entities.category).toBe('food');
  });

  it('"不是 我需要你改正" → modify_transaction（无金额）', () => {
    const r = parseIntent('不是 我需要你改正');
    expect(r.intent).toBe('modify_transaction');
    expect(r.entities.amount).toBeUndefined();
  });

  it('"撤销刚才那条" → undo_transaction', () => {
    const r = parseIntent('撤销刚才那条');
    expect(r.intent).toBe('undo_transaction');
  });

  it('"删掉刚才的" → undo_transaction', () => {
    const r = parseIntent('删掉刚才的');
    expect(r.intent).toBe('undo_transaction');
  });

  it('"取消上一笔" → undo_transaction', () => {
    const r = parseIntent('取消上一笔');
    expect(r.intent).toBe('undo_transaction');
  });

  it('正常记账"奶茶15"不应触发修改', () => {
    const r = parseIntent('奶茶15');
    expect(r.intent).toBe('add_transaction');
  });
});
