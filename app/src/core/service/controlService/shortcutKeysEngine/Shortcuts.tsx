import { db } from "@/db";
import { activeProjectAtom, store } from "@/state";
import { Direction } from "@/types/directions";
import { Commands } from "./Commands";

export enum ShortcutAction {
  RunCommands = "RunCommands",
  // TODO: 可以加个快捷轮盘？
}
export enum ShortcutCondition {
  ActiveProject = "ActiveProject",
}

export namespace Shortcuts {
  let isListenerAdded = false;
  let keyStack: string[] = [];

  async function checkMatch() {
    const shortcuts = await db.shortcuts.toArray();
    for (const shortcut of shortcuts) {
      // 检查shortcut.key数组末尾是否完全匹配keyStack
      if (shortcut.key.length > keyStack.length) continue;
      let match = true;
      for (let i = 0; i < shortcut.key.length; i++) {
        if (!keyStack[keyStack.length - shortcut.key.length + i].endsWith(shortcut.key[i])) {
          match = false;
          break;
        }
      }
      if (!match) continue;

      // 检查条件
      if (shortcut.conditions.includes(ShortcutCondition.ActiveProject)) {
        if (!store.get(activeProjectAtom)) continue;
      }

      // 运行命令
      for (const [command, args] of shortcut.commands) {
        Commands.execute(command, store.get(activeProjectAtom), ...args);
      }
      keyStack = [];
      break;
    }
  }

