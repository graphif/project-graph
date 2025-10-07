"use client";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

export const FlipWords = ({
  words,
  duration = 3000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  // ═══════════════════════════════════════════════════════════════
  // 状态管理 - 追踪当前显示的词汇索引而非词汇本身
  // ═══════════════════════════════════════════════════════════════
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // ═══════════════════════════════════════════════════════════════
  // words 数组变化时重置状态 - 消除特殊情况的处理
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // 边界安全：确保索引在有效范围内
    if (words.length > 0) {
      setCurrentIndex((prev) => (prev >= words.length ? 0 : prev));
      setIsAnimating(false);
    }
  }, [words]);

  // ═══════════════════════════════════════════════════════════════
  // 动画控制 - 基于索引的循环逻辑，自然处理边界情况
  // ═══════════════════════════════════════════════════════════════
  const startAnimation = useCallback(() => {
    if (words.length === 0) return;

    setCurrentIndex((prev) => (prev + 1) % words.length);
    setIsAnimating(true);
  }, [words.length]);

  // ═══════════════════════════════════════════════════════════════
  // 定时器控制 - 简洁的状态驱动逻辑
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (words.length === 0 || isAnimating) return;

    const timer = setTimeout(startAnimation, duration);
    return () => clearTimeout(timer);
  }, [isAnimating, duration, startAnimation, words.length]);

  // ═══════════════════════════════════════════════════════════════
  // 边界保护 - 空数组时的优雅降级
  // ═══════════════════════════════════════════════════════════════
  if (words.length === 0) {
    return null;
  }

  const currentWord = words[currentIndex];

  return (
    <AnimatePresence
      onExitComplete={() => {
        setIsAnimating(false);
      }}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 10,
        }}
        exit={{
          opacity: 0,
          y: -40,
          x: 40,
          filter: "blur(8px)",
          scale: 2,
          position: "absolute",
        }}
        className={cn("text-foreground/90 relative z-10 inline-block px-2 text-left", className)}
        key={currentWord}
      >
        {/* ═══════════════════════════════════════════════════════════════
            分词渲染 - 逐词逐字母的动画效果
            ═══════════════════════════════════════════════════════════════ */}
        {currentWord.split(" ").map((word, wordIndex) => (
          <motion.span
            key={word + wordIndex}
            initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              delay: wordIndex * 0.3,
              duration: 0.3,
            }}
            className="inline-block whitespace-nowrap"
          >
            {word.split("").map((letter, letterIndex) => (
              <motion.span
                key={word + letterIndex}
                initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: wordIndex * 0.3 + letterIndex * 0.05,
                  duration: 0.2,
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
            <span className="inline-block">&nbsp;</span>
          </motion.span>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
