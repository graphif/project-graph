import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Command, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard } from "./Keyboard";
import { ShortcutEditor } from "./ShortcutEditor";

export default function ShortcutsPage() {
  const [sequence, setSequence] = useState<string[]>([]);
  const [modifiers, setModifiers] = useState({
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingSequence, setEditingSequence] = useState<string[]>([]);
  const [hoveredShortcutId, setHoveredShortcutId] = useState<number | null>(null);

  const shortcuts = useLiveQuery(() => db.shortcuts.toArray()) || [];

  const handleKeyClick = useCallback((keyCode: string, currentModifiers: typeof modifiers) => {
    // 忽略修饰键本身进行序列添加
    const isModifier = [
      "ControlLeft",
      "ControlRight",
      "ShiftLeft",
      "ShiftRight",
      "AltLeft",
      "AltRight",
      "MetaLeft",
      "MetaRight",
      "Control",
      "Shift",
      "Alt",
      "Meta",
    ].includes(keyCode);

    if (isModifier) return;

    const currentStep: string[] = [];
    if (currentModifiers.ctrl) currentStep.push("+c");
    if (currentModifiers.alt) currentStep.push("+a");
    if (currentModifiers.shift) currentStep.push("+s");
    if (currentModifiers.meta) currentStep.push("+m");
    currentStep.push(keyCode);

    setSequence((prev) => [...prev, ...currentStep]);
  }, []);

  // 监听物理键盘按键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;

      const nextModifiers = {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      };

      setModifiers(nextModifiers);

      // 如果不是修饰符键，则记录序列
      if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        e.preventDefault();
        handleKeyClick(e.code, nextModifiers);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isEditing) return;
      setModifiers({
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isEditing, handleKeyClick]);

  const clearSequence = () => setSequence([]);

  const openEditor = (seq: string[]) => {
    setEditingSequence(seq);
    setIsEditing(true);
  };

  const formatKey = (k: string) => {
    if (k === "+c") return "Ctrl";
    if (k === "+s") return "Shift";
    if (k === "+a") return "Alt";
    if (k === "+m") return "Meta";
    return k.replace("Key", "").replace("Digit", "");
  };

  const formattedShortcuts = useMemo(() => {
    return shortcuts.map((s) => {
      const formatCommand = ([cmd, args]: [string, any[]]) => {
        if (!args || args.length === 0) return cmd;
        const argsStr = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(", ");
        return `${cmd}(${argsStr})`;
      };

      return {
        ...s,
        keyLabel: s.key
          .map(formatKey)
          .join(" + ")
          .replace(/ \+ ([^+ ]+)/g, ", $1")
          .replace(/ \+ (\+)/g, " + $1"),
        commandLabel: s.commands.map(formatCommand).join(", "),
        conditionLabel: s.conditions.join(", "),
      };
    });
  }, [shortcuts]);

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-hidden p-6">
      <div className="flex shrink-0 flex-col gap-2">
        <h1 className="text-2xl font-bold">快捷键编辑器</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {/* 上半部分：键盘 UI */}
        <div className="flex shrink-0 flex-col gap-4">
          <div className="bg-muted/50 border-border flex h-[74px] items-center gap-2 rounded-lg border p-4">
            <span className="whitespace-nowrap text-sm font-semibold">当前序列:</span>
            <div className="flex max-h-full flex-wrap items-center gap-1 overflow-auto">
              {sequence.length === 0 ? (
                <span className="text-muted-foreground text-xs italic">等待录入...</span>
              ) : (
                sequence.map((k, i) => (
                  <Badge key={i} variant="secondary" className="px-1 text-[10px]">
                    {formatKey(k)}
                  </Badge>
                ))
              )}
            </div>
            {sequence.length > 0 && (
              <div className="ml-auto flex gap-2">
                <button onClick={clearSequence} className="hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
                <button onClick={() => openEditor(sequence)} className="text-primary text-xs font-bold hover:underline">
                  配置
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center overflow-auto py-2">
            <Keyboard
              modifiers={modifiers}
              onKeyClick={(code) => handleKeyClick(code, modifiers)}
              activeSequence={sequence}
              externalHoveredId={hoveredShortcutId}
            />
          </div>
        </div>

        {/* 下半部分：快捷键列表表格 */}
        <div className="border-border bg-background flex flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
          <div className="border-b p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Command className="h-4 w-4" />
              快捷键列表 ({shortcuts.length})
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[30%]">按键组合</TableHead>
                  <TableHead>绑定命令</TableHead>
                  <TableHead className="w-[150px]">生效条件</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formattedShortcuts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground h-24 text-center text-xs italic">
                      暂无快捷键配置
                    </TableCell>
                  </TableRow>
                ) : (
                  formattedShortcuts.map((shortcut) => (
                    <TableRow
                      key={shortcut.id}
                      className="hover:bg-muted/50 group cursor-pointer transition-colors"
                      onMouseEnter={() => setHoveredShortcutId(shortcut.id ?? null)}
                      onMouseLeave={() => setHoveredShortcutId(null)}
                      onClick={() => openEditor(shortcut.key)}
                    >
                      <TableCell className="font-mono text-xs font-medium">{shortcut.keyLabel}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center justify-between">
                          <span>{shortcut.commandLabel}</span>
                          <span className="text-primary hidden text-[10px] font-bold group-hover:inline">编辑</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{shortcut.conditionLabel}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ShortcutEditor
        fullKeySequence={editingSequence}
        open={isEditing}
        onClose={() => {
          setIsEditing(false);
          setEditingSequence([]);
          // 如果是录入序列后的配置，配置完清空录入状态
          if (JSON.stringify(editingSequence) === JSON.stringify(sequence)) {
            setSequence([]);
          }
        }}
      />
    </div>
  );
}
