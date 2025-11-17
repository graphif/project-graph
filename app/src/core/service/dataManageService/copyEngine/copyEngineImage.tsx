import { Project } from "@/core/Project";
import { isWindows } from "@/utils/platform";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { readImage } from "@tauri-apps/plugin-clipboard-manager";
import { MouseLocation } from "../../controlService/MouseLocation";
import { toast } from "sonner";
import { Telemetry } from "../../Telemetry";

/**
 * 图片复制粘贴引擎
 */
export class CopyEngineImage {
  constructor(private project: Project) {}

  public async processClipboardImage() {
    try {
      await this.processImageStandard();
    } catch (error) {
      console.error("标准图片处理失败，尝试Windows兼容模式:", error);
      if (isWindows) {
        try {
          await this.processImageWindowsCompat();
        } catch (error) {
          console.error("Windows兼容模式粘贴图片处理失败:", error);
          toast.error("Windows兼容模式粘贴图片处理失败，请关闭文件再打开重试、或重启软件");
          Telemetry.event("粘贴图片处理失败（Windows兼容模式）", String(error));
        }
      } else {
        toast.error("粘贴图片失败，请关闭文件再打开重试、或重启软件");
        Telemetry.event("粘贴图片处理失败（非Windows）", String(error));
      }
    }
  }

  private async processImageStandard() {
    // https://github.com/HuLaSpark/HuLa/blob/fe37c246777cde3325555ed2ba2fcf860888a4a8/src/utils/ImageUtils.ts#L121
    const image = await readImage();
    console.log("读取到剪贴板图片:", image);

    const imageData = await image.rgba();
    const { width, height } = await image.size();

    console.log("图片信息:", { width, height, dataLength: imageData.length });

    if (width === 0 || height === 0) {
      console.warn("图片尺寸为0，无法处理");
      return;
    }

    // 调试：分析原始数据
    this.debugImageData(imageData);

    // 创建canvas并处理图片数据
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    // 处理图片数据格式
    let processedData = this.ensureImageDataFormat(imageData, width, height);

    // 处理图片数据格式，修复颜色通道顺序
    processedData = this.fixImageData(processedData);

    console.log("处理后的数据长度:", processedData.length);

    // 检查数据是否为空
    const isEmpty = processedData.every((byte) => byte === 0);
    if (isEmpty) {
      console.warn("图片数据为空，可能是透明图片或数据格式问题");
    }

    // 创建ImageData并绘制到canvas
    const canvasImageData = new ImageData(Uint8ClampedArray.from(processedData), width, height);
    ctx.putImageData(canvasImageData, 0, 0);

    // 验证canvas内容
    this.validateCanvasContent(ctx, width, height);

    // 创建blob
    const blob = await this.createBlobFromCanvas(canvas);

    this.copyEnginePasteImage(blob);
  }

  async copyEnginePasteImage(item: Blob) {
    const attachmentId = this.project.addAttachment(item);

    const imageNode = new ImageNode(this.project, {
      attachmentId,
      collisionBox: new CollisionBox([
        new Rectangle(this.project.renderer.transformView2World(MouseLocation.vector()), new Vector(300, 150)),
      ]),
    });
    this.project.stageManager.add(imageNode);
    // 图片的更新碰撞箱是 异步的，先不移动了。
    // imageNode.move(
    //   new Vector(-imageNode.collisionBox.getRectangle().width / 2, -imageNode.collisionBox.getRectangle().height / 2),
    // );
  }

  private debugImageData(imageData: any): void {
    if (!(imageData instanceof Uint8Array) && !(imageData instanceof Uint8ClampedArray)) {
      console.warn("未知数据类型:", imageData.constructor.name);
      return;
    }

    const data = new Uint8Array(imageData);

    // 检查数据分布
    let minR = 255,
      maxR = 0,
      minG = 255,
      maxG = 0,
      minB = 255,
      maxB = 0,
      minA = 255,
      maxA = 0;
    let nonZeroPixels = 0;
    let fullyTransparentPixels = 0;
    let fullyOpaquePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minG = Math.min(minG, g);
      maxG = Math.max(maxG, g);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
      minA = Math.min(minA, a);
      maxA = Math.max(maxA, a);

      if (r > 0 || g > 0 || b > 0 || a > 0) {
        nonZeroPixels++;
      }

      if (a === 0) {
        fullyTransparentPixels++;
      } else if (a === 255) {
        fullyOpaquePixels++;
      }
    }

