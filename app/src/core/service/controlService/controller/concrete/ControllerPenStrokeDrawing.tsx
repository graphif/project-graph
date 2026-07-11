import { Project } from "@/core/Project";
import { ControllerClass } from "@/core/service/controlService/controller/ControllerClass";
import { Settings } from "@/core/service/Settings";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { LatexNode } from "@/core/stage/stageObject/entity/LatexNode";
import { PenStroke, PenStrokeSegment } from "@/core/stage/stageObject/entity/PenStroke";
import { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import { CursorNameEnum } from "@/types/cursors";
import { isMac, isWeb } from "@/utils/platform";
import { Color, mixColors, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { invoke } from "@tauri-apps/api/core";
import { join, tempDir } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import debounce from "lodash/debounce.js";
import { toast } from "sonner";

/**
 * 涂鸦功能
 */
export class ControllerPenStrokeDrawingClass extends ControllerClass {
  private _isUsing: boolean = false;

  /** 在移动的过程中，记录这一笔画的笔迹 */
  public currentSegments: PenStrokeSegment[] = [];
  /** 当前是否是在绘制直线 */
  public isDrawingLine = false;

  public currentStrokeWidth: number = 5;

  /** 待 OCR 识别的笔迹，在 debounce 窗口内累积 */
  private pendingOCRStrokes: PenStroke[] = [];
  /** OCR 模型是否存在（首次用到时惰性检查） */
  private _ocrModelExists: boolean | null = null;

  /**
   * 初始化函数
   */
  constructor(protected readonly project: Project) {
    super(project);
  }

  public mousedown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (Settings.mouseLeftMode !== "draw" && event.pointerType !== "pen") {
      return;
    }
    if (this.project.controller.camera.isPreGrabbingWhenSpace) {
      return;
    }
    this._isUsing = true;
    if (Settings.hideCursorInPenMode) {
      this.project.controller.setCursorName(CursorNameEnum.None);
    }
    const pressWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
    if (this.project.controller.pressingKeySet.has("shift")) {
      this.isDrawingLine = true;
    }
    this.lastMoveLocation = pressWorldLocation.clone();
  };

  public mousemove = (event: PointerEvent) => {
    if (!this._isUsing) return;
    if (!this.project.controller.isMouseDown[0] && Settings.mouseLeftMode === "draw") return;
    if (this.project.controller.isMouseDown[0] && Settings.mouseLeftMode !== "draw") return;
    const events = "getCoalescedEvents" in event ? event.getCoalescedEvents() : [event];
    for (const e of events) {
      const isPen = e.pointerType === "pen";
      const worldLocation = this.project.renderer.transformView2World(new Vector(e.clientX, e.clientY));
      let finalPressure = isPen ? e.pressure : 1;
      if (isPen) {
        switch (Settings.penPressureCurve) {
          case "fixed":
            finalPressure = 1;
            break;
          case "linear":
            finalPressure = e.pressure;
            break;
          case "sqrt":
            finalPressure = Math.sqrt(e.pressure);
            break;
          case "cbrt":
            finalPressure = Math.cbrt(e.pressure);
            break;
          case "quadratic":
            finalPressure = Math.pow(e.pressure, 2);
            break;
          case "cubic":
            finalPressure = Math.pow(e.pressure, 3);
            break;
        }
      }
      this.currentSegments.push(new PenStrokeSegment(worldLocation, finalPressure));
    }
    // 用户正在绘制时不断刷新防抖计时器，松开笔静止后才触发 OCR
    this.triggerOCR();
  };

  public mouseup = (event: MouseEvent) => {
    if (!this._isUsing) return;
    if (!(event.button === 0 && Settings.mouseLeftMode === "draw")) {
      return;
    }
    // // 计算总长度
    // const length = this.currentSegments.reduce((sum, seg, index) => {
    //   if (index === 0) return 0;
    //   return sum + seg.location.distance(this.currentSegments[index - 1].location);
    // }, 0);
    // toast(`涂鸦长度: ${length}`);
    // // 计算笔迹外接矩形的对角线长度
    // const first = this.currentSegments[0].location;
    // const last = this.currentSegments[this.currentSegments.length - 1].location;
    // const diagonal = first.distance(last);
    // toast(`涂鸦对角线长度: ${diagonal}`);
    if (this.currentSegments.length <= 2) {
      toast.warning("涂鸦太短了，触发点点儿上色功能");
      // 涂鸦太短，认为是点上色节点
      const releaseWorldLocation = this.project.renderer.transformView2World(new Vector(event.clientX, event.clientY));
      const entity = this.project.stageManager.findEntityByLocation(releaseWorldLocation);
      if (entity) {
        if (entity instanceof TextNode) {
          if (this.project.controller.pressingKeySet.has("shift")) {
            const entityColor = entity.color.clone();
            entity.color = mixColors(entityColor, this.getCurrentStrokeColor().clone(), 0.1);
          } else {
            entity.color = this.getCurrentStrokeColor().clone();
          }
        }
      }
      this.releaseMouseAndClear();
      return;
    }
    // 正常的划过一段距离
    // 生成笔触
    if (this.project.controller.pressingKeySet.has("shift")) {
      // 直线
      const from = this.currentSegments[0].location.clone();
      const to = this.currentSegments[this.currentSegments.length - 1].location.clone();

      if (this.project.controller.pressingKeySet.has(isMac ? "meta" : "control")) {
        // 垂直于坐标轴的直线
        const dy = Math.abs(to.y - from.y);
        const dx = Math.abs(to.x - from.x);
        if (dy > dx) {
          // 垂直
          to.x = from.x;
        } else {
          // 水平
          to.y = from.y;
        }
      }
      const startX = from.x;
      const startY = from.y;
      const endX = to.x;
      const endY = to.y;

      const stroke = new PenStroke(this.project, {
        segments: [
          new PenStrokeSegment(new Vector(startX, startY), 1),
          new PenStrokeSegment(new Vector(endX, endY), 1),
        ],
        color: this.getCurrentStrokeColor(),
      });
      this.project.stageManager.add(stroke);
    } else {
      // 普通笔迹
      const stroke = new PenStroke(this.project, {
        segments: this.currentSegments,
        color: this.getCurrentStrokeColor(),
      });
      this.project.stageManager.add(stroke);
      this.pendingOCRStrokes.push(stroke);
      this.triggerOCR();
    }
    this.project.historyManager.recordStep();

    this.releaseMouseAndClear();
  };

  /**
   * 在 debounce 窗口（1s）后将累积的笔迹合并成一张图片，调用 OCR 后替换为 TextNode
   */
  private triggerOCR = debounce(async () => {
    if (!Settings.enableOCR) return;

    const strokes = this.pendingOCRStrokes;
    this.pendingOCRStrokes = [];

    if (strokes.length === 0) return;

    // 收集所有 segment
    const allSegments: PenStrokeSegment[] = [];
    for (const stroke of strokes) {
      allSegments.push(...stroke.segments);
    }
    if (allSegments.length < 2) return;

    // 计算所有 segment 的包围盒
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const seg of allSegments) {
      if (seg.location.x < minX) minX = seg.location.x;
      if (seg.location.y < minY) minY = seg.location.y;
      if (seg.location.x > maxX) maxX = seg.location.x;
      if (seg.location.y > maxY) maxY = seg.location.y;
    }

    const padding = 30;
    const imageWidth = maxX - minX + padding * 2;
    const imageHeight = maxY - minY + padding * 2;

    // 创建离屏 canvas，白底黑字绘制笔迹
    const canvas = document.createElement("canvas");
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, imageWidth, imageHeight);
    ctx.strokeStyle = "black";
    ctx.lineJoin = "round";

    for (const stroke of strokes) {
      const segs = stroke.segments;
      if (segs.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(segs[0].location.x - minX + padding, segs[0].location.y - minY + padding);

      for (let i = 1; i < segs.length - 1; i++) {
        const curr = segs[i].location;
        const next = segs[i + 1].location;
        const midX = (curr.x + next.x) / 2 - minX + padding;
        const midY = (curr.y + next.y) / 2 - minY + padding;

        ctx.lineWidth = segs[i].pressure * 5;
        ctx.quadraticCurveTo(curr.x - minX + padding, curr.y - minY + padding, midX, midY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(midX, midY);
      }

      // 最后一个点
      const lastIndex = segs.length - 1;
      ctx.lineWidth = segs[lastIndex - 1].pressure * 5;
      ctx.lineTo(segs[lastIndex].location.x - minX + padding, segs[lastIndex].location.y - minY + padding);
      ctx.stroke();
    }

    // Web 模式无法 OCR
    if (isWeb) return;

    // 惰性检查 OCR 模型是否存在
    if (this._ocrModelExists === null) {
      try {
        this._ocrModelExists = await invoke<boolean>("paddleocr_vl_1_6_model_exists");
      } catch {
        this._ocrModelExists = false;
      }
    }
    if (!this._ocrModelExists) return;

    // canvas → blob → Uint8Array
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
    if (!blob) {
      toast.error("OCR 图片创建失败");
      return;
    }
    const uint8Array = new Uint8Array(await blob.arrayBuffer());

    // 写入临时目录
    const dir = await tempDir();
    const fileName = `${crypto.randomUUID()}.png`;
    const filePath = await join(dir, fileName);
    await writeFile(filePath, uint8Array);

    try {
      // 调用 Rust OCR，使用 toast.promise 展示 loading/success/error 状态
      const text = await toast
        .promise(invoke<string>("paddleocr_vl_1_6_generate", { imagePath: filePath }), {
          loading: "正在 OCR 识别...",
          error: (e) => `OCR 识别失败：${e}`,
        })
        .unwrap();

      // 删除所有原始笔迹
      for (const s of strokes) {
        this.project.stageManager.delete(s);
      }

      // 在笔迹中心位置创建节点
      const center = new Vector((minX + maxX) / 2, (minY + maxY) / 2);

      // 检查是否包含 LaTeX 格式（$$\\n...\\n$$）
      const latexMatch = /^\$\$\n([\s\S]*?)\n\$\$$/.exec(text);
      if (latexMatch) {
        const latexSource = latexMatch[1].trim();
        const latexNode = new LatexNode(this.project, {
          latexSource,
          fontScaleLevel: 0,
          collisionBox: new CollisionBox([new Rectangle(center, Vector.getZero())]),
        });
        this.project.stageManager.add(latexNode);
      } else {
        const textNode = new TextNode(this.project, {
          text,
          collisionBox: new CollisionBox([new Rectangle(center, Vector.getZero())]),
        });
        this.project.stageManager.add(textNode);
      }
      this.project.historyManager.recordStep();
    } catch {
      // toast.promise 已展示错误信息
    }
  }, 1000);

  private releaseMouseAndClear() {
    // 清理
    this.currentSegments = [];
    this._isUsing = false;
    this.isDrawingLine = false;
  }

  public mouseMoveOutWindowForcedShutdown(_outsideLocation: Vector) {
    super.mouseMoveOutWindowForcedShutdown(_outsideLocation);
    if (this._isUsing) {
      this.releaseMouseAndClear();
    }
  }

  public mousewheel: (event: WheelEvent) => void = (event: WheelEvent) => {
    if (!this.project.controller.pressingKeySet.has("shift")) {
      return;
    }
    if (Settings.mouseLeftMode !== "draw") {
      // 涂鸦模式下才能看到量角器，或者转动量角器
      return;
    }
    if (event.deltaY > 0) {
      this.project.drawingControllerRenderer.rotateUpAngle();
    } else {
      this.project.drawingControllerRenderer.rotateDownAngle();
    }
  };

  public getCurrentStrokeColor() {
    if (Settings.autoFillPenStrokeColorEnable) {
      return new Color(...Settings.autoFillPenStrokeColor);
    } else {
      return Color.Transparent;
    }
  }

  public changeCurrentStrokeColorAlpha(dAlpha: number) {
    if (Settings.autoFillPenStrokeColorEnable) {
      const newAlpha = Math.max(Math.min(new Color(...Settings.autoFillPenStrokeColor).a + dAlpha, 1), 0.01);
      Settings.autoFillPenStrokeColor = new Color(...Settings.autoFillPenStrokeColor).toNewAlpha(newAlpha).toArray();
    }
  }
}
