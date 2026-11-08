import type { Project } from "@/core/project";
import { TextNode } from "@/core/stage/stage-object/entity/text-node";
import { ConnectPoint } from "@/core/stage/stage-object/entity/connect-point";
import { Section } from "@/core/stage/stage-object/entity/section";
import { ImageNode } from "@/core/stage/stage-object/entity/image-node";
import { MediaNode } from "@/core/stage/stage-object/entity/media-node";
import { UrlNode } from "@/core/stage/stage-object/entity/url-node";
import { SvgNode } from "@/core/stage/stage-object/entity/svg-node";
import { PenStroke, PenStrokeSegment } from "@/core/stage/stage-object/entity/pen-stroke";
import { LineEdge } from "@/core/stage/stage-object/association/line-edge";
import { ArcEdge } from "@/core/stage/stage-object/association/arc-edge";
import { CubicCatmullRomSplineEdge } from "@/core/stage/stage-object/association/cubic-catmull-rom-spline-edge";
import { MultiTargetUndirectedEdge } from "@/core/stage/stage-object/association/muti-target-undirected-edge";
import { SyncAssociation } from "@/core/stage/stage-object/association/sync-association";
import { ReferenceBlockNode } from "@/core/stage/stage-object/entity/reference-block-node";
import { ExtensionEntity } from "@/core/stage/stage-object/entity/extension-entity";
import { LatexNode } from "@/core/stage/stage-object/entity/latex-node";
import { CollisionBox } from "@/core/stage/stage-object/collision-box/collision-box";
import { Color, Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { assertBoundedData, extensionEntityDataSchema, textNodeDataSchema } from "@/core/persistence/text-graph";
import { createTextGraphCodec } from "@/core/persistence/text-graph-codec";

const vectorData = ({ x, y }: Vector) => ({ x, y });
const colorData = ({ r, g, b, a }: Color) => ({ r, g, b, a });
const createVector = ({ x, y }: { x: number; y: number }) => new Vector(x, y);
const createColor = ({ r, g, b, a }: { r: number; g: number; b: number; a: number }) => new Color(r, g, b, a);

function detailsData(details: unknown) {
  assertBoundedData(details);
  return textNodeDataSchema.shape.details.parse(details);
}

export function createStageTextGraphCodec() {
  return createTextGraphCodec({
    textNode: {
      matches: (model): model is TextNode => model instanceof TextNode,
      encode: (model: TextNode) => ({
        kind: "text-node",
        id: model.uuid,
        text: model.text,
        rectangle: { location: vectorData(model.rectangle.location), size: vectorData(model.rectangle.size) },
        details: detailsData(model.details),
        color: colorData(model.color),
        sizeAdjust: textNodeDataSchema.shape.sizeAdjust.parse(model.sizeAdjust),
        fontScaleLevel: model.fontScaleLevel,
        fontFamily: model.fontFamily,
        fontWeight: model.fontWeight,
        borderStyle: model.borderStyle,
      }),
      create: (project: Project, data) =>
        new TextNode(
          project,
          {
            uuid: data.id,
            text: data.text,
            collisionBox: new CollisionBox([
              new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
            ]),
            details: data.details,
            color: createColor(data.color),
            sizeAdjust: data.sizeAdjust,
            fontScaleLevel: data.fontScaleLevel,
            fontFamily: data.fontFamily,
            fontWeight: data.fontWeight,
            borderStyle: data.borderStyle,
          },
          false,
          { deferGeometry: true },
        ),
    },
    connectPoint: {
      matches: (model): model is ConnectPoint => model instanceof ConnectPoint,
      encode: (model: ConnectPoint) => ({
        kind: "connect-point",
        id: model.uuid,
        rectangle: {
          location: vectorData(model.collisionBox.getRectangle().location),
          size: vectorData(model.collisionBox.getRectangle().size),
        },
        details: detailsData(model.details),
      }),
      create: (project: Project, data) =>
        new ConnectPoint(project, {
          uuid: data.id,
          collisionBox: new CollisionBox([
            new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
          ]),
          details: data.details,
        }),
    },
    imageNode: {
      matches: (model): model is ImageNode => model instanceof ImageNode,
      encode: (model: ImageNode) => ({
        kind: "image-node",
        id: model.uuid,
        rectangle: { location: vectorData(model.rectangle.location), size: vectorData(model.rectangle.size) },
        details: detailsData(model.details),
        attachmentId: model.attachmentId,
        scale: model.scale,
        isBackground: model.isBackground,
      }),
      create: (project: Project, data) =>
        new ImageNode(
          project,
          {
            uuid: data.id,
            collisionBox: new CollisionBox([
              new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
            ]),
            details: data.details,
            attachmentId: data.attachmentId,
            scale: data.scale,
            isBackground: data.isBackground,
          },
          false,
          undefined,
          { deferResources: true },
        ),
    },
    mediaNode: {
      matches: (model): model is MediaNode => model instanceof MediaNode,
      encode: (model: MediaNode) => ({
        kind: "media-node",
        id: model.uuid,
        rectangle: { location: vectorData(model.rectangle.location), size: vectorData(model.rectangle.size) },
        details: detailsData(model.details),
        attachmentId: model.attachmentId,
        mediaKind: model.mediaKind,
        title: model.title,
      }),
      create: (project: Project, data) =>
        new MediaNode(
          project,
          {
            uuid: data.id,
            collisionBox: new CollisionBox([
              new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
            ]),
            details: data.details,
            attachmentId: data.attachmentId,
            mediaKind: data.mediaKind,
            title: data.title,
          },
          false,
          undefined,
          { deferResources: true },
        ),
    },
    urlNode: {
      matches: (model): model is UrlNode => model instanceof UrlNode,
      encode: (model: UrlNode) => ({
        kind: "url-node",
        id: model.uuid,
        rectangle: { location: vectorData(model.rectangle.location), size: vectorData(model.rectangle.size) },
        details: detailsData(model.details),
        title: model.title,
        url: model.url,
        color: colorData(model.color),
      }),
      create: (project: Project, data) =>
        new UrlNode(project, {
          uuid: data.id,
          title: data.title,
          url: data.url,
          details: data.details,
          collisionBox: new CollisionBox([
            new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
          ]),
          color: createColor(data.color),
        }),
    },
    svgNode: {
      matches: (model): model is SvgNode => model instanceof SvgNode,
      encode: (model: SvgNode) => ({
        kind: "svg-node",
        id: model.uuid,
        rectangle: {
          location: vectorData(model.collisionBox.getRectangle().location),
          size: vectorData(model.collisionBox.getRectangle().size),
        },
        details: detailsData(model.details),
        attachmentId: model.attachmentId,
        scale: model.scale,
        color: colorData(model.color),
      }),
      create: (project: Project, data) =>
        new SvgNode(
          project,
          {
            uuid: data.id,
            details: data.details,
            attachmentId: data.attachmentId,
            collisionBox: new CollisionBox([
              new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
            ]),
            scale: data.scale,
            color: createColor(data.color),
          },
          { deferResources: true },
        ),
    },
    penStroke: {
      matches: (model): model is PenStroke => model instanceof PenStroke,
      encode: (model: PenStroke) => ({
        kind: "pen-stroke",
        id: model.uuid,
        segments: model.segments.map(({ location, pressure }) => ({ location: vectorData(location), pressure })),
        color: colorData(model.color),
        details: detailsData(model.details),
      }),
      create: (project: Project, data) =>
        new PenStroke(project, {
          uuid: data.id,
          segments: data.segments.map(
            ({ location, pressure }) => new PenStrokeSegment(createVector(location), pressure),
          ),
          color: createColor(data.color),
          details: data.details,
        }),
    },
    referenceBlock: {
      matches: (model): model is ReferenceBlockNode => model instanceof ReferenceBlockNode,
      encode: (model: ReferenceBlockNode) => ({
        kind: "reference-block",
        id: model.uuid,
        rectangle: { location: vectorData(model.rectangle.location), size: vectorData(model.rectangle.size) },
        details: detailsData(model.details),
        fileName: model.fileName,
        sectionName: model.sectionName,
        attachmentId: model.attachmentId,
        scale: model.scale,
      }),
      create: (project: Project, data) =>
        new ReferenceBlockNode(
          project,
          {
            uuid: data.id,
            fileName: data.fileName,
            sectionName: data.sectionName,
            attachmentId: data.attachmentId,
            scale: data.scale,
            details: data.details,
            collisionBox: new CollisionBox([
              new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
            ]),
          },
          false,
          { deferResources: true },
        ),
    },
    extensionEntity: {
      matches: (model): model is ExtensionEntity => model instanceof ExtensionEntity,
      encode: (model: ExtensionEntity) => {
        assertBoundedData(model.customData);
        return {
          kind: "extension-entity",
          id: model.uuid,
          rectangle: { location: vectorData(model.rectangle.location), size: vectorData(model.rectangle.size) },
          details: detailsData(model.details),
          extensionId: model.extensionId,
          typeName: model.typeName,
          customData: extensionEntityDataSchema.shape.customData.parse(model.customData),
        };
      },
      create: (project: Project, data) =>
        new ExtensionEntity(project, {
          uuid: data.id,
          extensionId: data.extensionId,
          typeName: data.typeName,
          customData: data.customData,
          details: data.details,
          collisionBox: new CollisionBox([
            new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
          ]),
        }),
    },
    latexNode: {
      matches: (model): model is LatexNode => model instanceof LatexNode,
      encode: (model: LatexNode) => ({
        kind: "latex-node",
        id: model.uuid,
        rectangle: { location: vectorData(model.rectangle.location), size: vectorData(model.rectangle.size) },
        details: detailsData(model.details),
        latexSource: model.latexSource,
        color: colorData(model.color),
        fontScaleLevel: model.fontScaleLevel,
      }),
      create: (project: Project, data) =>
        new LatexNode(
          project,
          {
            uuid: data.id,
            details: data.details,
            latexSource: data.latexSource,
            color: createColor(data.color),
            fontScaleLevel: data.fontScaleLevel,
            collisionBox: new CollisionBox([
              new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
            ]),
          },
          { deferResources: true },
        ),
    },
    section: {
      matches: (model): model is Section => model instanceof Section,
      encode: (model: Section) => ({
        kind: "section",
        id: model.uuid,
        rectangle: {
          location: vectorData(model.expandedRectangle.location),
          size: vectorData(model.expandedRectangle.size),
        },
        childIds: model.children.map(({ uuid }) => uuid),
        text: model.text,
        color: colorData(model.color),
        details: detailsData(model.details),
        isCollapsed: model.isCollapsed,
        locked: model.locked,
        borderStyle: model.borderStyle,
      }),
      create: (project: Project, data) =>
        new Section(
          project,
          {
            uuid: data.id,
            text: data.text,
            collisionBox: new CollisionBox([
              new Rectangle(createVector(data.rectangle.location), createVector(data.rectangle.size)),
            ]),
            color: createColor(data.color),
            details: data.details,
            isCollapsed: data.isCollapsed,
            locked: data.locked,
            borderStyle: data.borderStyle,
          },
          false,
          { deferGeometry: true },
        ),
      link: (model: Section, children) => {
        model.children = children;
      },
    },
    lineEdge: {
      matches: (model): model is LineEdge => model instanceof LineEdge,
      encode: (model: LineEdge) => ({
        kind: "line-edge",
        id: model.uuid,
        sourceId: model.source.uuid,
        targetId: model.target.uuid,
        text: model.text,
        color: colorData(model.color),
        sourceRectangleRate: vectorData(model.sourceRectangleRate),
        targetRectangleRate: vectorData(model.targetRectangleRate),
        lineType: model.lineType,
        arrowType: model.arrowType,
      }),
      create: (project: Project, data, { source, target }) =>
        new LineEdge(project, {
          uuid: data.id,
          associationList: [source, target],
          text: data.text,
          color: createColor(data.color),
          sourceRectangleRate: createVector(data.sourceRectangleRate),
          targetRectangleRate: createVector(data.targetRectangleRate),
          lineType: data.lineType,
          arrowType: data.arrowType,
        }),
    },
    arcEdge: {
      matches: (model): model is ArcEdge => model instanceof ArcEdge,
      encode: (model: ArcEdge) => ({
        kind: "arc-edge",
        id: model.uuid,
        sourceId: model.source.uuid,
        targetId: model.target.uuid,
        text: model.text,
        color: colorData(model.color),
        sourceRectangleRate: vectorData(model.sourceRectangleRate),
        targetRectangleRate: vectorData(model.targetRectangleRate),
        lineType: model.lineType,
        arrowType: model.arrowType,
        offset: model.offset,
        textPosition: model.textPosition,
      }),
      create: (project: Project, data, { source, target }) =>
        new ArcEdge(project, {
          uuid: data.id,
          associationList: [source, target],
          text: data.text,
          color: createColor(data.color),
          sourceRectangleRate: createVector(data.sourceRectangleRate),
          targetRectangleRate: createVector(data.targetRectangleRate),
          lineType: data.lineType,
          arrowType: data.arrowType,
          offset: data.offset,
          textPosition: data.textPosition,
        }),
    },
    splineEdge: {
      matches: (model): model is CubicCatmullRomSplineEdge => model instanceof CubicCatmullRomSplineEdge,
      encode: (model: CubicCatmullRomSplineEdge) => ({
        kind: "spline-edge",
        id: model.uuid,
        sourceId: model.source.uuid,
        targetId: model.target.uuid,
        text: model.text,
        color: colorData(model.color),
        sourceRectangleRate: vectorData(model.sourceRectangleRate),
        targetRectangleRate: vectorData(model.targetRectangleRate),
        alpha: model.alpha,
        tension: model.tension,
        controlPoints: model.getControlPoints().map(vectorData),
      }),
      create: (project: Project, data, endpoints) =>
        new CubicCatmullRomSplineEdge(
          project,
          {
            type: "core:cublic_catmull_rom_spline_edge",
            uuid: data.id,
            source: data.sourceId,
            target: data.targetId,
            text: data.text,
            color: [data.color.r, data.color.g, data.color.b, data.color.a],
            sourceRectRate: [data.sourceRectangleRate.x, data.sourceRectangleRate.y],
            targetRectRate: [data.targetRectangleRate.x, data.targetRectangleRate.y],
            alpha: data.alpha,
            tension: data.tension,
            controlPoints: data.controlPoints.map(({ x, y }) => [x, y]),
          },
          false,
          endpoints,
        ),
    },
    multiTargetEdge: {
      matches: (model): model is MultiTargetUndirectedEdge => model instanceof MultiTargetUndirectedEdge,
      encode: (model: MultiTargetUndirectedEdge) => ({
        kind: "multi-target-edge",
        id: model.uuid,
        memberIds: model.associationList.map(({ uuid }) => uuid),
        text: model.text,
        color: colorData(model.color),
        rectRates: model.rectRates.map(vectorData),
        centerRate: vectorData(model.centerRate),
        arrow: model.arrow,
        arrowType: model.arrowType,
        renderType: model.renderType,
        lineType: model.lineType,
        padding: model.padding,
      }),
      create: (project: Project, data, { members }) =>
        new MultiTargetUndirectedEdge(project, {
          uuid: data.id,
          associationList: members,
          text: data.text,
          color: createColor(data.color),
          rectRates: data.rectRates.map(createVector),
          centerRate: createVector(data.centerRate),
          arrow: data.arrow,
          arrowType: data.arrowType,
          renderType: data.renderType,
          lineType: data.lineType,
          padding: data.padding,
        }),
    },
    syncAssociation: {
      matches: (model): model is SyncAssociation => model instanceof SyncAssociation,
      encode: (model: SyncAssociation) => ({
        kind: "sync-association",
        id: model.uuid,
        memberIds: model.associationList.map(({ uuid }) => uuid),
        keys: model.keys,
        color: colorData(model.color),
      }),
      create: (project: Project, data) =>
        new SyncAssociation(project, {
          uuid: data.id,
          keys: data.keys,
          color: createColor(data.color),
        }),
      link: (model: SyncAssociation, members) => {
        model.associationList = members;
      },
    },
  });
}
