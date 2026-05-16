import { describe, it, expect } from 'vitest';
import { inferCategory } from '../src/services/nluService';

describe('新分类关键词归类', () => {
  it('蔬菜', () => {
    expect(inferCategory('买了点青菜')).toBe('vegetable');
    expect(inferCategory('土豆和番茄')).toBe('vegetable');
  });
  it('水果', () => {
    expect(inferCategory('苹果')).toBe('fruit');
    expect(inferCategory('买了一斤葡萄')).toBe('fruit');
  });
  it('零食', () => {
    expect(inferCategory('薯片')).toBe('snack');
    expect(inferCategory('巧克力')).toBe('snack');
  });
  it('运动', () => {
    expect(inferCategory('健身房月卡')).toBe('sport');
    expect(inferCategory('打羽毛球')).toBe('sport');
  });
  it('通讯', () => {
    expect(inferCategory('交话费')).toBe('communication');
    expect(inferCategory('宽带续费')).toBe('communication');
  });
  it('住房', () => {
    expect(inferCategory('房租')).toBe('housing');
    expect(inferCategory('交水费')).toBe('housing');
  });
  it('旅行', () => {
    expect(inferCategory('机票')).toBe('travel');
    expect(inferCategory('订了酒店')).toBe('travel');
  });
  it('宠物', () => {
    expect(inferCategory('猫粮')).toBe('pet');
  });
  it('礼物', () => {
    expect(inferCategory('买生日礼物')).toBe('gift');
  });
  it('服饰', () => {
    expect(inferCategory('新衣服')).toBe('clothing');
    expect(inferCategory('鞋子')).toBe('clothing');
  });
  it('医疗', () => {
    expect(inferCategory('感冒药')).toBe('medical');
    expect(inferCategory('去医院')).toBe('medical');
  });
  it('优先级：奶茶 → food（而非 snack）', () => {
    // 奶茶/咖啡明确属于餐饮
    expect(inferCategory('奶茶')).toBe('food');
  });
  it('优先级：水果在餐饮之前', () => {
    expect(inferCategory('买了点苹果')).toBe('fruit');
  });
  it('未匹配 → other', () => {
    expect(inferCategory('随便')).toBe('other');
  });
});
