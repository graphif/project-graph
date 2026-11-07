import type { TextGraphFactories } from "./text-graph-codec";
import { createTextGraphCodec } from "./text-graph-codec";

type Context = { projectId: string };
type Node = { uuid: string; node: true };
type Edge = { uuid: string; edge: true };
type Point = { uuid: string; point: true };
type Section = { uuid: string; section: true };
type Image = { uuid: string; image: true };
type Media = { uuid: string; media: true };
type Url = { uuid: string; url: true };
type Svg = { uuid: string; svg: true };
type Stroke = { uuid: string; stroke: true };
type Models = {
  textNode: Node;
  lineEdge: Edge;
  connectPoint: Point;
  section: Section;
  imageNode: Image;
  mediaNode: Media;
  urlNode: Url;
  svgNode: Svg;
  penStroke: Stroke;
  referenceBlock: { uuid: string; reference: true };
  extensionEntity: { uuid: string; extension: true };
  latexNode: { uuid: string; latex: true };
  arcEdge: { uuid: string; arc: true };
  multiTargetEdge: { uuid: string; multi: true };
  syncAssociation: { uuid: string; sync: true };
  splineEdge: { uuid: string; spline: true };
};

// Checked by tsc; intentionally not invoked because these examples violate the factory contract.
export function checkTextGraphFactoryTypes(factories: TextGraphFactories<Context, Models>) {
  createTextGraphCodec({
    ...factories,
    textNode: {
      ...factories.textNode,
      // @ts-expect-error DTO text must be a string, not a number.
      encode: (node) => ({ ...factories.textNode.encode(node), text: 42 }),
    },
    lineEdge: factories.lineEdge,
  });
  const missingFactory: TextGraphFactories<Context, Models> = {
    ...factories,
    // @ts-expect-error A declared kind requires an explicit factory.
    textNode: { matches: factories.textNode.matches, encode: factories.textNode.encode },
    lineEdge: factories.lineEdge,
  };
  createTextGraphCodec(missingFactory);
  const wrongContext: TextGraphFactories<Context, Models> = {
    ...factories,
    textNode: {
      ...factories.textNode,
      // @ts-expect-error Factory context is named and typed, not an arbitrary argument.
      create: (_context: number, data) => ({ uuid: data.id, node: true }),
    },
    lineEdge: factories.lineEdge,
  };
  createTextGraphCodec({
    ...factories,
    // @ts-expect-error Section requires explicit linking after entity allocation.
    section: { matches: factories.section.matches, encode: factories.section.encode, create: factories.section.create },
  });
  createTextGraphCodec({
    ...factories,
    section: {
      ...factories.section,
      // @ts-expect-error Section children cannot be relationship objects.
      link: (section: Section, children: Edge[]) => {
        Object.assign(section, { children });
      },
    },
  });
  return wrongContext;
}
