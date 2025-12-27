import { Project, service } from "@/core/Project";
import { EntityDashTipEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityDashTipEffect";
import { EntityShakeEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShakeEffect";
import { Settings } from "@/core/service/Settings";
import { getEnterKey } from "@/utils/keyboardFunctions";
import { isMac } from "@/utils/platform";
import { Vector } from "@graphif/data-structures";
import { toast } from "sonner";

/**
 * 主要用于解决canvas上无法输入的问题，用临时生成的jsdom元素透明地贴在上面
 */
@service("inputElement")
export class InputElement {
  /**
   * 在指定位置创建一个输入框
   * @param location 输入框的左上角位置（相对于窗口左上角的位置）
   * @param defaultValue 一开始的默认文本
   * @param onChange 输入框文本改变函数
   * @param style 输入框样式
   * @returns
   */
  input(
    location: Vector,
    defaultValue: string,
    onChange: (value: string) => void = () => {},
    style: Partial<CSSStyleDeclaration> = {},
  ): Promise<string> {
    return new Promise((resolve) => {
      const inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.value = defaultValue;

      inputElement.style.position = "fixed";
      inputElement.style.top = `${location.y}px`;
      inputElement.style.left = `${location.x}px`;

      inputElement.id = "pg-input";
      inputElement.autocomplete = "off";
      Object.assign(inputElement.style, style);
      document.body.appendChild(inputElement);
      inputElement.focus();
      inputElement.select();
      const removeElement = () => {
        if (document.body.contains(inputElement)) {
          try {
            // 暂时关闭频繁弹窗报错。
            document.body.removeChild(inputElement);
          } catch (error) {
            console.error(error);
          }
        }
      };
      const adjustSize = () => {
        // inputElement.style.width = `${inputElement.scrollWidth + 2}px`;
      };

      const onOutsideClick = (event: Event) => {
        if (!inputElement.contains(event.target as Node)) {
          resolve(inputElement.value);
          onChange(inputElement.value);
          document.body.removeEventListener("mousedown", onOutsideClick);
          removeElement();
        }
      };
      const onOutsideWheel = () => {
        resolve(inputElement.value);
        onChange(inputElement.value);
        document.body.removeEventListener("mousedown", onOutsideClick);
        removeElement();
      };

      // 初始化
      setTimeout(() => {
        document.body.addEventListener("mousedown", onOutsideClick);
        document.body.addEventListener("touchstart", onOutsideClick);
        document.body.addEventListener("wheel", onOutsideWheel);
        adjustSize(); // 初始化时调整大小
      }, 10);

      inputElement.addEventListener("input", () => {
        this.project.controller.resetCountdownTimer();
        onChange(inputElement.value);
        adjustSize();
      });
      inputElement.addEventListener("blur", () => {
        resolve(inputElement.value);
        onChange(inputElement.value);
        document.body.removeEventListener("mousedown", onOutsideClick);
        removeElement();
      });
      let isComposing = false;
      inputElement.addEventListener("compositionstart", () => {
        isComposing = true;
      });
      inputElement.addEventListener("compositionend", () => {
        // 防止此事件早于enter键按下触发（Mac的bug）
        setTimeout(() => {
          isComposing = false;
        }, 100);
      });
      inputElement.addEventListener("keydown", (event) => {
        event.stopPropagation();

        if (event.key === "Enter") {
          if (!(event.isComposing || isComposing)) {
            resolve(inputElement.value);
            onChange(inputElement.value);
            document.body.removeEventListener("mousedown", onOutsideClick);
            removeElement();
          }
        }
        if (event.key === "Tab") {
          // 防止tab切换到其他按钮
          event.preventDefault();
        }
      });
    });
  }
  /**
   * 在指定位置创建一个多行输入框
   * @param location 输入框的左上角位置（相对于窗口左上角的位置）
   * @param defaultValue 一开始的默认文本
   * @param onChange 输入框文本改变函数
   * @param style 输入框样式
   * @param selectAllWhenCreated 是否在创建时全选内容
   * @returns
   */
  textarea(
    defaultValue: string,
    onChange: (value: string, element: HTMLTextAreaElement) => void = () => {},
    style: Partial<CSSStyleDeclaration> = {},
    selectAllWhenCreated = true,
    // limitWidth = 100,
  ): Promise<string> {
    return new Promise((resolve) => {
      const textareaElement = document.createElement("textarea");
      textareaElement.value = defaultValue;

      textareaElement.id = "pg-textarea";
      textareaElement.autocomplete = "off"; // 禁止使用自动填充内容，防止影响输入体验
      // const initSizeView = this.project.textRenderer.measureMultiLineTextSize(
      //   defaultValue,
      //   Renderer.FONT_SIZE * this.project.camera.currentScale,
      //   limitWidth,
      //   1.5,
      // );
      Object.assign(textareaElement.style, style);
      document.body.appendChild(textareaElement);

      // web版在右键连线直接练到空白部分触发节点生成并编辑出现此元素时，防止触发右键菜单
      textareaElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });
      textareaElement.focus();
      if (selectAllWhenCreated) {
        textareaElement.select();
      }
      // 以上这两部必须在appendChild之后执行
      const removeElement = () => {
        if (document.body.contains(textareaElement)) {
          try {
            document.body.removeChild(textareaElement);
          } catch (error) {
            console.error(error);
          }
        }
      };

      // 自动调整textarea的高度和宽度
      const adjustSize = () => {
        // 重置高度和宽度以获取正确的scrollHeight和scrollWidth
        textareaElement.style.height = "auto";
        textareaElement.style.height = `${textareaElement.scrollHeight}px`;
        // textareaElement.style.width = `${textareaElement.scrollWidth + 2}px`;
      };
      setTimeout(() => {
        adjustSize(); // 初始化时调整大小
      }, 20);
      textareaElement.addEventListener("blur", () => {
        resolve(textareaElement.value);
        onChange(textareaElement.value, textareaElement);
        removeElement();
      });
      textareaElement.addEventListener("input", () => {
        this.project.controller.resetCountdownTimer();
        onChange(textareaElement.value, textareaElement);
      });

      // 在输入之前判断是否进行了撤销操作，此监听器在keydown之后触发
      let hasTextareaUndone = false;
      textareaElement.addEventListener("beforeinput", (event: InputEvent) => {
        if (event.inputType === "historyUndo") {
          hasTextareaUndone = true;
        }
      });

      let isComposing = false;
      textareaElement.addEventListener("compositionstart", () => {
        isComposing = true;
      });
      textareaElement.addEventListener("compositionend", () => {
        // 防止此事件早于enter键按下触发（Mac的bug）
        setTimeout(() => {
          isComposing = false;
        }, 100);
      });
      textareaElement.addEventListener("click", () => {
        console.log("click");
      });

      textareaElement.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (isMac) {
          // 补充mac平台快捷键，home/end移动到行首/行尾
          // shift+home/end 选中当前光标位置到行首/行尾
          if (event.key === "Home") {
            moveToLineStart(textareaElement, event.shiftKey);
            event.preventDefault();
          } else if (event.key === "End") {
            moveToLineEnd(textareaElement, event.shiftKey);
            event.preventDefault();
          }
        }

        if (event.code === "Backslash") {
          const currentSelectNode = this.project.stageManager.getConnectableEntity().find((node) => node.isSelected);
          if (!currentSelectNode) return;
          if (this.project.graphMethods.isCurrentNodeInTreeStructAndNotRoot(currentSelectNode)) {
            // 广度生长节点
            if (Settings.enableBackslashGenerateNodeInInput) {
              event.preventDefault();
              let currentValue = textareaElement.value;
              if (currentValue.endsWith("、")) {
                // 删除结尾 防止把顿号写进去
                currentValue = currentValue.slice(0, -1);
              }
              resolve(currentValue);
              onChange(currentValue, textareaElement);
              removeElement();
              this.project.keyboardOnlyTreeEngine.onBroadGenerateNode();
            }
          }
        } else if (event.code === "Backspace") {
          // event.preventDefault();  // 不能这样否则就删除不了了。
          if (textareaElement.value === "") {
            if (Settings.textNodeBackspaceDeleteWhenEmpty) {
              // 已经要删空了。
              resolve("");
              onChange("", textareaElement);
              removeElement();
              this.project.stageManager.deleteSelectedStageObjects();
            } else {
              // 整一个特效
              this.addFailEffect(false);
            }
          }
        } else if (event.key === "Tab") {
          // 防止tab切换到其他按钮
          event.preventDefault();
          // const start = textareaElement.selectionStart;
          const end = textareaElement.selectionEnd;
          // textareaElement.value =
          //   textareaElement.value.substring(0, start) + "\t" + textareaElement.value.substring(end);
          // textareaElement.selectionStart = start + 1;
          // textareaElement.selectionEnd = start + 1;

          // 获取光标后面的内容：
          const afterText = textareaElement.value.substring(end);

          // tab生长后是否选中后面的内容
          let selectAllTextWhenCreated = true;
          if (afterText.trim() !== "") {
            // 如果后面有内容，则在当前节点删除后面的内容
            textareaElement.value = textareaElement.value.substring(0, end);
            selectAllTextWhenCreated = false;
          }

          resolve(textareaElement.value);
          onChange(textareaElement.value, textareaElement);
          removeElement();
          // xmind用户
          this.project.keyboardOnlyTreeEngine.onDeepGenerateNode(afterText, selectAllTextWhenCreated);
        } else if (event.key === "Escape") {
          event.preventDefault(); // 这里可以阻止mac退出全屏
          // Escape 是通用的取消编辑的快捷键
          resolve(textareaElement.value);
          onChange(textareaElement.value, textareaElement);
          removeElement();
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          // 如果按下了撤销键但没撤销，则textarea撤销栈已空，认为用户的想法是退出编辑
          setTimeout(() => {
            if (!hasTextareaUndone) {
              resolve(textareaElement.value);
              onChange(textareaElement.value, textareaElement);
              removeElement();
            }
          }, 10); // 延迟10ms再检测撤销操作是否完成
          hasTextareaUndone = false; // 重置标志
        }

        const breakLine = () => {
          const start = textareaElement.selectionStart;
          const end = textareaElement.selectionEnd;
          textareaElement.value =
            textareaElement.value.substring(0, start) + "\n" + textareaElement.value.substring(end);
          textareaElement.selectionStart = start + 1;
          textareaElement.selectionEnd = start + 1;
          // 调整
          adjustSize(); // 调整textarea
          onChange(textareaElement.value, textareaElement); // 调整canvas渲染上去的框大小
        };

        const exitEditMode = () => {
          resolve(textareaElement.value);
          onChange(textareaElement.value, textareaElement);
          removeElement();
        };

        if (event.key === "Enter") {
          event.preventDefault();
          // 使用event.isComposing和自定义isComposing双重检查
          if (!(event.isComposing || isComposing)) {
            const enterKeyDetail = getEnterKey(event);
            if (Settings.textNodeExitEditMode === enterKeyDetail) {
              // 用户想退出编辑
              exitEditMode();
              this.addSuccessEffect();
            } else if (Settings.textNodeContentLineBreak === enterKeyDetail) {
              // 用户想换行
              breakLine();
            } else {
              // 用户可能记错了快捷键
              this.addFailEffect();
            }
          }
        }
      });
    });
  }

  private addSuccessEffect() {
    const textNodes = this.project.stageManager.getTextNodes().filter((textNode) => textNode.isEditing);
    for (const textNode of textNodes) {
      this.project.effects.addEffect(new EntityDashTipEffect(50, textNode.collisionBox.getRectangle()));
    }
  }

  private addFailEffect(withToast = true) {
    const textNodes = this.project.stageManager.getTextNodes().filter((textNode) => textNode.isEditing);
    for (const textNode of textNodes) {
      this.project.effects.addEffect(EntityShakeEffect.fromEntity(textNode));
    }
    if (withToast) {
      toast("您可能记错了退出或换行的控制设置");
    }
  }

  constructor(private readonly project: Project) {}
}

