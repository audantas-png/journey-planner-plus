import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine className values using `clsx` then merge Tailwind class conflicts with `twMerge`.
 *
 * Usage:
 *   cn('p-2', condition && 'bg-red-500', ['text-sm', 'font-medium'])
 *
 * This helper centralizes class composition across the app.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

export const cx = cn;
