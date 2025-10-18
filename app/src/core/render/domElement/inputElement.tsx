import { Project, service } from "@/core/Project";
import { EntityDashTipEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityDashTipEffect";
import { EntityShakeEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShakeEffect";
import { Settings } from "@/core/service/Settings";
import { getEnterKey } from "@/utils/keyboardFunctions";
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
        isComposing = false;
      });

      inputElement.addEventListener("keydown", (event) => {
        event.stopPropagation();
        if (event.key === "Enter" && !isComposing) {
          resolve(inputElement.value);
          onChange(inputElement.value);
          document.body.removeEventListener("mousedown", onOutsideClick);
          removeElement();
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
        if (event.key === "Tab") {
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
          // Escape 是通用的取消编辑的快捷键
          resolve(textareaElement.value);
          onChange(textareaElement.value, textareaElement);
          removeElement();
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

  private addFailEffect() {
    const textNodes = this.project.stageManager.getTextNodes().filter((textNode) => textNode.isEditing);
    for (const textNode of textNodes) {
      this.project.effects.addEffect(EntityShakeEffect.fromEntity(textNode));
    }
    toast("您可能记错了退出或换行的控制设置");
  }

  constructor(private readonly project: Project) {}
}
