import dayjs from 'dayjs';

export const today = (): string => dayjs().format('YYYY-MM-DD');
export const now = (): number => Date.now();

export const fmtDate = (d: string | number | Date, fmt = 'YYYY-MM-DD'): string =>
  dayjs(d).format(fmt);

export const fmtMonth = (d: string | number | Date): string =>
  dayjs(d).format('YYYY-MM');

export const startOfWeek = (): string => dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'); // 周一
export const endOfWeek = (): string => dayjs().endOf('week').add(1, 'day').format('YYYY-MM-DD');

export const startOfMonth = (): string => dayjs().startOf('month').format('YYYY-MM-DD');
export const endOfMonth = (): string => dayjs().endOf('month').format('YYYY-MM-DD');

export function daysBetween(from: string, to: string): number {
  return dayjs(to).diff(dayjs(from), 'day');
}

export function weeksBetween(from: string, to: string): number {
  return Math.max(1, Math.ceil(dayjs(to).diff(dayjs(from), 'day') / 7));
}

export function isWithin(date: string, from: string, to: string): boolean {
  const d = dayjs(date);
  return (d.isAfter(dayjs(from).subtract(1, 'day')) && d.isBefore(dayjs(to).add(1, 'day')));
}

export function fmtCurrency(amount: number): string {
  return `¥${amount.toFixed(2).replace(/\.00$/, '')}`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  return dayjs(ts).format('MM-DD HH:mm');
}