// 移动到当前行的行首
function moveToLineStart(textarea: HTMLTextAreaElement, isSelecting = false) {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // 找到当前行的开始位置
  let lineStart = 0;
  for (let i = start - 1; i >= 0; i--) {
    if (value[i] === "\n") {
      lineStart = i + 1;
      break;
    }
  }

  if (isSelecting) {
    // Shift+Home: 选中从当前光标到行首
    // 保持selectionEnd不变（当前光标位置），移动selectionStart到行首
    if (start === end) {
      // 没有选中文本时
      textarea.selectionStart = lineStart;
      textarea.selectionEnd = end;
    } else {
      // 已经有选中文本时，扩展选中范围到行首
      textarea.selectionStart = lineStart;
      // selectionEnd保持不变
    }
  } else {
    // Home: 只移动光标到行首
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart;
  }
}

// 移动到当前行的行尾
function moveToLineEnd(textarea: HTMLTextAreaElement, isSelecting = false) {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const length = value.length;

  // 找到当前行的结束位置
  let lineEnd = length;
  for (let i = end; i < length; i++) {
    if (value[i] === "\n") {
      lineEnd = i;
      break;
    }
  }

  if (isSelecting) {
    // Shift+End: 选中从当前光标到行尾
    // 保持selectionStart不变（当前光标位置），移动selectionEnd到行尾
    if (start === end) {
      // 没有选中文本时
      textarea.selectionStart = start;
      textarea.selectionEnd = lineEnd;
    } else {
      // 已经有选中文本时，扩展选中范围到行尾
      textarea.selectionEnd = lineEnd;
      // selectionStart保持不变
    }
  } else {
    // End: 只移动光标到行尾
    textarea.selectionStart = lineEnd;
    textarea.selectionEnd = lineEnd;
  }
}
