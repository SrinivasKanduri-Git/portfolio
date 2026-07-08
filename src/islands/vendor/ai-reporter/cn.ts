// source: ai_reporter_v1_AG@3f26be2 frontend/lib/utils.ts (verbatim)
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
