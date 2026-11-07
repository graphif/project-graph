import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 将多个 tailwindcss 的 class 名合并为一个字符串
 * @param inputs
 * @returns
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};
