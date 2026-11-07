// Package algorithm holds pure computation kernels that run outside the
// desktop host. It must not depend on MyGo windows, project services or any
// other runtime state: the same package is called by the desktop binding and
// by the standalone Go helper.
package algorithm

import (
	"context"
	"fmt"
	"math"
)

const (
	// MaxLayoutNodes bounds the number of nodes a single layout request carries.
	MaxLayoutNodes = 100000
	// MaxLayoutEdges bounds the number of edges a single layout request carries.
	MaxLayoutEdges = 200000
	// DefaultHorizontalSpacing is the gap between two consecutive layers.
	DefaultHorizontalSpacing = 150
	// DefaultVerticalSpacing is the gap between two nodes of the same layer.
	DefaultVerticalSpacing = 100
)

// LayoutNode is the minimal projection of a stage node a layout needs.
type LayoutNode struct {
	ID     string  `json:"id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Locked bool    `json:"locked"`
}

// LayoutEdge is a directed relation between two layout nodes.
type LayoutEdge struct {
	ID   string `json:"id"`
	From string `json:"from"`
	To   string `json:"to"`
}

// LayoutOptions carries the spacing rules of one layout run.
type LayoutOptions struct {
	HorizontalSpacing float64 `json:"horizontalSpacing"`
	VerticalSpacing   float64 `json:"verticalSpacing"`
}

// LayoutDAGRequest is the wire contract of the DAG layout task.
type LayoutDAGRequest struct {
	ProjectID     string        `json:"projectId"`
	RequestID     string        `json:"requestId"`
	InputRevision string        `json:"inputRevision"`
	Nodes         []LayoutNode  `json:"nodes"`
	Edges         []LayoutEdge  `json:"edges"`
	Options       LayoutOptions `json:"options"`
}

// LayoutPosition is one resolved node position.
type LayoutPosition struct {
	ID string  `json:"id"`
	X  float64 `json:"x"`
	Y  float64 `json:"y"`
}

// LayoutDAGResponse is the wire contract of the DAG layout result. The
// identifiers of the request are echoed so the caller can drop a result that
// belongs to a superseded or edited input.
type LayoutDAGResponse struct {
	ProjectID     string           `json:"projectId"`
	RequestID     string           `json:"requestId"`
	InputRevision string           `json:"inputRevision"`
	Positions     []LayoutPosition `json:"positions"`
	CycleNodeIDs  []string         `json:"cycleNodeIds,omitempty"`
	Warnings      []string         `json:"warnings,omitempty"`
}

// LayoutDAG computes a layered layout for a directed graph.
//
// Every node is placed on the level of its longest path from a root, the
// level order follows the order of the request, and the first root keeps its
// own position as the anchor of the layout. Nodes are grouped per level in
// request order, so the same request always produces the same result no
// matter how the graph is stored internally.
//
// Locked nodes keep their position and are left out of the result. Nodes that
// take part in a cycle, or that depend on one, cannot be ordered; they are
// reported in CycleNodeIDs and are laid out on level zero.
func LayoutDAG(ctx context.Context, request LayoutDAGRequest) (LayoutDAGResponse, error) {
	if err := validateLayoutRequest(request); err != nil {
		return LayoutDAGResponse{}, err
	}

	response := LayoutDAGResponse{
		ProjectID:     request.ProjectID,
		RequestID:     request.RequestID,
		InputRevision: request.InputRevision,
		Positions:     []LayoutPosition{},
	}

	index := make(map[string]int, len(request.Nodes))
	for i, node := range request.Nodes {
		index[node.ID] = i
	}
	adjacent := make([][]int, len(request.Nodes))
	inDegree := make([]int, len(request.Nodes))
	for _, edge := range request.Edges {
		from := index[edge.From]
		to := index[edge.To]
		adjacent[from] = append(adjacent[from], to)
		inDegree[to]++
	}

	anchor := -1
	for i := range request.Nodes {
		if inDegree[i] == 0 {
			anchor = i
			break
		}
	}

	levels := make([]int, len(request.Nodes))
	queue := make([]int, 0, len(request.Nodes))
	for i := range request.Nodes {
		if inDegree[i] == 0 {
			queue = append(queue, i)
		}
	}
	ordered := make([]int, 0, len(request.Nodes))
	for len(queue) > 0 {
		if err := ctx.Err(); err != nil {
			return LayoutDAGResponse{}, err
		}
		current := queue[0]
		queue = queue[1:]
		ordered = append(ordered, current)
		currentLevel := levels[current]
		for _, neighbor := range adjacent[current] {
			inDegree[neighbor]--
			if currentLevel+1 > levels[neighbor] {
				levels[neighbor] = currentLevel + 1
			}
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	if len(ordered) == 0 {
		// Every node takes part in a cycle: there is no root to anchor the
		// layout on, so nothing is moved.
		response.CycleNodeIDs = collectNodeIDs(request.Nodes, nil)
		response.Warnings = []string{"the graph has no root node; the layout was not applied"}
		return response, nil
	}

	if len(ordered) != len(request.Nodes) {
		blocked := make([]bool, len(request.Nodes))
		for _, index := range ordered {
			blocked[index] = true
		}
		response.CycleNodeIDs = filterNodeIDs(request.Nodes, blocked)
		response.Warnings = []string{"the graph contains a cycle; the affected nodes are laid out on level zero"}
	}

	maxLevel := 0
	for _, level := range levels {
		if level > maxLevel {
			maxLevel = level
		}
	}
	groups := make([][]int, maxLevel+1)
	for i, level := range levels {
		groups[level] = append(groups[level], i)
	}

	levelWidths := make([]float64, maxLevel+1)
	for level, group := range groups {
		width := 0.0
		for _, nodeIndex := range group {
			if nodeWidth := request.Nodes[nodeIndex].Width; nodeWidth > width {
				width = nodeWidth
			}
		}
		levelWidths[level] = width
	}

	offsets := make([]float64, maxLevel+1)
	offsets[0] = request.Nodes[anchor].X
	for level := 1; level <= maxLevel; level++ {
		offsets[level] = offsets[level-1] + levelWidths[level-1] + request.Options.HorizontalSpacing
	}

	baseY := request.Nodes[anchor].Y
	for level, group := range groups {
		if err := ctx.Err(); err != nil {
			return LayoutDAGResponse{}, err
		}
		for position, nodeIndex := range group {
			node := request.Nodes[nodeIndex]
			if node.Locked {
				continue
			}
			if nodeIndex == anchor {
				response.Positions = append(response.Positions, LayoutPosition{ID: node.ID, X: node.X, Y: node.Y})
				continue
			}
			response.Positions = append(response.Positions, LayoutPosition{
				ID: node.ID,
				X:  offsets[level],
				Y:  baseY + float64(position)*request.Options.VerticalSpacing,
			})
		}
	}

	return response, nil
}

func validateLayoutRequest(request LayoutDAGRequest) error {
	if request.ProjectID == "" {
		return fmt.Errorf("projectId: must not be empty")
	}
	if request.RequestID == "" {
		return fmt.Errorf("requestId: must not be empty")
	}
	if len(request.Nodes) > MaxLayoutNodes {
		return fmt.Errorf("nodes: %d nodes exceed the limit of %d", len(request.Nodes), MaxLayoutNodes)
	}
	if len(request.Edges) > MaxLayoutEdges {
		return fmt.Errorf("edges: %d edges exceed the limit of %d", len(request.Edges), MaxLayoutEdges)
	}
	if err := validateLayoutOptions(request.Options); err != nil {
		return err
	}
	known := make(map[string]bool, len(request.Nodes))
	for i, node := range request.Nodes {
		if node.ID == "" {
			return fmt.Errorf("nodes[%d].id: must not be empty", i)
		}
		if known[node.ID] {
			return fmt.Errorf("nodes[%d].id: duplicate node id %q", i, node.ID)
		}
		known[node.ID] = true
		if err := validateFinite("nodes[%d].x", node.X); err != nil {
			return err
		}
		if err := validateFinite("nodes[%d].y", node.Y); err != nil {
			return err
		}
		if err := validateFinite("nodes[%d].width", node.Width); err != nil {
			return err
		}
		if err := validateFinite("nodes[%d].height", node.Height); err != nil {
			return err
		}
		if node.Width < 0 {
			return fmt.Errorf("nodes[%d].width: must not be negative", i)
		}
		if node.Height < 0 {
			return fmt.Errorf("nodes[%d].height: must not be negative", i)
		}
	}
	for i, edge := range request.Edges {
		if edge.From == "" {
			return fmt.Errorf("edges[%d].from: must not be empty", i)
		}
		if edge.To == "" {
			return fmt.Errorf("edges[%d].to: must not be empty", i)
		}
		if !known[edge.From] {
			return fmt.Errorf("edges[%d].from: unknown node %q", i, edge.From)
		}
		if !known[edge.To] {
			return fmt.Errorf("edges[%d].to: unknown node %q", i, edge.To)
		}
	}
	return nil
}

func validateLayoutOptions(options LayoutOptions) error {
	if err := validateFinite("options.horizontalSpacing", options.HorizontalSpacing); err != nil {
		return err
	}
	if err := validateFinite("options.verticalSpacing", options.VerticalSpacing); err != nil {
		return err
	}
	if options.HorizontalSpacing < 0 {
		return fmt.Errorf("options.horizontalSpacing: must not be negative")
	}
	if options.VerticalSpacing < 0 {
		return fmt.Errorf("options.verticalSpacing: must not be negative")
	}
	return nil
}

func validateFinite(field string, value float64) error {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return fmt.Errorf("%s: expected a finite number", field)
	}
	return nil
}

func collectNodeIDs(nodes []LayoutNode, indexes []int) []string {
	if indexes == nil {
		ids := make([]string, 0, len(nodes))
		for _, node := range nodes {
			ids = append(ids, node.ID)
		}
		return ids
	}
	ids := make([]string, 0, len(indexes))
	for _, index := range indexes {
		ids = append(ids, nodes[index].ID)
	}
	return ids
}

func filterNodeIDs(nodes []LayoutNode, ordered []bool) []string {
	ids := make([]string, 0, len(nodes))
	for i, node := range nodes {
		if !ordered[i] {
			ids = append(ids, node.ID)
		}
	}
	return ids
}
