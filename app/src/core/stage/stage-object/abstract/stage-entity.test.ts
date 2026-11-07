import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/service/Settings", () => ({ Settings: { isEnableEntityCollision: true } }));
vi.mock("../tools/entityDetailsManager", () => ({ DetailsManager: class {} }));

import { Entity } from "./StageEntity";
import type { Section } from "../entity/Section";
import { Rectangle } from "@graphif/shapes";
import { Vector } from "@graphif/data-structures";

describe("entity collision separation", () => {
  it.each([
    [new Rectangle(new Vector(0, 0), new Vector(100, 100)), new Rectangle(new Vector(0, 0), new Vector(100, 100))],
    [new Rectangle(new Vector(0, 0), new Vector(100, 100)), new Rectangle(new Vector(40, 40), new Vector(20, 20))],
    [new Rectangle(new Vector(0, 0), new Vector(100, 100)), new Rectangle(new Vector(80, 10), new Vector(100, 100))],
  ])("separates overlapping rectangles without recursive zero movement", (first, second) => {
    type Collider = { collideWithOtherEntity(other: Collider): void; move(delta: Vector): void };
    const entities: Collider[] = [];
    let moves = 0;
    for (const rectangle of [first, second]) {
      const entity = Object.assign(Object.create(Entity.prototype), {
        collisionBox: { getRectangle: () => rectangle },
        move(delta: Vector) {
          expect(++moves).toBeLessThan(4);
          rectangle.location = rectangle.location.add(delta);
          for (const other of entities) if (other !== entity) entity.collideWithOtherEntity(other);
        },
      }) as Collider;
      entities.push(entity);
    }
    entities[0].collideWithOtherEntity(entities[1]);
    expect(first.isCollideWith(second)).toBe(false);
    expect(moves).toBe(1);
  });
});

describe("section locking", () => {
  it("uses current lock states through nested parents without rebuilding the stage", () => {
    const outer = Object.assign(Object.create(Entity.prototype), { parentSection: null, locked: false }) as Section;
    const inner = Object.assign(Object.create(Entity.prototype), { parentSection: outer, locked: false }) as Section;
    const child = Object.assign(Object.create(Entity.prototype), { parentSection: inner }) as Entity;
    expect(child.nearestLockedAncestorSection).toBeNull();
    outer.locked = true;
    expect(child.nearestLockedAncestorSection).toBe(outer);
    inner.locked = true;
    expect(child.nearestLockedAncestorSection).toBe(inner);
    inner.locked = false;
    expect(child.nearestLockedAncestorSection).toBe(outer);
    outer.locked = false;
    expect(child.nearestLockedAncestorSection).toBeNull();
    child.parentSection = null;
    inner.locked = true;
    expect(child.nearestLockedAncestorSection).toBeNull();
  });
});
