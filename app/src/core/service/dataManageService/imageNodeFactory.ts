import type { Project } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { ImageNode } from "@/core/stage/stageObject/entity/ImageNode";
import { Section } from "@/core/stage/stageObject/entity/Section";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Value } from "platejs";

export type CreateImageNodeFromBlobOptions = {
  location: Vector;
  intrinsicSize?: { width: number; height: number };
  maxDisplaySize?: number;
  details?: Value;
  wrapInSection?: boolean;
};

export function calculateImageDisplaySize(width: number, height: number, maxDisplaySize: number) {
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("图片尺寸无效");
  }
  if (maxDisplaySize <= 0 || Number.isNaN(maxDisplaySize)) throw new Error("图片显示尺寸无效");
  const scale = Math.min(1, maxDisplaySize / Math.max(width, height));
  return { width: width * scale, height: height * scale, scale };
}

export async function createImageNodeFromBlob(
  project: Project,
  blob: Blob,
  options: CreateImageNodeFromBlobOptions,
): Promise<{ node: ImageNode; width: number; height: number }> {
  let width = options.intrinsicSize?.width;
  let height = options.intrinsicSize?.height;
  if (!width || !height) {
    const bitmap = await createImageBitmap(blob);
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  }
  const maxDisplaySize = options.maxDisplaySize ?? Number.POSITIVE_INFINITY;
  const displaySize = calculateImageDisplaySize(width, height, maxDisplaySize);
  const scale = displaySize.scale;
  const attachmentId = project.addAttachment(blob);
  const location = options.location.clone();
  const imageNode = new ImageNode(
    project,
    {
      attachmentId,
      collisionBox: new CollisionBox([new Rectangle(location, new Vector(width * scale, height * scale))]),
      details: options.details ?? [],
      scale,
    },
    false,
    (options.wrapInSection ?? Settings.wrapImageInGroup)
      ? () => {
          const section = Section.fromEntities(project, [imageNode]);
          section.text = "";
          project.stageManager.add(section);
        }
      : undefined,
  );

  project.stageManager.add(imageNode);
  const containingSections = project.sectionMethods.getSectionsByInnerLocation(location);
  if (containingSections.length > 0) {
    project.stageManager.goInSection([imageNode], containingSections[0]);
    project.effects.addEffect(
      RectanglePushInEffect.sectionGoInGoOut(
        imageNode.collisionBox.getRectangle(),
        containingSections[0].collisionBox.getRectangle(),
      ),
    );
  }

  return { node: imageNode, width, height };
}
