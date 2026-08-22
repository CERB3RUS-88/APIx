import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Indian Rupee currency with standard Indian numbering (e.g. ₹5,450)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format index points strictly with 2 decimal places (e.g. 104.82)
 */
export function formatIndexValue(val: number): string {
  return val.toFixed(2);
}

/**
 * Format percentage delta with explicit sign (e.g. +1.42%, -0.85%)
 */
export function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}%`;
}

/**
 * Format percentage weight (e.g. 18.5%)
 */
export function formatWeight(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`;
}
