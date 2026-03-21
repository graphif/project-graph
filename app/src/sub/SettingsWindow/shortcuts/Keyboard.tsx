import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { db } from "@/db";
import { cn } from "@/utils/cn";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { keyboardLayout } from "./keyboard-layout-data";

interface KeyboardProps {
  onKeyClick: (keyCode: string) => void;
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
  activeSequence?: string[]; // 新增：接收当前录入的序列
  externalHoveredId?: number | null; // 新增：外部悬停的快捷键 ID
}

// 辅助函数：根据序列生成颜色
const getSequenceColor = (index: number) => {
  const colors = [
    "hsl(var(--primary))",
    "#ef4444", // red-500
    "#f97316", // orange-500
    "#f59e0b", // amber-500
    "#eab308", // yellow-500
    "#84cc16", // lime-500
    "#22c55e", // green-500
    "#10b981", // emerald-500
    "#14b8a6", // teal-500
    "#06b6d4", // cyan-500
    "#0ea5e9", // sky-500
    "#3b82f6", // blue-500
    "#6366f1", // indigo-500
    "#8b5cf6", // violet-500
    "#a855f7", // purple-500
    "#d946ef", // fuchsia-500
    "#ec4899", // pink-500
    "#f43f5e", // rose-500
  ];
  return colors[index % colors.length];
};

