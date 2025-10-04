import { Entity } from "@/core/sprites/abstract/Entity";

export class EntityDetailsTool {
  private entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  static from(entity: Entity): EntityDetailsTool {
    return new EntityDetailsTool(entity);
  }

  isEmpty(): boolean {
    return this.entity.details.length === 0;
  }

  isNotEmpty(): boolean {
    return this.entity.details.length > 0;
  }

  toMarkdown(): string {
    console.log(this.entity.details);
    let result = "";
    for (const p of this.entity.details) {
      if (p.type === "") {
        result += p.value;
      }
    }
    return result;
  }
}
