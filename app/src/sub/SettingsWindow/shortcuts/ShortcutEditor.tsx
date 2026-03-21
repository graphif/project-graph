import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShortcutAction, ShortcutCondition } from "@/core/service/controlService/shortcutKeysEngine/Shortcuts";
import { db } from "@/db";
import { cn } from "@/utils/cn";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ShortcutEditorProps {
  fullKeySequence: string[];
  open: boolean;
  onClose: () => void;
}

export function ShortcutEditor({ fullKeySequence, open, onClose }: ShortcutEditorProps) {
  const [commands, setCommands] = useState<[string, any[]][]>([]);
  const [conditions, setConditions] = useState<ShortcutCondition[]>([]);
  const [isNew, setIsNew] = useState(false);

  const shortcut = useLiveQuery(async () => {
    if (fullKeySequence.length === 0) return null;
    const all = await db.shortcuts.toArray();
    // 检查序列是否完全一致
    return all.find((s) => JSON.stringify(s.key) === JSON.stringify(fullKeySequence));
  }, [fullKeySequence]);

  useEffect(() => {
    if (shortcut) {
      setCommands([...shortcut.commands]);
      setConditions([...(shortcut.conditions || [])]);
      setIsNew(false);
    } else {
      setCommands([["", []]]);
      setConditions([ShortcutCondition.ActiveProject]);
      setIsNew(true);
    }
  }, [shortcut]);

  const handleSave = async () => {
    if (fullKeySequence.length === 0) return;

    // 过滤掉空的命令
    const filteredCommands = commands.filter(([cmd]) => cmd.trim() !== "");

    if (filteredCommands.length === 0) {
      if (!isNew && shortcut?.id) {
        await db.shortcuts.delete(shortcut.id);
      }
      onClose();
      return;
    }

    const data = {
      key: fullKeySequence,
      action: ShortcutAction.RunCommands,
      commands: filteredCommands,
      conditions: conditions,
    };

    if (isNew) {
      await db.shortcuts.add(data);
    } else if (shortcut?.id) {
      await db.shortcuts.update(shortcut.id, data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (shortcut?.id) {
      await db.shortcuts.delete(shortcut.id);
    }
    onClose();
  };

  const addCommand = () => {
    setCommands([...commands, ["", []]]);
  };

  const removeCommand = (index: number) => {
    const next = [...commands];
    next.splice(index, 1);
    setCommands(next);
  };

  const updateCommand = (index: number, name: string) => {
    const next = [...commands];
    next[index] = [name, next[index][1]];
    setCommands(next);
  };

  const addArg = (index: number) => {
    const next = [...commands];
    next[index] = [next[index][0], [...next[index][1], ""]];
    setCommands(next);
  };

  const removeArg = (cmdIndex: number, argIndex: number) => {
    const next = [...commands];
    const newArgs = [...next[cmdIndex][1]];
    newArgs.splice(argIndex, 1);
    next[cmdIndex] = [next[cmdIndex][0], newArgs];
    setCommands(next);
  };

  const updateArgValue = (cmdIndex: number, argIndex: number, value: any) => {
    const next = [...commands];
    const newArgs = [...next[cmdIndex][1]];
    newArgs[argIndex] = value;
    next[cmdIndex] = [next[cmdIndex][0], newArgs];
    setCommands(next);
  };

  const toggleArgType = (cmdIndex: number, argIndex: number) => {
    const next = [...commands];
    const newArgs = [...next[cmdIndex][1]];
    const current = newArgs[argIndex];

    if (typeof current === "string") {
      newArgs[argIndex] = 0;
    } else if (typeof current === "number") {
      newArgs[argIndex] = true;
    } else {
      newArgs[argIndex] = "";
    }

    next[cmdIndex] = [next[cmdIndex][0], newArgs];
    setCommands(next);
  };

  const toggleCondition = (condition: ShortcutCondition) => {
    setConditions((prev) => (prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]));
  };

  // 简单的格式化: 把序列中的普通按键前加逗号（除非它是序列开头的或者是修饰符）
  const formattedKeyDisplay = fullKeySequence.reduce((acc, curr, i) => {
    const isMod = curr.startsWith("+");
    const label =
      curr === "+c"
        ? "Ctrl"
        : curr === "+s"
          ? "Shift"
          : curr === "+a"
            ? "Alt"
            : curr === "+m"
              ? "Meta"
              : curr.replace("Key", "").replace("Digit", "");
    if (i === 0) return label;
    if (isMod) return acc + " + " + label;
    // 如果前一个也是普通键，或者是修饰符但在同一个组合中（其实目前 handleKeyClick 每次点普通键都是加到序列末尾）
    // 根据 Shortcuts.tsx 的逻辑，序列是扁平的。
    return acc + ", " + label;
  }, "");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑快捷键: {formattedKeyDisplay}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-4 pr-1">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-muted-foreground text-[10px] uppercase tracking-widest">生效条件</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(ShortcutCondition).map((cond) => {
                  const isActive = conditions.includes(cond);
                  return (
                    <Badge
                      key={cond}
                      variant={isActive ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-2 py-1 text-[10px] transition-all",
                        !isActive && "text-muted-foreground opacity-60 hover:opacity-100",
                      )}
                      onClick={() => toggleCondition(cond)}
                    >
                      {cond}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-[10px]">点击标签选择该快捷键在哪些场景下生效。</p>
            </div>

            <div className="space-y-4">
              <Label className="text-muted-foreground text-[10px] uppercase tracking-widest">绑定的命令序列</Label>
              {commands.map(([cmd, args], index) => (
                <div key={index} className="bg-muted/30 border-border grid gap-3 rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Input
                      value={cmd}
                      onChange={(e) => updateCommand(index, e.target.value)}
                      placeholder="命令 ID (如: undo)"
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCommand(index)}
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      title="移除该命令"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 参数编辑区域 */}
                  <div className="border-primary/20 ml-2 space-y-2 border-l-2 pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[10px] font-bold">ARGS</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addArg(index)}
                        className="hover:bg-primary/10 h-6 gap-1 px-1.5 text-[10px]"
                      >
                        <Plus className="h-3 w-3" /> 添加参数
                      </Button>
                    </div>

                    {args.length > 0 && (
                      <div className="space-y-2">
                        {args.map((arg, argIdx) => (
                          <div key={argIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleArgType(index, argIdx)}
                              className="bg-primary/10 text-primary hover:bg-primary/20 flex min-w-[50px] shrink-0 items-center justify-center rounded px-1.5 py-1 text-[9px] font-bold transition-colors"
                              title="切换参数类型 (String -> Number -> Boolean)"
                            >
                              {typeof arg === "string" ? "STR" : typeof arg === "number" ? "NUM" : "BOOL"}
                            </button>

                            {typeof arg === "boolean" ? (
                              <div className="flex flex-1 items-center gap-2">
                                <Checkbox
                                  checked={arg}
                                  onCheckedChange={(val) => updateArgValue(index, argIdx, !!val)}
                                  id={`arg-${index}-${argIdx}`}
                                />
                                <Label
                                  htmlFor={`arg-${index}-${argIdx}`}
                                  className="cursor-pointer text-xs font-medium"
                                >
                                  {arg ? "TRUE" : "FALSE"}
                                </Label>
                              </div>
                            ) : (
                              <Input
                                type={typeof arg === "number" ? "number" : "text"}
                                value={arg}
                                onChange={(e) =>
                                  updateArgValue(
                                    index,
                                    argIdx,
                                    typeof arg === "number" ? Number(e.target.value) : e.target.value,
                                  )
                                }
                                className="h-8 flex-1 text-xs"
                              />
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeArg(index, argIdx)}
                              className="text-muted-foreground hover:text-destructive h-6 w-6"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex w-full items-center justify-center gap-2 border-dashed"
              onClick={addCommand}
            >
              <Plus className="h-4 w-4" /> 添加一条子命令
            </Button>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2">
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto">
              <Trash2 className="mr-2 h-4 w-4" /> 删除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="default" size="sm" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
