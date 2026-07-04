import { Project, service } from "@/core/Project";
import { EntityShakeEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShakeEffect";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
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
        // 如果是因为窗口失焦（切屏）导致的 blur，不退出编辑状态，等窗口重新获焦后恢复焦点
        if (!document.hasFocus()) {
          const onWindowFocus = () => {
            window.removeEventListener("focus", onWindowFocus);
            if (document.body.contains(inputElement)) {
              inputElement.focus();
            }
          };
          window.addEventListener("focus", onWindowFocus);
          return;
        }
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
    exitOnWheel = false,
    /**
     * 固定宽度模式（manual 节点使用）：传入节点视图宽度（px 数值），
     * textarea 宽度将锁定为该值，不随内容扩展；高度仍自动增长。
     * 不传（undefined）则为自动宽度模式（auto 节点使用）。
     */
    fixedWidth?: number,
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

      // 创建隐藏镜像 div，用于精确测量文本内容的真实宽度
      // textarea 的 scrollWidth 在 width:auto 时不会收缩到内容宽度，
      // 而 div 的 scrollWidth 会精确反映内容宽度，是业界标准做法
      const mirrorDiv = document.createElement("div");
      mirrorDiv.style.position = "absolute";
      mirrorDiv.style.left = "-9999px"; // 移到屏幕外，防止撑出滚动条导致页面抖动
      mirrorDiv.style.top = "-9999px";
      mirrorDiv.style.overflow = "hidden";
      mirrorDiv.style.visibility = "hidden";
      mirrorDiv.style.whiteSpace = "pre"; // 保持空格和换行，不自动折行
      mirrorDiv.style.pointerEvents = "none";
      // 从 textarea 继承字体相关样式，确保测量结果一致
      const taStyle = window.getComputedStyle(textareaElement);
      mirrorDiv.style.font = taStyle.font;
      mirrorDiv.style.letterSpacing = taStyle.letterSpacing;
      mirrorDiv.style.padding = taStyle.padding;
      mirrorDiv.style.boxSizing = taStyle.boxSizing;
      document.body.appendChild(mirrorDiv);

      /**
       * 用镜像 div 测量文本各行中最长一行的真实渲染宽度
       * 对每一行单独测量取最大值，避免 pre-wrap 折行干扰
       */
      const measureTextWidth = (text: string): number => {
        const lines = text.split("\n");
        let maxWidth = 0;
        for (const line of lines) {
          // 空行用零宽空格占位，防止 div 高度塌陷导致 padding 计算错误
          mirrorDiv.textContent = line || "\u200b";
          maxWidth = Math.max(maxWidth, mirrorDiv.scrollWidth);
        }
        return maxWidth;
      };

      // 自动调整 textarea 的高度和宽度
      // fixedWidth 有值 → manual 模式：宽度固定，只调整高度
      // fixedWidth 无值 → auto 模式：用镜像 div 测量真实内容宽度并扩展
      const adjustSize = (composingText?: string) => {
        if (fixedWidth === undefined) {
          // auto 模式：宽度随内容扩展，用镜像 div 测量（包含 composing 中的拼音字母）
          const fullText = composingText !== undefined ? textareaElement.value + composingText : textareaElement.value;
          const measuredWidth = measureTextWidth(fullText);
          textareaElement.style.width = `${measuredWidth + 2}px`;
        }
        // 高度：auto → scrollHeight（两种模式都需要）
        textareaElement.style.height = "auto";
        textareaElement.style.height = `${textareaElement.scrollHeight}px`;
      };

      // 初始化时立即调整一次，防止初始渲染就换行
      adjustSize();

      const onOutsideWheel = () => {
        finish();
      };
      setTimeout(() => {
        if (exitOnWheel) {
          document.body.addEventListener("wheel", onOutsideWheel);
        }
        adjustSize(); // setTimeout 后再调整一次，确保字体已完全加载
      }, 20);

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
        if (document.body.contains(mirrorDiv)) {
          document.body.removeChild(mirrorDiv);
        }
      };
      let isFinished = false;
      const cleanup = () => {
        document.body.removeEventListener("wheel", onOutsideWheel);
      };
      const finish = (value = textareaElement.value) => {
        if (isFinished) {
          return;
        }
        isFinished = true;
        resolve(value);
        onChange(value, textareaElement);
        cleanup();
        removeElement();
      };

      textareaElement.addEventListener("blur", () => {
        // 如果是因为窗口失焦（切屏）导致的 blur，不退出编辑状态，等窗口重新获焦后恢复焦点
        if (!document.hasFocus()) {
          const onWindowFocus = () => {
            window.removeEventListener("focus", onWindowFocus);
            if (document.body.contains(textareaElement)) {
              textareaElement.focus();
            }
          };
          window.addEventListener("focus", onWindowFocus);
          return;
        }
        finish();
      });
      textareaElement.addEventListener("input", () => {
        this.project.controller.resetCountdownTimer();
        onChange(textareaElement.value, textareaElement);
        adjustSize();
      });
      // compositionupdate：拼音输入过程中实时调整宽度，防止拼音字母撑破布局
      textareaElement.addEventListener("compositionupdate", (event: CompositionEvent) => {
        adjustSize(event.data);
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
              finish(currentValue);
              this.project.keyboardOnlyTreeEngine.onBroadGenerateNode();
            }
          }
        } else if (event.code === "Backspace") {
          // event.preventDefault();  // 不能这样否则就删除不了了。
          if (textareaElement.value === "") {
            if (Settings.textNodeBackspaceDeleteWhenEmpty) {
              // 已经要删空了。
              finish("");
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

          finish();
          // xmind用户
          this.project.keyboardOnlyTreeEngine.onDeepGenerateNode(afterText, selectAllTextWhenCreated);
        } else if (event.key === "Escape") {
          event.preventDefault(); // 这里可以阻止mac退出全屏
          // Escape 是通用的取消编辑的快捷键
          finish();
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          // 如果按下了撤销键但没撤销，则textarea撤销栈已空，认为用户的想法是退出编辑
          setTimeout(() => {
            if (!hasTextareaUndone) {
              finish();
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
          finish();
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
    if (!this.project.camera.isDefaultZoom()) return;
    const textNodes = this.project.stageManager.getTextNodes().filter((textNode) => textNode.isEditing);
    for (const textNode of textNodes) {
      this.project.effects.addEffect(
        RectangleLittleNoteEffect.fromUtilsLittleNote(
          textNode,
          this.project.stageStyleManager.currentStyle.effects.successShadow,
        ),
      );
    }
  }

  private addFailEffect(withToast = true) {
    if (!this.project.camera.isDefaultZoom()) return;
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