    console.log("图片数据详细分析:", {
      totalPixels: data.length / 4,
      nonZeroPixels,
      fullyTransparentPixels,
      fullyOpaquePixels,
      colorRange: {
        red: { min: minR, max: maxR },
        green: { min: minG, max: maxG },
        blue: { min: minB, max: maxB },
        alpha: { min: minA, max: maxA },
      },
      hasVisibleContent: nonZeroPixels > 0 && maxA > 0,
    });

    // 保存前几个像素作为样本
    const samplePixels = [];
    for (let i = 0; i < Math.min(10, data.length / 4); i++) {
      const offset = i * 4;
      samplePixels.push({
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
        a: data[offset + 3],
      });
    }
    console.log("前10个像素样本:", samplePixels);
  }

  /**
   * 修复图片数据格式，处理颜色通道顺序问题
   */
  private fixImageData(data: Uint8ClampedArray): Uint8ClampedArray {
    // 检查是否是BGRA格式
    let isBGRA = false;
    let hasContent = false;
    let allTransparent = true;
    let rSum = 0;
    let bSum = 0;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // 检查是否有内容（RGB通道）
      if (r > 0 || g > 0 || b > 0) {
        hasContent = true;
      }

      // 检查是否所有alpha都为0
      if (a > 0) {
        allTransparent = false;
      }

      // 统计非透明像素的R和B值，用于判断是否为BGRA
      if (a > 128) {
        rSum += r;
        bSum += b;
        pixelCount++;
      }
    }

    // 改进的BGRA检测：如果平均B值显著高于平均R值，则认为是BGRA
    if (pixelCount > 0) {
      const avgR = rSum / pixelCount;
      const avgB = bSum / pixelCount;
      // 如果B平均值是R的1.5倍以上，判断为BGRA
      isBGRA = avgB > avgR * 1.5 && avgB > 50;
    }

    console.log("数据格式检测:", { isBGRA, hasContent, allTransparent });

    const fixedData = new Uint8ClampedArray(data);

    // 1. 处理BGRA转RGBA
    if (isBGRA) {
      console.log("检测到BGRA格式，转换为RGBA");
      for (let i = 0; i < fixedData.length; i += 4) {
        // 交换R和B通道
        const r = fixedData[i];
        const b = fixedData[i + 2];
        fixedData[i] = b;
        fixedData[i + 2] = r;
      }
    }

    // 2. 修复：如果所有alpha为0但有RGB内容，设置alpha为255
    if (allTransparent && hasContent) {
      console.log("检测到所有alpha为0但有RGB内容，修复alpha通道");
      for (let i = 0; i < fixedData.length; i += 4) {
        const r = fixedData[i];
        const g = fixedData[i + 1];
        const b = fixedData[i + 2];

        // 如果有RGB内容，设置alpha为255（完全不透明）
        if (r > 0 || g > 0 || b > 0) {
          fixedData[i + 3] = 255;
        }
      }
    }

    return fixedData;
  }

  private async processImageWindowsCompat() {
    // Windows特定的兼容处理
    const image = await readImage();
    console.log("Windows兼容模式 - 读取到剪贴板图片:", image);

    const imageData = await image.rgba();
    const { width, height } = await image.size();

    console.log("Windows兼容模式 - 图片信息:", { width, height, dataLength: imageData.length });

    if (width === 0 || height === 0) {
      console.warn("Windows兼容模式 - 图片尺寸为0，无法处理");
      return;
    }

    // 使用更保守的数据处理方式
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 强制转换数据格式
    let processedData: Uint8ClampedArray;
    try {
      processedData = new Uint8ClampedArray(imageData);
    } catch (e) {
      console.warn("Windows兼容模式 - 数据转换失败，使用空数据填充", e);
      processedData = new Uint8ClampedArray(width * height * 4);
    }

    // 确保数据长度正确
    const expectedLength = width * height * 4;
    if (processedData.length !== expectedLength) {
      console.warn(`Windows兼容模式 - 修复数据长度: 期望 ${expectedLength}, 实际 ${processedData.length}`);
      const fixedData = new Uint8ClampedArray(expectedLength);
      fixedData.set(processedData.slice(0, Math.min(processedData.length, expectedLength)));
      processedData = fixedData;
    }

    // 处理图片数据格式，修复颜色通道顺序
    processedData = this.fixImageData(processedData);

    // 检查并修复透明数据
    const hasNonTransparentPixels = processedData.some(
      (byte, index) => index % 4 === 3 && byte > 0, // 检查alpha通道
    );

    if (!hasNonTransparentPixels) {
      console.warn("Windows兼容模式 - 所有像素都是透明的，设置默认不透明");
      // 设置所有alpha通道为不透明
      for (let i = 3; i < processedData.length; i += 4) {
        processedData[i] = 255;
      }
    }

    const canvasImageData = new ImageData(Uint8ClampedArray.from(processedData), width, height);
    ctx.putImageData(canvasImageData, 0, 0);

    const blob = await this.createBlobFromCanvas(canvas);

    this.copyEnginePasteImage(blob);
  }

  private ensureImageDataFormat(data: any, width: number, height: number): Uint8ClampedArray {
    const expectedLength = width * height * 4;

    if (data instanceof Uint8ClampedArray) {
      // 检查长度是否匹配
      if (data.length === expectedLength) {
        return data;
      } else {
        console.warn(`数据长度不匹配: ${data.length} vs ${expectedLength}`);
        // 尝试修复长度
        const fixedData = new Uint8ClampedArray(expectedLength);
        fixedData.set(data.slice(0, Math.min(data.length, expectedLength)));
        return fixedData;
      }
    } else if (data instanceof Uint8Array) {
      // 转换为Uint8ClampedArray
      return new Uint8ClampedArray(data);
    } else if (data instanceof ArrayBuffer) {
      // 处理ArrayBuffer
      return new Uint8ClampedArray(data);
    } else {
      console.warn("未知数据类型，尝试转换:", data.constructor.name);
      return new Uint8ClampedArray(data);
    }
  }

  private validateCanvasContent(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const validationData = ctx.getImageData(0, 0, width, height);
    const data = validationData.data;

    let nonTransparentPixels = 0;
    let nonBlackPixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 0) {
        nonTransparentPixels++;
      }

      if (r > 0 || g > 0 || b > 0) {
        nonBlackPixels++;
      }
    }

    const transparencyRatio = nonTransparentPixels / totalPixels;
    const colorRatio = nonBlackPixels / totalPixels;

    console.log("图片内容验证:", {
      totalPixels,
      nonTransparentPixels,
      nonBlackPixels,
      transparencyRatio: Math.round(transparencyRatio * 100) + "%",
      colorRatio: Math.round(colorRatio * 100) + "%",
      isEmpty: transparencyRatio < 0.01 && colorRatio < 0.01,
    });

    if (transparencyRatio < 0.01 && colorRatio < 0.01) {
      console.warn("图片内容为空，可能是透明图片");
    } else if (transparencyRatio < 0.1) {
      console.log("图片大部分区域透明，但有内容");
    } else {
      console.log("图片内容正常");
    }
  }

  private async createBlobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
    // 在创建blob之前，先验证canvas内容
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 保存canvas内容用于调试
    const dataURL = canvas.toDataURL("image/png");
    console.log("Canvas数据URL预览:", dataURL.substring(0, 100) + "...");

    // 检查是否有实际内容
    let hasRealContent = false;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      if (a > 0 && (r > 0 || g > 0 || b > 0)) {
        hasRealContent = true;
        break;
      }
    }

    console.log("Canvas内容检查结果:", { hasRealContent, width: canvas.width, height: canvas.height });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("canvas.toBlob返回null");
          reject(new Error("canvas.toBlob返回null"));
        } else {
          console.log("成功创建blob:", {
            type: blob.type,
            size: blob.size,
            hasContent: blob.size > 0,
            hasRealContent,
          });

          // 如果blob有内容但看起来是空的，可能有问题
          if (blob.size > 0 && !hasRealContent) {
            console.warn("警告：创建了非空blob但canvas内容看起来为空");
          }

          resolve(blob);
        }
      }, "image/png");
    });
  }
}
