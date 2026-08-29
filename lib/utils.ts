import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Indian Rupee currency with standard Indian numbering (e.g. ₹5,450)
 */
export function formatINR(amount?: number | null): string {
  const num = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format index points strictly with 2 decimal places (e.g. 104.82)
 */
export function formatIndexValue(val?: number | null): string {
  const num = typeof val === 'number' && !Number.isNaN(val) ? val : 100.0;
  return num.toFixed(2);
}

/**
 * Format percentage delta with explicit sign (e.g. +1.42%, -0.85%)
 */
export function formatDelta(delta?: number | null): string {
  const num = typeof delta === 'number' && !Number.isNaN(delta) ? delta : 0;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * Format percentage weight (e.g. 18.5%)
 */
export function formatWeight(weight?: number | null): string {
  const num = typeof weight === 'number' && !Number.isNaN(weight) ? weight : 0;
  return `${(num * 100).toFixed(1)}%`;
}
