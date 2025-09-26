import { Dialog } from "@/components/ui/dialog";
import { Project } from "@/core/Project";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { DetailsManager } from "@/core/stage/stageObject/tools/entityDetailsManager";
import { averageColors, Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { toast } from "sonner";
import { v4 } from "uuid";

export namespace TextNodeSmartTools {
  export function ttt(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      if (node.sizeAdjust === "auto") {
        node.sizeAdjust = "manual";
        node.resizeHandle(Vector.getZero());
      } else if (node.sizeAdjust === "manual") {
        node.sizeAdjust = "auto";
        node.forceAdjustSizeByText();
      }
    }
  }
  /**
   * 揉成一个
   * @param project
   * @returns
   */
  export function rua(project: Project) {
    let selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length <= 1) {
      toast.error("rua的节点数量不能小于2");
      return;
    }
    selectedTextNodes = selectedTextNodes.sort(
      (a, b) => a.collisionBox.getRectangle().location.y - b.collisionBox.getRectangle().location.y,
    );
    let mergeText = "";
    const detailsList = [];
    for (const textNode of selectedTextNodes) {
      mergeText += textNode.text + "\n";
      detailsList.push(textNode.details);
    }
    mergeText = mergeText.trim();
    const leftTop = Rectangle.getBoundingRectangle(
      selectedTextNodes.map((node) => node.collisionBox.getRectangle()),
    ).leftTop;
    const avgColor = averageColors(selectedTextNodes.map((node) => node.color));
    const newTextNode = new TextNode(project, {
      uuid: v4(),
      text: mergeText,
      collisionBox: new CollisionBox([new Rectangle(new Vector(leftTop.x, leftTop.y), new Vector(400, 1))]),
      color: avgColor.clone(),
      sizeAdjust: "manual",
      details: DetailsManager.mergeDetails(detailsList),
    });
    project.stageManager.add(newTextNode);
    // 选中新的节点
    newTextNode.isSelected = true;
    project.stageManager.deleteEntities(selectedTextNodes);
  }

  export function kei(project: Project) {
    // 获取所有选中的文本节点
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    selectedTextNodes.forEach((node) => {
      node.isSelected = false;
    });
    setTimeout(() => {
      Dialog.input("请输入分割符（n代表一个换行符，t代表一个制表符）").then((userInput) => {
        if (userInput === undefined || userInput === "") return;
        userInput = userInput.replaceAll("n", "\n");
        userInput = userInput.replaceAll("t", "\t");
        for (const node of selectedTextNodes) {
          const text = node.text;
          const seps = [userInput];
          const escapedSeps = seps.map((sep) => sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
          const regex = new RegExp(escapedSeps.join("|"), "g");
          const splitedTextList = text.split(regex).filter((item) => item !== "");
          const putLocation = node.collisionBox.getRectangle().location.clone();
          const newNodes = [];
          for (const splitedText of splitedTextList) {
            const newTextNode = new TextNode(project, {
              uuid: v4(),
              text: splitedText,
              collisionBox: new CollisionBox([
                new Rectangle(new Vector(putLocation.x, putLocation.y), new Vector(1, 1)),
              ]),
              color: node.color.clone(),
            });
            newNodes.push(newTextNode);
            project.stageManager.add(newTextNode);
            putLocation.y += 100;
          }
          newNodes.forEach((newNode) => {
            newNode.isSelected = true;
          });
          project.layoutManager.alignTopToBottomNoSpace();
          newNodes.forEach((newNode) => {
            newNode.isSelected = false;
          });
        }
        // 删除所有选中的文本节点
        project.stageManager.deleteEntities(selectedTextNodes);
      });
    });
  }

  export function exchangeTextAndDetails(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      const details = node.details;
      const text = node.text;
      node.details = DetailsManager.markdownToDetails(text);
      node.text = DetailsManager.detailsToMarkdown(details);
      node.forceAdjustSizeByText();
    }
    project.historyManager.recordStep();
  }

  export function removeFirstCharFromSelectedTextNodes(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length === 0) {
      return;
    }

    // 记录操作历史
    project.historyManager.recordStep();

    for (const node of selectedTextNodes) {
      if (node.text.length > 0) {
        // 获取要移除的字符
        const removedChar = node.text.charAt(0);

        // 更新原节点文本
        node.rename(node.text.substring(1));

        // 创建新的单字符节点
        const rect = node.collisionBox.getRectangle();

        // 创建新节点（先创建但不立即添加到舞台，以便获取其实际宽度）
        const newNode = new TextNode(project, {
          text: removedChar,
          collisionBox: new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(0, 0))]),
          color: node.color.clone(),
        });

        // 计算新节点的实际宽度
        const newNodeWidth = newNode.collisionBox.getRectangle().width;

        // 检测左侧是否有单字符节点，如果有则将它们往左推
        const textNodes = project.stageManager.getTextNodes();
        const leftNodes = textNodes.filter(
          (n) =>
            n !== node &&
            n.text.length === 1 &&
            n.rectangle.right <= rect.left &&
            Math.abs(n.rectangle.center.y - rect.center.y) < rect.size.y / 2,
        );

        // 按x坐标从右到左排序，确保先推最靠近原节点的
        leftNodes.sort((a, b) => b.rectangle.right - a.rectangle.right);

        // 推动现有节点，使用新节点的实际宽度作为推动距离
        leftNodes.forEach((n) => {
          n.move(new Vector(-newNodeWidth, 0));
        });

        // 设置新节点的位置，使其右侧边缘贴住原节点的左侧边缘
        newNode.moveTo(new Vector(rect.left - newNodeWidth, rect.location.y));
        // 添加到舞台
        project.stageManager.add(newNode);

        // 保持原节点的选中状态
        node.isSelected = true;
      }
    }
  }

  export function removeLastCharFromSelectedTextNodes(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    if (selectedTextNodes.length === 0) {
      return;
    }

    // 记录操作历史
    project.historyManager.recordStep();

    for (const node of selectedTextNodes) {
      if (node.text.length > 0) {
        // 获取要移除的字符
        const removedChar = node.text.charAt(node.text.length - 1);

        // 更新原节点文本
        node.rename(node.text.substring(0, node.text.length - 1));

        // 创建新的单字符节点
        const rect = node.collisionBox.getRectangle();

        // 创建新节点（先创建但不立即添加到舞台，以便获取其实际宽度）
        const newNode = new TextNode(project, {
          text: removedChar,
          collisionBox: new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(0, 0))]),
          color: node.color.clone(),
        });

        // 计算新节点的实际宽度
        const newNodeWidth = newNode.collisionBox.getRectangle().width;

        // 检测右侧是否有单字符节点，如果有则将它们往右推
        const textNodes = project.stageManager.getTextNodes();
        const rightNodes = textNodes.filter(
          (n) =>
            n !== node &&
            n.text.length === 1 &&
            n.rectangle.left >= rect.right &&
            Math.abs(n.rectangle.center.y - rect.center.y) < rect.size.y / 2,
        );

        // 按x坐标从左到右排序，确保先推最靠近原节点的
        rightNodes.sort((a, b) => a.rectangle.left - b.rectangle.left);

        // 推动现有节点，使用新节点的实际宽度作为推动距离
        rightNodes.forEach((n) => {
          n.move(new Vector(newNodeWidth, 0));
        });

        // 设置新节点的位置，使其左侧边缘贴住原节点的右侧边缘
        newNode.moveTo(new Vector(rect.right, rect.location.y));

        // 添加到舞台
        project.stageManager.add(newNode);

        // 保持原节点的选中状态
        node.isSelected = true;
      }
    }
  }

  export function okk(project: Project) {
    const selectedTextNodes = project.stageManager.getSelectedEntities().filter((node) => node instanceof TextNode);
    for (const node of selectedTextNodes) {
      if (node.color.equals(new Color(59, 114, 60))) {
        node.rename(node.text.replace("✅ ", ""));
        node.color = Color.Transparent;
      } else {
        node.rename("✅ " + node.text);
        node.color = new Color(59, 114, 60);
      }
      project.controllerUtils.finishChangeTextNode(node);
    }
    project.stageManager.updateReferences();
  }
}
