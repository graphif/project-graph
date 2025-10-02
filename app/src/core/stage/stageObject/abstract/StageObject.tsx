import { Project } from "@/core/Project";
import { id, serializable } from "@graphif/serializer";
import { LayoutContainer } from "@pixi/layout/components";

/**
 * 一切舞台上的东西
 */
export abstract class StageObject extends LayoutContainer {
  protected abstract readonly project: Project;
  @id
  @serializable
  public uuid: string = crypto.randomUUID();
  public selected: boolean = false;
}
