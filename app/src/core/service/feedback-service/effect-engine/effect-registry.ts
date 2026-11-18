import { CircleChangeRadiusEffect } from "@/core/service/feedback-service/effect-engine/concrete/circle-change-radius-effect";
import { CircleFlameEffect } from "@/core/service/feedback-service/effect-engine/concrete/circle-flame-effect";
import { ConnectionPulseEffect } from "@/core/service/feedback-service/effect-engine/concrete/connection-pulse-effect";
import { EdgeCutEffect } from "@/core/service/feedback-service/effect-engine/concrete/edge-cut-effect";
import { EntityAlignEffect } from "@/core/service/feedback-service/effect-engine/concrete/entity-align-effect";
import { EntityCreateFlashEffect } from "@/core/service/feedback-service/effect-engine/concrete/entity-create-flash-effect";
import { EntityDashTipEffect } from "@/core/service/feedback-service/effect-engine/concrete/entity-dash-tip-effect";
import { EntityJumpMoveEffect } from "@/core/service/feedback-service/effect-engine/concrete/entity-jump-move-effect";
import { EntityShakeEffect } from "@/core/service/feedback-service/effect-engine/concrete/entity-shake-effect";
import { EntityShrinkEffect } from "@/core/service/feedback-service/effect-engine/concrete/entity-shrink-effect";
import { ExplodeDashEffect } from "@/core/service/feedback-service/effect-engine/concrete/explode-dash-effect";
import { LineCuttingEffect } from "@/core/service/feedback-service/effect-engine/concrete/line-cutting-effect";
import { LineEffect } from "@/core/service/feedback-service/effect-engine/concrete/line-effect";
import { MouseTipFeedbackEffect } from "@/core/service/feedback-service/effect-engine/concrete/mouse-tip-feedback-effect";
import { NodeMoveShadowEffect } from "@/core/service/feedback-service/effect-engine/concrete/node-move-shadow-effect";
import { PenStrokeDeletedEffect } from "@/core/service/feedback-service/effect-engine/concrete/pen-stroke-deleted-effect";
import { RectangleFadeEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-fade-effect";
import { RectangleLittleNoteEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-little-note-effect";
import { RectangleNoteEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-note-effect";
import { RectangleNoteReversedEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-note-reversed-effect";
import { RectanglePushInEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-push-in-effect";
import { RectangleRenderEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-render-effect";
import { RectangleSlideEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-slide-effect";
import { RectangleSplitTwoPartEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-split-two-part-effect";
import { RectangleTransformEffect } from "@/core/service/feedback-service/effect-engine/concrete/rectangle-transform-effect";
import { SparkBurstEffect } from "@/core/service/feedback-service/effect-engine/concrete/spark-burst-effect";
import { TextRaiseEffectLocated } from "@/core/service/feedback-service/effect-engine/concrete/text-raise-effect-located";
import { ViewFlashEffect } from "@/core/service/feedback-service/effect-engine/concrete/view-flash-effect";
import { ViewOutlineFlashEffect } from "@/core/service/feedback-service/effect-engine/concrete/view-outline-flash-effect";

/**
 * 全部内置特效实现。
 *
 * 这里显式登记每个特效，设置页才能列出全部开关。
 * 新增特效时必须同时补上 `effectId`、本地化文案，并在此登记。
 */
export const registeredEffectClasses = [
  CircleChangeRadiusEffect,
  CircleFlameEffect,
  ConnectionPulseEffect,
  EdgeCutEffect,
  EntityAlignEffect,
  EntityCreateFlashEffect,
  EntityDashTipEffect,
  EntityJumpMoveEffect,
  EntityShakeEffect,
  EntityShrinkEffect,
  ExplodeDashEffect,
  LineCuttingEffect,
  LineEffect,
  MouseTipFeedbackEffect,
  NodeMoveShadowEffect,
  PenStrokeDeletedEffect,
  RectangleFadeEffect,
  RectangleLittleNoteEffect,
  RectangleNoteEffect,
  RectangleNoteReversedEffect,
  RectanglePushInEffect,
  RectangleRenderEffect,
  RectangleSlideEffect,
  RectangleSplitTwoPartEffect,
  RectangleTransformEffect,
  SparkBurstEffect,
  TextRaiseEffectLocated,
  ViewFlashEffect,
  ViewOutlineFlashEffect,
] as const;

/**
 * 全部内置特效的稳定标识。
 * 这些标识会作为用户设置的键，也是本地化文案的命名空间。
 */
export const registeredEffectIds: string[] = registeredEffectClasses.map((effectClass) => effectClass.effectId);
