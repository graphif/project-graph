import { Entity } from "@/core/sprites/abstract/Entity";
import { StageObject } from "@/core/sprites/abstract/StageObject";
import { Color } from "@graphif/data-structures";
import { serializable } from "@graphif/serializer";

/**
 * 一切连接关系的抽象
 */
export abstract class Association extends StageObject {
  @serializable
  public members: Entity[] = [];

  /**
   * 任何关系都应该有一个颜色用来标注
   */
  public color: Color = Color.Transparent;
}