export function Keyboard({ onKeyClick, modifiers, activeSequence = [], externalHoveredId = null }: KeyboardProps) {
  const shortcuts = useLiveQuery(() => db.shortcuts.toArray()) || [];
  const [hoveredKeyCode, setHoveredKeyCode] = useState<string | null>(null);

  // 计算一个序列中所有基础按键的坐标
  const getPointsForSequence = (sequence: string[]) => {
    const points: { x: number; y: number; step: number }[] = [];
    let step = 1;
    sequence.forEach((key) => {
      if (key.startsWith("+")) return;
      const layoutInfo = keyboardLayout.find((k) => k.code === key);
      if (layoutInfo) {
        const keySize = 3;
        const gap = 0.25;
        const x = layoutInfo.col * (keySize + gap) + ((layoutInfo.width || 1) * keySize) / 2;
        const y = layoutInfo.row * (keySize + gap) + keySize / 2;
        points.push({ x, y, step: step++ });
      }
    });
    return points;
  };

  const activePoints = getPointsForSequence(activeSequence);

  // 过滤出符合当前修饰键条件的现有快捷键序列
  const filteredShortcuts = shortcuts.filter((s) => {
    const hasCtrl = s.key.includes("+c");
    const hasShift = s.key.includes("+s");
    const hasAlt = s.key.includes("+a");
    const hasMeta = s.key.includes("+m");
    return (
      hasCtrl === modifiers.ctrl &&
      hasShift === modifiers.shift &&
      hasAlt === modifiers.alt &&
      hasMeta === modifiers.meta
    );
  });

  const getShortcutsForKey = (code: string) => {
    return shortcuts.filter((s) => {
      // 检查当前选定的修饰键是否是该快捷键 key 数组的第一部分或全部
      // 注意：这里由于快捷键可能是序列，我们简单地处理成只要序列的最后一项匹配当前选定的修饰+基础键即可
      // 这样用户在勾选了修饰键时，能看到所有以该组合结尾的快捷键。

      const lastKeyInSequence = s.key.slice(-1)[0];

      // 检查基础键是否匹配
      if (lastKeyInSequence !== code) return false;

      // 检查修饰键
      const hasCtrl = s.key.includes("+c");
      const hasShift = s.key.includes("+s");
      const hasAlt = s.key.includes("+a");
      const hasMeta = s.key.includes("+m");

      return (
        hasCtrl === modifiers.ctrl &&
        hasShift === modifiers.shift &&
        hasAlt === modifiers.alt &&
        hasMeta === modifiers.meta
      );
    });
  };

  return (
    <div className="bg-muted/30 border-border relative w-full overflow-auto rounded-2xl border p-8 shadow-inner">
      <div
        className="relative mx-auto"
        style={{
          width: "calc(16 * 3rem + 15 * 0.25rem)",
          height: "calc(5 * 3rem + 4 * 0.25rem)",
          fontSize: "1rem",
        }}
      >
        {/* 序列路径渲染层 */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 渲染现有已保存的序列 */}
          {filteredShortcuts.map((s, shortcutIdx) => {
            const points = getPointsForSequence(s.key);
            if (points.length < 2) return null;
            const color = getSequenceColor(shortcutIdx + 1);
            const isRelated =
              (!hoveredKeyCode && !externalHoveredId) ||
              (hoveredKeyCode && s.key.includes(hoveredKeyCode)) ||
              externalHoveredId === s.id;

            return (
              <g
                key={`saved-${shortcutIdx}`}
                style={{
                  opacity: isRelated ? 1 : 0.05,
                  transition: "opacity 0.2s ease-in-out",
                }}
              >
                <defs>
                  <marker
                    id={`arrowhead-${shortcutIdx}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                  >
                    <path
                      d="M1.5,1.5 L6.5,4 L1.5,6.5 L3,4 Z"
                      fill={color}
                      stroke={color}
                      strokeWidth="0.5"
                      strokeLinejoin="round"
                    />
                  </marker>
                </defs>
                {points.map((point, i) => {
                  if (i === 0) return null;
                  const prev = points[i - 1];
                  return (
                    <line
                      key={`line-${i}`}
                      x1={`${prev.x}rem`}
                      y1={`${prev.y}rem`}
                      x2={`${point.x}rem`}
                      y2={`${point.y}rem`}
                      stroke={color}
                      strokeWidth="3.5"
                      strokeOpacity="0.8"
                      strokeDasharray="6,3"
                      filter="url(#glow)"
                      markerEnd={`url(#arrowhead-${shortcutIdx})`}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* 渲染当前正在录入的序列（更高优先级和更粗的线） */}
          {activePoints.length > 1 && (
            <g className="animate-pulse">
              <defs>
                <marker id="active-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path
                    d="M1.5,1.5 L6.5,4 L1.5,6.5 L3,4 Z"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                  />
                </marker>
              </defs>
              {activePoints.map((point, i) => {
                if (i === 0) return null;
                const prev = activePoints[i - 1];
                return (
                  <line
                    key={`active-path-${i}`}
                    x1={`${prev.x}rem`}
                    y1={`${prev.y}rem`}
                    x2={`${point.x}rem`}
                    y2={`${point.y}rem`}
                    className="stroke-primary stroke-[5px]"
                    style={{ strokeDasharray: "10,5" }}
                    markerEnd="url(#active-arrowhead)"
                    filter="url(#active-glow)"
                  />
                );
              })}
            </g>
          )}

          {/* 渲染步骤圆圈图层（最上层） */}
          {[
            // 现有序列的小圆点（仅当序列大于1时显示）
            ...filteredShortcuts.flatMap((s, sIdx) => {
              const pts = getPointsForSequence(s.key);
              if (pts.length < 2) return [];
              const isRelated = !hoveredKeyCode || s.key.includes(hoveredKeyCode);
              return pts.map((p) => ({
                ...p,
                color: getSequenceColor(sIdx + 1),
                type: "saved",
                id: sIdx,
                showStep: false,
                isRelated,
              }));
            }),
            // 当前序列的大圆点（仅当序列大于1时显示数字）
            ...activePoints.map((p) => ({
              ...p,
              color: "hsl(var(--primary))",
              type: "active",
              id: -1,
              showStep: activePoints.length > 1,
              isRelated: true,
            })),
          ].map((point, i) => (
            <g
              key={`circle-${i}`}
              style={{
                opacity: point.isRelated ? (point.type === "active" ? 1 : 0.6) : 0.1,
                transition: "opacity 0.2s ease-in-out",
              }}
            >
              <circle
                cx={`${point.x}rem`}
                cy={`${point.y}rem`}
                r={point.type === "active" ? (point.showStep ? "0.6rem" : "0.3rem") : "0.3rem"}
                fill={point.color}
                className="stroke-background stroke-2 shadow-sm"
              />
              {point.type === "active" && point.showStep && (
                <text
                  x={`${point.x}rem`}
                  y={`${point.y}rem`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-primary-foreground text-[10px] font-bold"
                >
                  {point.step}
                </text>
              )}
            </g>
          ))}
        </svg>

        {keyboardLayout.map((key) => {
          const keyShortcuts = getShortcutsForKey(key.code);
          const hasShortcuts = keyShortcuts.length > 0;

          // 处理物理键盘状态高亮
          const isModifier = ["Control", "Shift", "Alt", "Meta"].some((m) => key.code.includes(m));
          const isPressed =
            isModifier &&
            ((key.code.includes("Control") && modifiers.ctrl) ||
              (key.code.includes("Shift") && modifiers.shift) ||
              (key.code.includes("Alt") && modifiers.alt) ||
              (key.code.includes("Meta") && modifiers.meta));

          // 悬停交互：计算当前按键是否应该变慢
          // 如果当前有悬停键，且该按键既不是悬停键本身，也不在任何包含悬停键的序列中，则变淡
          const isTargetOfHover =
            hoveredKeyCode &&
            shortcuts.some((s) => {
              // 统一映射逻辑：将物理键名映射到序列标记名
              const normalize = (code: string) => {
                if (code.includes("Control")) return "+c";
                if (code.includes("Shift")) return "+s";
                if (code.includes("Alt")) return "+a";
                if (code.includes("Meta")) return "+m";
                return code;
              };

              const targetTag = normalize(hoveredKeyCode);
              const selfTag = normalize(key.code);

              return s.key.includes(targetTag) && s.key.includes(selfTag);
            });

          // 计算关联性：当前的键是否与“被外部悬停的快捷键”有关
          const isRelatedToExternal =
            externalHoveredId &&
            shortcuts.some((s) => {
              if (s.id !== externalHoveredId) return false;
              const normalize = (code: string) => {
                if (code.includes("Control")) return "+c";
                if (code.includes("Shift")) return "+s";
                if (code.includes("Alt")) return "+a";
                if (code.includes("Meta")) return "+m";
                return code;
              };
              return s.key.includes(normalize(key.code));
            });

          const isButtonDimmed =
            (hoveredKeyCode || externalHoveredId) &&
            key.code !== hoveredKeyCode &&
            !isTargetOfHover &&
            !isRelatedToExternal;

          return (
            <TooltipProvider key={key.code}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isPressed ? "default" : hasShortcuts ? "default" : "outline"}
                    className={cn(
                      "absolute flex flex-col items-start justify-start border-b-4 p-2 shadow-sm transition-all hover:shadow-md active:scale-95 active:border-b-0",
                      isPressed ? "bg-primary text-primary-foreground border-primary-foreground/20 brightness-110" : "",
                      isButtonDimmed ? "scale-[0.98] opacity-[0.05] grayscale" : "opacity-100",
                    )}
                    style={{
                      left: `calc(${key.col} * (3rem + 0.25rem))`,
                      top: `calc(${key.row} * (3rem + 0.25rem))`,
                      width: `calc(${key.width || 1} * 3rem + ${(key.width || 1) - 1} * 0.25rem)`,
                      height: "3rem",
                    }}
                    onClick={() => onKeyClick(key.code)}
                    onMouseEnter={() => setHoveredKeyCode(key.code)}
                    onMouseLeave={() => setHoveredKeyCode(null)}
                  >
                    <span className="text-[10px] font-bold tracking-tighter sm:text-xs">{key.label}</span>
                    {hasShortcuts && (
                      <Badge
                        variant="secondary"
                        className="border-primary/20 absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0 text-[10px] shadow-sm"
                      >
                        {keyShortcuts.length}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                {hasShortcuts && (
                  <TooltipContent>
                    <div className="space-y-1">
                      {keyShortcuts.map((s, i) => (
                        <div key={i} className="text-xs">
                          {s.commands.map(([cmd]) => cmd).join(", ")}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
