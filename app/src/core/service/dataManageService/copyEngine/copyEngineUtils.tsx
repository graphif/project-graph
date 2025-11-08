import { SetFunctions } from "@/core/algorithm/setFunctions";
import { Project } from "@/core/Project";
import { ConnectableAssociation } from "@/core/stage/stageObject/abstract/Association";
import { Entity } from "@/core/stage/stageObject/abstract/StageEntity";
import { StageObject } from "@/core/stage/stageObject/abstract/StageObject";
import { Edge } from "@/core/stage/stageObject/association/Edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stageObject/association/MutiTargetUndirectedEdge";
import { Section } from "@/core/stage/stageObject/entity/Section";

/**
 *
 */
export namespace CopyEngineUtils {
  /**
   * 根据一部分物体，获取所有相关的实体
   * 可以用于选中复制的时候
   */
  export function getAllStageObjectFromEntities(project: Project, entities: Entity[]): StageObject[] {
    //
    if (entities.length === 0) {
      return [];
    }
    const selectedUUIDs = new Set(entities.map((it) => it.uuid));
    const result: StageObject[] = [...entities];
    const isHaveSection = entities.some((it) => it instanceof Section);
    if (isHaveSection) {
      // 如果有框，则获取框内的实体
      const innerEntities = project.sectionMethods.getAllEntitiesInSelectedSectionsOrEntities(entities);
      // 根据 selectedUUIDs 过滤
      const filteredInnerEntities = innerEntities.filter((it) => !selectedUUIDs.has(it.uuid));
      result.push(...filteredInnerEntities);
      // 补充 selectedUUIDs
      for (const entity of filteredInnerEntities) {
        selectedUUIDs.add(entity.uuid);
      }
    }

    // O(N), N 为当前舞台对象数量
    for (const association of project.stageManager.getAssociations()) {
      if (association instanceof ConnectableAssociation) {
        if (association instanceof Edge) {
          if (selectedUUIDs.has(association.source.uuid) && selectedUUIDs.has(association.target.uuid)) {
            result.push(association);
          }
        } else if (association instanceof MultiTargetUndirectedEdge) {
          // 无向边
          const associationUUIDs = new Set(association.associationList.map((it) => it.uuid));
          if (SetFunctions.isSubset(associationUUIDs, selectedUUIDs)) {
            result.push(association);
          }
        }
      }
    }
    return result;
  }
}
