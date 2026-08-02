# 孪生分组框（Twin Section）PRD

## 概述

孪生分组框是一种将两个或多个分组框绑定为"镜像副本"的功能。绑定后，对任意一个框内的物体进行操作，其余框内对应的物体会自动同步执行相同的操作，从而实现多份内容的并行维护。

---

## 数据结构

### TwinSectionAssociation

每次孪生操作产生一个 `TwinSectionAssociation` 对象，记录**一对**分组框之间的映射关系：

```
TwinSectionAssociation {
  sourceSectionUuid: string        // 原始分组框的 UUID
  twinSectionUuid:   string        // 孪生分组框的 UUID
  entityUuidPairs:   [string, string][]  // 框内所有实体的一一对应 UUID 对
}
```

**重要约束：** 每次孪生只产生一个 `TwinSectionAssociation`，记录的是**直接配对**关系。多次孪生会产生多个 TSA，形成一张图而非一个多元组。

### 等价类（Equivalence Class）

多次孪生后，多个 TSA 共同构成一张无向图，图中所有节点属于同一等价类。例如：

- A 孪生出 A' → TSA1: A ↔ A'
- A 孪生出 A'' → TSA2: A ↔ A''

此时 A、A'、A'' 属于同一等价类，但 A' 与 A'' 之间**没有直接 TSA**，必须通过 A 作为桥梁间接推导。

**所有需要"找出所有对应方"的逻辑，必须使用 BFS 展开整个等价类**，而不能只做一层直接查找。

---

## 创建孪生分组框

- 快捷键：`Shift+Y`（选中分组框后触发）
- 行为：
  1. 深拷贝选中的分组框及其所有内部物体（包括嵌套子框、连线等）
  2. 将副本放置在原框右侧（偏移 = 原框宽度 + 60px）
  3. 为框内每对 TextNode 建立 `SyncAssociation`（同步文字、颜色、详情）
  4. 创建一个 `TwinSectionAssociation` 记录两框的完整实体映射
  5. 记录历史步骤

---

## 同步行为

### 移动框内物体

- 触发时机：`StageEntityMoveManager.moveEntityUtils` / `moveEntityToUtils`
- 规则：移动框内任意实体时，等价类中**所有其他框**内对应的实体以相同位移同步移动
- 注意：移动**根分组框本身**不触发同步（`isTwinSectionRoot` 判断）
- 实现：BFS 展开等价类，对每个对应方调用 `counterpart.move(delta)`

### 框内节点新增连线

- 触发时机：`StageNodeConnector` 创建连线后调用 `onAssociationCreated`
- 规则：为等价类中每个其他框创建一条端点对应的镜像连线
- 实现：对连线每个端点用 BFS 找出全部对应方，按索引对齐后逐框创建镜像连线

### 框内节点删除连线

- 触发时机：`StageManager.delete` 调用 `onAssociationDeleted`
- 规则：删除等价类中每个其他框内端点对应的镜像连线
- 实现：同 `onAssociationCreated`，按索引对齐后逐框查找并删除

### 连线端点位置调整

- 触发时机：`StageManager` 调用 `onEdgeConnectLocationChanged`
- 规则：同步所有镜像连线的 `sourceRectangleRate` / `targetRectangleRate`

### 分组框属性修改

- 触发时机：`Section.rename`、`StageObjectColorManager`、`utilsControl` 修改 details
- 同步字段：`text`（标题）、`color`（颜色）、`details`（富文本详情）
- 实现：`onSectionPropertyChanged`，BFS 找出所有对应方后逐一同步

### 框内实体父级变化（进出框）

- 触发时机：`StageSectionInOutManager` 调用 `onEntityParentChanged`
- 规则：
  - 实体**新加入**某个孪生框 → 在等价类中每个其他框内克隆一份对应实体
  - 实体**离开**某个孪生框 → 在等价类中每个其他框内删除对应实体
  - 实体**在框间移动** → 在等价类中每个其他框内同步移动对应实体

### 图片节点拖拽改变大小

- 触发时机：`ControllerEntityResize.mousemove` → `ImageNode.resizeHandle`
- 同步字段：`scale`（缩放比例）
- 实现：`syncTwinSectionProperty(imageNode, c => { c.scale = ...; c.scaleUpdate(0); })`

### 涂鸦（PenStroke）改变颜色

- 触发时机：`StageObjectColorManager.setSelectedStageObjectColor`
- 同步字段：`color`
- 实现：`syncTwinSectionProperty`

### 连线 / 弧形线改变颜色

- 触发时机：`StageObjectColorManager.setSelectedStageObjectColor`
- 同步字段：`color`
- 实现：`syncTwinSectionAssociationProperty`

### 连线 / 弧形线改变文字

- 触发时机：`utilsControl.editEdgeText` → `edge.rename(text)`
- 同步字段：`text`
- 实现：`syncTwinSectionAssociationProperty(edge, c => c.rename(text))`

### 弧形线（ArcEdge）改变弧度

- 触发时机：`ControllerAssociationReshape.mousemove` → `arcEdge.offset += delta`
- 同步字段：`offset`
- 实现：`syncTwinSectionAssociationProperty(arcEdge, c => { c.offset = arcEdge.offset; })`

### 弧形线改变文字位置

