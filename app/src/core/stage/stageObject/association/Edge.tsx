import { Association } from "@/core/stage/stageObject/abstract/Association";
import { serializable } from "@graphif/serializer";

type Side = "top" | "bottom" | "left" | "right" | "unknown";

/**
 * 连接两个实体的有向边
 */
export abstract class Edge extends Association {
  /**
   * 线段上的文字
   */
  public abstract text: string;

  get source() {
    return this.members[0];
  }
  get target() {
    return this.members[1];
  }

  @serializable
  public sourceSide: Side = "unknown";
  @serializable
  public targetSide: Side = "unknown";
}