  if (!isListenerAdded) {
    isListenerAdded = true;
    window.addEventListener("keydown", (e) => {
      // 检测是否在输入框中，如果是则不触发快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (
        [
          "ControlLeft",
          "ControlRight",
          "AltLeft",
          "AltRight",
          "ShiftLeft",
          "ShiftRight",
          "MetaLeft",
          "MetaRight",
        ].includes(e.code)
      )
        return;
      e.preventDefault();
      if (e.ctrlKey) keyStack.push("+c");
      if (e.altKey) keyStack.push("+a");
      if (e.shiftKey) keyStack.push("+s");
      if (e.metaKey) keyStack.push("+m");
      keyStack.push(e.code);
      console.log("Current key stack:", keyStack);
      checkMatch();
      // 最多20项
      if (keyStack.length > 20) {
        keyStack.shift();
      }
    });
  }

  db.shortcuts.count().then((count) => {
    if (count) return;

    const defaultShortcuts: {
      key: string[];
      action: ShortcutAction;
      commands: [command: string, args: any[]][];
      conditions: ShortcutCondition[];
    }[] = [
      {
        key: ["+c", "+a", "+s", "KeyT", "KeyA", "+s", "KeyB"],
        action: ShortcutAction.RunCommands,
        commands: [["test", []]],
        conditions: [],
      },
      {
        key: ["Escape"],
        action: ShortcutAction.RunCommands,
        commands: [["closeAllWindows", []]],
        conditions: [],
      },
      {
        key: ["+c", "KeyZ"],
        action: ShortcutAction.RunCommands,
        commands: [["undo", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyY"],
        action: ShortcutAction.RunCommands,
        commands: [["redo", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyC"],
        action: ShortcutAction.RunCommands,
        commands: [["copy", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyX"],
        action: ShortcutAction.RunCommands,
        commands: [["cut", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyV"],
        action: ShortcutAction.RunCommands,
        commands: [["paste", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["F3"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleSetting", ["showDebug"]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["F5"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleSetting", ["isClassroomMode"]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["F6"],
        action: ShortcutAction.RunCommands,
        commands: [["openWindow", ["ColorWindow"]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "Digit2"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleSetting", ["protectingPrivacy"]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyF"],
        action: ShortcutAction.RunCommands,
        commands: [["openWindow", ["FindWindow"]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyF"],
        action: ShortcutAction.RunCommands,
        commands: [["resetView", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "KeyF"],
        action: ShortcutAction.RunCommands,
        commands: [["restoreCameraState", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "KeyR"],
        action: ShortcutAction.RunCommands,
        commands: [["resetCameraScale", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "KeyI"],
        action: ShortcutAction.RunCommands,
        commands: [["turnCameraPage", [Direction.Up]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "KeyK"],
        action: ShortcutAction.RunCommands,
        commands: [["turnCameraPage", [Direction.Down]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "KeyJ"],
        action: ShortcutAction.RunCommands,
        commands: [["turnCameraPage", [Direction.Left]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "KeyL"],
        action: ShortcutAction.RunCommands,
        commands: [["turnCameraPage", [Direction.Right]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyG"],
        action: ShortcutAction.RunCommands,
        commands: [["packEntityToSection", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyL"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleSectionLock", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyT"],
        action: ShortcutAction.RunCommands,
        commands: [
          ["reverseSelectedEdges", []],
          // 这个其实可以废了，非常难用 --littlefean
          // ["reverseSelectedNodeEdge", []],
          ["toggleSectionCollapse", []],
        ],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "KeyG"],
        action: ShortcutAction.RunCommands,
        commands: [["createUndirectedEdgeFromEntities", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["delete"],
        action: ShortcutAction.RunCommands,
        commands: [["deleteSelectedStageObjects", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Insert"],
        action: ShortcutAction.RunCommands,
        commands: [["createTextNodeFromCameraLocation", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "Insert"],
        action: ShortcutAction.RunCommands,
        commands: [["createTextNodeFromMouseLocation", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "ArrowUp"],
        action: ShortcutAction.RunCommands,
        commands: [["createTextNodeFromSelectedByDirection", [Direction.Up]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "ArrowDown"],
        action: ShortcutAction.RunCommands,
        commands: [["createTextNodeFromSelectedByDirection", [Direction.Down]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "ArrowLeft"],
        action: ShortcutAction.RunCommands,
        commands: [["createTextNodeFromSelectedByDirection", [Direction.Left]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "ArrowRight"],
        action: ShortcutAction.RunCommands,
        commands: [["createTextNodeFromSelectedByDirection", [Direction.Right]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["ArrowUp"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Up, false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["ArrowDown"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Down, false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["ArrowLeft"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Left, false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["ArrowRight"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Right, false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "ArrowUp"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Up, true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "ArrowDown"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Down, true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "ArrowLeft"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Left, true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "ArrowRight"],
        action: ShortcutAction.RunCommands,
        commands: [["selectByDirection", [Direction.Right, true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "ArrowUp"],
        action: ShortcutAction.RunCommands,
        commands: [["moveSelectedEntitiesByDirection", [Direction.Up]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "ArrowDown"],
        action: ShortcutAction.RunCommands,
        commands: [["moveSelectedEntitiesByDirection", [Direction.Down]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "ArrowLeft"],
        action: ShortcutAction.RunCommands,
        commands: [["moveSelectedEntitiesByDirection", [Direction.Left]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "ArrowRight"],
        action: ShortcutAction.RunCommands,
        commands: [["moveSelectedEntitiesByDirection", [Direction.Right]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "ArrowUp"],
        action: ShortcutAction.RunCommands,
        commands: [["jumpMoveSelectedEntitiesByDirection", [Direction.Up]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "ArrowDown"],
        action: ShortcutAction.RunCommands,
        commands: [["jumpMoveSelectedEntitiesByDirection", [Direction.Down]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "ArrowLeft"],
        action: ShortcutAction.RunCommands,
        commands: [["jumpMoveSelectedEntitiesByDirection", [Direction.Left]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "ArrowRight"],
        action: ShortcutAction.RunCommands,
        commands: [["jumpMoveSelectedEntitiesByDirection", [Direction.Right]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "Enter"],
        action: ShortcutAction.RunCommands,
        commands: [["editEntityDetails", [Direction.Down]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyA"],
        action: ShortcutAction.RunCommands,
        commands: [["selectAll", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+s", "KeyG"],
        action: ShortcutAction.RunCommands,
        commands: [
          ["textNodeToSection", []],
          ["unpackEntityFromSection", []],
        ],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyE"],
        action: ShortcutAction.RunCommands,
        commands: [["openTextNodeByContentExternal", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "Tab"],
        action: ShortcutAction.RunCommands,
        commands: [["cycleActiveProject", []]],
        conditions: [],
      },
      {
        key: ["+a", "+s", "KeyQ"],
        action: ShortcutAction.RunCommands,
        commands: [["closeCurrentProject", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyN"],
        action: ShortcutAction.RunCommands,
        commands: [["newDraft", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "KeyW"],
        action: ShortcutAction.RunCommands,
        commands: [["expandSelectEntity", [false, false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+s", "KeyW"],
        action: ShortcutAction.RunCommands,
        commands: [["expandSelectEntity", [false, true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "KeyW"],
        action: ShortcutAction.RunCommands,
        commands: [["expandSelectEntity", [true, false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "+s", "KeyW"],
        action: ShortcutAction.RunCommands,
        commands: [["expandSelectEntity", [true, true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Tab"],
        action: ShortcutAction.RunCommands,
        commands: [["generateNodeTreeWithDeepMode", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Backslash"],
        action: ShortcutAction.RunCommands,
        commands: [["generateNodeTreeWithBroadMode", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Backquote"],
        action: ShortcutAction.RunCommands,
        commands: [["generateNodeGraph", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "+s", "KeyF"],
        action: ShortcutAction.RunCommands,
        commands: [["treeGraphAdjust", [false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "+s", "KeyF"],
        action: ShortcutAction.RunCommands,
        commands: [["treeGraphAdjust", [true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "+s", "KeyD"],
        action: ShortcutAction.RunCommands,
        commands: [["dagGraphAdjust", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyG"],
        action: ShortcutAction.RunCommands,
        commands: [["gravityLayout", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyW", "KeyW"],
        action: ShortcutAction.RunCommands,
        commands: [["setNodeTreeDirection", [Direction.Up]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyS", "KeyS"],
        action: ShortcutAction.RunCommands,
        commands: [["setNodeTreeDirection", [Direction.Down]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyA", "KeyA"],
        action: ShortcutAction.RunCommands,
        commands: [["setNodeTreeDirection", [Direction.Left]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyD", "KeyD"],
        action: ShortcutAction.RunCommands,
        commands: [["setNodeTreeDirection", [Direction.Right]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyI", "KeyN", "KeyT", "KeyJ"],
        action: ShortcutAction.RunCommands,
        commands: [["alignNodesToInteger", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyO", "KeyK", "KeyK"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleCheckmarkOnTextNode", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyE", "KeyR", "KeyR"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleCheckErrorOnTextNode", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyR", "KeyR", "KeyR"],
        action: ShortcutAction.RunCommands,
        commands: [["reverseImageColor", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyP", "KeyS", "KeyA", "+s", "Equal", "+s", "Equal"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustPenAlpha", [0.1]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyP", "KeyS", "KeyA", "Minus", "Minus"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustPenAlpha", [-0.1]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad8", "Numpad8"],
        action: ShortcutAction.RunCommands,
        commands: [["alignByDirection", [Direction.Up]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad2", "Numpad2"],
        action: ShortcutAction.RunCommands,
        commands: [["alignByDirection", [Direction.Down]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad4", "Numpad4"],
        action: ShortcutAction.RunCommands,
        commands: [["alignByDirection", [Direction.Left]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad6", "Numpad6"],
        action: ShortcutAction.RunCommands,
        commands: [["alignByDirection", [Direction.Right]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad4", "Numpad6", "Numpad4", "Numpad6"],
        action: ShortcutAction.RunCommands,
        commands: [["alignHorizontalSpaceBetween", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad8", "Numpad2", "Numpad8", "Numpad2"],
        action: ShortcutAction.RunCommands,
        commands: [["alignVerticalSpaceBetween", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad5", "Numpad4", "Numpad6"],
        action: ShortcutAction.RunCommands,
        commands: [["alignCenterHorizontal", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad5", "Numpad8", "Numpad2"],
        action: ShortcutAction.RunCommands,
        commands: [["alignCenterVertical", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad4", "Numpad5", "Numpad6"],
        action: ShortcutAction.RunCommands,
        commands: [["alignBottomToTopNoSpace", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Numpad8", "Numpad5", "Numpad2"],
        action: ShortcutAction.RunCommands,
        commands: [["alignTopToBottomNoSpace", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Digit1"],
        action: ShortcutAction.RunCommands,
        commands: [["createConnectPointWhenDragConnecting", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Minus", "Minus", "KeyA", "KeyL", "KeyL"],
        action: ShortcutAction.RunCommands,
        commands: [["connectAllSelectedEntities", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Minus", "Minus", "KeyR", "KeyI", "KeyG", "KeyH", "KeyT"],
        action: ShortcutAction.RunCommands,
        commands: [["connectLeftToRight", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Minus", "Minus", "KeyD", "KeyO", "KeyW", "KeyN"],
        action: ShortcutAction.RunCommands,
        commands: [["connectTopToBottom", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "Equal", "KeyE", "KeyD", "KeyG", "KeyE"],
        action: ShortcutAction.RunCommands,
        commands: [["selectAllEdges", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Semicolon", "KeyR", "KeyE", "KeyD"],
        action: ShortcutAction.RunCommands,
        commands: [["colorSelectedRed", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyB", "Period"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustBrightness", [20]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyB", "Comma"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustBrightness", [-20]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["Semicolon", "Comma"],
        action: ShortcutAction.RunCommands,
        commands: [["gradientColor", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "+s", "ArrowUp"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustHue", [30]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+a", "+s", "ArrowDown"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustHue", [-30]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "+s", "ArrowUp"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustHue", [90]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+c", "+a", "+s", "ArrowDown"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustHue", [-90]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyT", "KeyT", "KeyT"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleTextNodeSizeMode", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyK", "KeyE", "KeyI"],
        action: ShortcutAction.RunCommands,
        commands: [["splitTextNodes", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyR", "KeyU", "KeyA"],
        action: ShortcutAction.RunCommands,
        commands: [["mergeTextNodes", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyE", "KeyE", "KeyE", "KeyE", "KeyE"],
        action: ShortcutAction.RunCommands,
        commands: [["swapTextAndDetails", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyJ", "KeyA", "KeyC", "KeyK", "KeyA", "KeyL"],
        action: ShortcutAction.RunCommands,
        commands: [["toggleSetting", ["isStealthModeEnabled"]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyC", "Backspace"],
        action: ShortcutAction.RunCommands,
        commands: [["removeFirstCharFromSelectedTextNodes", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyC", "Delete"],
        action: ShortcutAction.RunCommands,
        commands: [["removeLastCharFromSelectedTextNodes", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyC", "+s", "Equal", "+s", "Equal"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustFontSizeLevel", [1]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyC", "Minus", "Minus"],
        action: ShortcutAction.RunCommands,
        commands: [["adjustFontSizeLevel", [-1]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyQ", "KeyE"],
        action: ShortcutAction.RunCommands,
        commands: [["insertNodeToTree", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyQ", "KeyR"],
        action: ShortcutAction.RunCommands,
        commands: [["removeNodeFromTree", []]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["KeyQ", "KeyQ"],
        action: ShortcutAction.RunCommands,
        commands: [["selectAtCrosshair", [false]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
      {
        key: ["+s", "KeyQ"],
        action: ShortcutAction.RunCommands,
        commands: [["selectAtCrosshair", [true]]],
        conditions: [ShortcutCondition.ActiveProject],
      },
    ];

    db.shortcuts.bulkAdd(defaultShortcuts);
  });
}