- 触发时机：`ControllerAssociationReshape.mousemove`（Ctrl 拖拽）→ `arcEdge.textPosition = ...`
- 同步字段：`textPosition`
- 实现：`syncTwinSectionAssociationProperty(arcEdge, c => { c.textPosition = arcEdge.textPosition; })`

### LaTeX 公式节点改变公式内容

- 触发时机：`LatexEditWindow.onConfirm` → `node.updateLatex(newLatex)`
- 同步字段：`latexSource`（通过 `updateLatex` 异步渲染）
- 实现：`syncTwinSectionProperty(node, c => void c.updateLatex(newLatex))`

---

## 删除行为

### 删除根分组框

- 触发时机：用户删除某个根分组框（`isTwinSectionRoot` 为 true）
- 规则：**只解除同步关系，不删除其他框及其内容**
  - 删除所有 `sourceSectionUuid` 或 `twinSectionUuid` 等于该框 UUID 的 `TwinSectionAssociation`
  - 其余框及其内部物体完整保留，各自独立存在
- 注意：不得级联删除等价类中的其他框

### 删除框内普通节点

- 触发时机：用户删除框内某个非根节点
- 规则：同步删除等价类中所有其他框内对应的节点（及其子孙）
- 实现：`removeTwinSectionEntity` 递归收集并删除

---

## 渲染提示（虚线）

### 显示时机

选中孪生分组框内的任意物体（TextNode、Section 等）时，显示绿色虚线提示。

### 虚线端点规则

- 虚线连接的是**两个根分组框的边缘**，而非物体中心到物体中心
- 端点通过 `Rectangle.getLineIntersectionPoint(line)` 计算连线与矩形边缘的交点
- 多个孪生框时（等价类 ≥ 3 个框），以"当前节点所在根框"为起点，与等价类中每个其他根框各画一条虚线

### 渲染入口

- `TextNodeRenderer`：TextNode 被选中时调用 `SyncAssociationRenderer.renderSyncLines`
- `SectionRenderer`：Section 被选中时调用 `SyncAssociationRenderer.renderSyncLines`

### 逻辑分支

```
renderSyncLines(obj):
  if obj 是 Entity:
    rootPairs = getTwinSectionRootPairsForEntity(obj)  // BFS 展开
    if rootPairs 非空:
      for each [sourceSection, twinSection] in rootPairs:
        画 sourceSection 边缘 → twinSection 边缘 的虚线
      return
  // 普通孪生节点（TextNode SyncAssociation）：画节点到节点的虚线
  siblings = getSyncSiblings(obj)
  for each sibling: 画 obj.center → sibling.center 的虚线
```

---

## 防循环机制

所有同步操作通过 `isApplyingTwinSectionChange` 标志防止递归触发：

```
applyTwinSectionChange(action):
  isApplyingTwinSectionChange = true
  try: action()
  finally: isApplyingTwinSectionChange = false
```

所有公开的 `on*` / `sync*` 方法在入口处检查该标志，若为 `true` 则立即返回。

---

## 核心辅助方法

| 方法                                                  | 说明                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `getTwinSectionCounterparts(entity)`                  | BFS 展开等价类，返回除自身外的所有对应方                             |
| `getCounterpartInAssociation(entity, tsa)`            | 在指定单个 TSA 内查找对应方（用于父级变化场景）                      |
| `getTwinSectionRootPairsForEntity(entity)`            | BFS 展开，返回"当前节点所在根框"与其余每个根框的配对列表（用于渲染） |
| `isTwinSectionRoot(entity)`                           | 判断实体是否为某个 TSA 的根分组框                                    |
| `syncTwinSectionProperty<T>(entity, apply)`           | 通用实体属性同步：对等价类中所有同类型对应方执行 apply               |
| `syncTwinSectionAssociationProperty<T>(assoc, apply)` | 通用连线属性同步：找到每个孪生框内的镜像连线后执行 apply             |
| `removeTwinSectionEntity(entity)`                     | 递归删除实体及其子孙，同时清理相关 TSA 和连线                        |

---

## 已知限制与注意事项

1. **TSA 只记录直接配对**：A→A'、A→A'' 各一个 TSA，A' 与 A'' 之间无直接 TSA。所有"找对应方"的逻辑必须用 BFS，不能只做一层查找，否则在三框及以上场景下会漏掉间接对应方。

2. **根框移动不同步**：移动根分组框本身（整体拖动）不触发内部物体的同步移动，因为整个框作为一个整体移动，内部相对位置不变。

3. **删除根框只解除关系**：删除任意一个根分组框，只清理 TSA，其余框保留。不会级联删除其他框。

4. **删除框内节点会级联**：删除框内某个普通节点，等价类中所有其他框内的对应节点也会被同步删除。

5. **嵌套子框也需要渲染虚线**：选中孪生分组框内部嵌套的子分组框时，也应显示虚线提示（`SectionRenderer` 中已处理）。

6. **连线同步依赖端点索引对齐**：`onAssociationCreated` 等方法通过"各端点的第 i 个对应方"来确定第 i 个孪生框的镜像连线端点。这要求等价类中所有框的对应方数量必须一致，否则跳过该框。

7. **异步操作（LaTeX）**：LaTeX 公式更新是异步的（`updateLatex` 返回 Promise），同步调用时使用 `void` 忽略返回值，不等待完成。历史记录在原节点更新完成后才记录。
