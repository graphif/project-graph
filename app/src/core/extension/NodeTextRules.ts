import type { Project } from "@/core/Project";
import type { TextNode } from "@/core/stage/stageObject/entity/TextNode";
import type { Section } from "@/core/stage/stageObject/entity/Section";
import type { Color } from "@graphif/data-structures";

export interface NodeTextRuleOptions {
  enabled: boolean;
  numbering: boolean;
  frameTitles: boolean;
  questionColor: [number, number, number];
  conclusionColor: [number, number, number];
}

type Kind = "question" | "conclusion";
type Cache = { indices: Map<TextNode, number>; kinds: Map<TextNode, Kind | undefined>; updating: boolean };
let registration: { owner: string; options: NodeTextRuleOptions } | undefined;
let lastCreated = 0;
const caches = new WeakMap<Project, Cache>();
const prepared = new WeakSet<TextNode>();

export function registerNodeTextRules(owner: string, options: NodeTextRuleOptions) {
  if (registration && registration.owner !== owner) throw new Error("另一扩展已注册问题／结论规则，请先停用它");
  registration = { owner, options };
}

export function unregisterNodeTextRules(owner: string) {
  if (registration?.owner === owner) registration = undefined;
}

export function ruleKind(text: string): Kind | undefined {
  if (/^(?:✅|❌)\s/.test(text)) return;
  if (/^结论[:：]/.test(text)) return "conclusion";
  if (/[?？]$/.test(text.trimEnd())) return "question";
}

export function normalizeRuleText(text: string): string {
  return registration?.options.enabled && /^\/jl/i.test(text) ? `结论:${text.slice(3)}` : text;
}

export function ruleDisplayColor(text: string, original: Color): Color {
  const options = registration?.options;
  if (!options?.enabled) return original;
  const kind = ruleKind(text);
  const rgb = kind === "question" ? options.questionColor : kind === "conclusion" ? options.conclusionColor : undefined;
  return rgb ? new (original.constructor as typeof Color)(...rgb, 1) : original;
}

export function ruleDisplayText(project: Project, node: TextNode): string {
  if (!registration?.options.enabled || !registration.options.numbering) return node.text;
  const index = caches.get(project)?.indices.get(node);
  return index ? `${index}. ${node.text}` : node.text;
}

export function markRuleNodeCreated(node: TextNode) {
  if (!registration?.options.enabled || prepared.has(node)) return;
  lastCreated = Math.max(Date.now() * 1000, lastCreated + 1);
  node.nodeRuleCreatedAt = lastCreated;
  prepared.add(node);
}

export function ruleTextChanged(project: Project, node: TextNode) {
  if (caches.get(project)?.kinds.get(node) !== ruleKind(node.text)) refreshNodeTextRules(project, node);
}

function resize(node: TextNode) {
  const center = node.rectangle.center;
  if (node.sizeAdjust === "manual") node.forceAdjustHeightByText();
  else node.forceAdjustSizeByText();
  node.rectangle.location = center.subtract(node.rectangle.size.multiply(0.5));
  node.parentSection?.adjustLocationAndSize();
}

export function markRuleFrameTitleEdited(frame: Section) {
  if (registration?.options.enabled) frame.nodeRuleTitleAssigned = true;
}

export function refreshNodeTextRules(project: Project, skipResize?: TextNode) {
  if (!registration?.options.enabled && !caches.has(project)) return;
  const previous = caches.get(project);
  if (previous?.updating) return;
  const state: Cache = { indices: new Map(), kinds: new Map(), updating: true };
  caches.set(project, state);
  try {
    const options = registration?.options;
    const nodes = project.stageManager.getTextNodes();
    for (const node of nodes) {
      state.kinds.set(node, ruleKind(node.text));
      if (Number.isSafeInteger(node.nodeRuleCreatedAt)) lastCreated = Math.max(lastCreated, node.nodeRuleCreatedAt!);
    }
    if (options?.enabled && options.numbering) {
      const counts = { question: 0, conclusion: 0 };
      const eligible = nodes
        .filter((n) => Number.isSafeInteger(n.nodeRuleCreatedAt) && n.nodeRuleCreatedAt! > 0)
        .sort((a, b) => a.nodeRuleCreatedAt! - b.nodeRuleCreatedAt! || a.uuid.localeCompare(b.uuid));
      for (const node of eligible) {
        const kind = state.kinds.get(node);
        if (kind) state.indices.set(node, ++counts[kind]);
      }
    }
    const present = new Set(nodes);
    for (const node of new Set([...(previous?.indices.keys() ?? []), ...state.indices.keys()])) {
      if (node !== skipResize && present.has(node) && previous?.indices.get(node) !== state.indices.get(node))
        resize(node);
    }
    project.controller?.resetCountdownTimer?.();
  } finally {
    state.updating = false;
    if (!registration?.options.enabled) caches.delete(project);
  }
}

export function applyRuleFrameTitles(project: Project) {
  if (!registration?.options.enabled || !registration.options.frameTitles) return;
  const questions = project.stageManager.getTextNodes().filter((n) => ruleKind(n.text) === "question");
  for (const frame of project.stageManager.getSections()) {
    if (
      frame.nodeRuleTitleAssigned ||
      frame.locked ||
      (frame.text.trim() && !/^section(?:[_\s-]?\d+)?$/i.test(frame.text.trim()))
    )
      continue;
    const first = questions.find((node) => {
      const seen = new Set<Section>();
      let parent = node.parentSection;
      while (parent && !seen.has(parent)) {
        if (parent === frame) return true;
        seen.add(parent);
        parent = parent.parentSection;
      }
      return false;
    });
    if (first) {
      frame.rename(first.text);
      frame.nodeRuleTitleAssigned = true;
    }
  }
}

export function matchRuleQuery(query: string, text: string): boolean | undefined {
  if (!registration?.options.enabled) return;
  if (query === "/问题") return ruleKind(text) === "question";
  if (query === "/结论") return ruleKind(text) === "conclusion";
}
