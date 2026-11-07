import { CircleChangeRadiusEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleChangeRadiusEffect";
import { CircleFlameEffect } from "@/core/service/feedbackService/effectEngine/concrete/CircleFlameEffect";
import { ConnectionPulseEffect } from "@/core/service/feedbackService/effectEngine/concrete/ConnectionPulseEffect";
import { EdgeCutEffect } from "@/core/service/feedbackService/effectEngine/concrete/EdgeCutEffect";
import { EntityAlignEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityAlignEffect";
import { EntityCreateFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityCreateFlashEffect";
import { EntityDashTipEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityDashTipEffect";
import { EntityJumpMoveEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityJumpMoveEffect";
import { EntityShakeEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShakeEffect";
import { EntityShrinkEffect } from "@/core/service/feedbackService/effectEngine/concrete/EntityShrinkEffect";
import { ExplodeDashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ExplodeDashEffect";
import { LineCuttingEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineCuttingEffect";
import { LineEffect } from "@/core/service/feedbackService/effectEngine/concrete/LineEffect";
import { MouseTipFeedbackEffect } from "@/core/service/feedbackService/effectEngine/concrete/MouseTipFeedbackEffect";
import { NodeMoveShadowEffect } from "@/core/service/feedbackService/effectEngine/concrete/NodeMoveShadowEffect";
import { PenStrokeDeletedEffect } from "@/core/service/feedbackService/effectEngine/concrete/PenStrokeDeletedEffect";
import { RectangleFadeEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleFadeEffect";
import { RectangleLittleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleLittleNoteEffect";
import { RectangleNoteEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteEffect";
import { RectangleNoteReversedEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleNoteReversedEffect";
import { RectanglePushInEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectanglePushInEffect";
import { RectangleRenderEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleRenderEffect";
import { RectangleSlideEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleSlideEffect";
import { RectangleSplitTwoPartEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleSplitTwoPartEffect";
import { RectangleTransformEffect } from "@/core/service/feedbackService/effectEngine/concrete/RectangleTransformEffect";
import { SparkBurstEffect } from "@/core/service/feedbackService/effectEngine/concrete/SparkBurstEffect";
import { TextRaiseEffectLocated } from "@/core/service/feedbackService/effectEngine/concrete/TextRaiseEffectLocated";
import { ViewFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewFlashEffect";
import { ViewOutlineFlashEffect } from "@/core/service/feedbackService/effectEngine/concrete/ViewOutlineFlashEffect";

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
