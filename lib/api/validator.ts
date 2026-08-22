import { BookingWindow, IndexFrequency } from '@/types';

export function isValidDateFormat(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function isValidFrequency(freq: string): freq is IndexFrequency {
  return ['daily', 'weekly', 'monthly'].includes(freq.toLowerCase());
}

export function normalizeBookingWindow(win: string): string {
  return win.trim().replace(/\s+/g, '+').toUpperCase();
}

export function isValidBookingWindow(win: string): win is BookingWindow {
  const normalized = normalizeBookingWindow(win);
  return ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].includes(normalized);
}
