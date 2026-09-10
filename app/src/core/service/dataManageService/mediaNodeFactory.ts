import type { Project } from "@/core/Project";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { CollisionBox } from "@/core/stage/stageObject/collisionBox/collisionBox";
import { MediaNode } from "@/core/stage/stageObject/entity/MediaNode";
import { MEDIA_NODE_PLACEHOLDER_SIZE } from "@/core/stage/stageObject/entity/MediaNode";
import type { MediaKind } from "@/core/stage/stageObject/entity/MediaNode";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import type { Value } from "platejs";

export type CreateMediaNodeFromBlobOptions = {
  location: Vector;
  title?: string;
  details?: Value;
};

export function createMediaNodeFromBlob(
  project: Project,
  blob: Blob,
  mediaKind: MediaKind,
  options: CreateMediaNodeFromBlobOptions,
): MediaNode {
  const defaultSize =
    mediaKind === "audio" ? new Vector(320, 100) : new Vector(MEDIA_NODE_PLACEHOLDER_SIZE.width, MEDIA_NODE_PLACEHOLDER_SIZE.height);

  const attachmentId = project.addAttachment(blob);
  const location = options.location.clone();

  const mediaNode = new MediaNode(
    project,
    {
      attachmentId,
      mediaKind,
      title: options.title ?? "",
      collisionBox: new CollisionBox([
        new Rectangle(location, defaultSize),
      ]),
      details: options.details ?? [],
    },
    false,
  );

  project.stageManager.add(mediaNode);

  const containingSections =
    project.sectionMethods.getSectionsByInnerLocation(location);
  if (containingSections.length > 0) {
    project.stageManager.goInSection(
      [mediaNode],
      containingSections[0],
    );
    project.effects.addEffect(
      RectanglePushInEffect.sectionGoInGoOut(
        mediaNode.collisionBox.getRectangle(),
        containingSections[0].collisionBox.getRectangle(),
      ),
    );
  }

  return mediaNode;
}
