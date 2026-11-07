package algorithm

import (
	"context"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const floatTolerance = 1e-9

type fixtureFile struct {
	Cases []fixtureCase `json:"cases"`
}

type fixtureCase struct {
	Name     string             `json:"name"`
	Request  LayoutDAGRequest   `json:"request"`
	Expected fixtureExpectation `json:"expected"`
}

type fixtureExpectation struct {
	Positions    []LayoutPosition `json:"positions"`
	CycleNodeIDs []string         `json:"cycleNodeIds"`
	Warnings     []string         `json:"warnings"`
}

func loadFixture(t *testing.T) fixtureFile {
	t.Helper()
	content, err := os.ReadFile(filepath.Join("..", "..", "fixtures", "algorithm", "dag-layout.json"))
	if err != nil {
		t.Fatalf("read shared fixture: %v", err)
	}
	var fixture fixtureFile
	if err := json.Unmarshal(content, &fixture); err != nil {
		t.Fatalf("decode shared fixture: %v", err)
	}
	if len(fixture.Cases) == 0 {
		t.Fatal("shared fixture has no cases")
	}
	return fixture
}

func TestSharedFixture(t *testing.T) {
	for _, testCase := range loadFixture(t).Cases {
		t.Run(testCase.Name, func(t *testing.T) {
			response, err := LayoutDAG(context.Background(), testCase.Request)
			if err != nil {
				t.Fatalf("layout: %v", err)
			}
			if response.ProjectID != testCase.Request.ProjectID {
				t.Errorf("projectId = %q, want %q", response.ProjectID, testCase.Request.ProjectID)
			}
			if response.RequestID != testCase.Request.RequestID {
				t.Errorf("requestId = %q, want %q", response.RequestID, testCase.Request.RequestID)
			}
			if response.InputRevision != testCase.Request.InputRevision {
				t.Errorf("inputRevision = %q, want %q", response.InputRevision, testCase.Request.InputRevision)
			}
			if len(response.Positions) != len(testCase.Expected.Positions) {
				t.Fatalf("positions = %d, want %d", len(response.Positions), len(testCase.Expected.Positions))
			}
			for i, want := range testCase.Expected.Positions {
				got := response.Positions[i]
				if got.ID != want.ID {
					t.Fatalf("positions[%d].id = %q, want %q", i, got.ID, want.ID)
				}
				if math.Abs(got.X-want.X) > floatTolerance {
					t.Errorf("positions[%d].x = %v, want %v", i, got.X, want.X)
				}
				if math.Abs(got.Y-want.Y) > floatTolerance {
					t.Errorf("positions[%d].y = %v, want %v", i, got.Y, want.Y)
				}
			}
			if !equalStrings(response.CycleNodeIDs, testCase.Expected.CycleNodeIDs) {
				t.Errorf("cycleNodeIds = %v, want %v", response.CycleNodeIDs, testCase.Expected.CycleNodeIDs)
			}
			if !equalStrings(response.Warnings, testCase.Expected.Warnings) {
				t.Errorf("warnings = %v, want %v", response.Warnings, testCase.Expected.Warnings)
			}
		})
	}
}

func TestLayoutDAGRejectsInvalidRequests(t *testing.T) {
	base := func() LayoutDAGRequest {
		return LayoutDAGRequest{
			ProjectID: "project",
			RequestID: "request",
			Nodes:     []LayoutNode{{ID: "a", X: 1, Y: 2, Width: 10, Height: 10}},
			Edges:     []LayoutEdge{},
			Options:   LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
		}
	}
	cases := []struct {
		name    string
		mutate  func(request *LayoutDAGRequest)
		message string
	}{
		{"missing project", func(r *LayoutDAGRequest) { r.ProjectID = "" }, "projectId"},
		{"missing request", func(r *LayoutDAGRequest) { r.RequestID = "" }, "requestId"},
		{"duplicate node", func(r *LayoutDAGRequest) {
			r.Nodes = append(r.Nodes, LayoutNode{ID: "a"})
		}, "duplicate node id"},
		{"unknown edge target", func(r *LayoutDAGRequest) {
			r.Edges = []LayoutEdge{{ID: "e", From: "a", To: "missing"}}
		}, "unknown node"},
		{"unknown edge source", func(r *LayoutDAGRequest) {
			r.Edges = []LayoutEdge{{ID: "e", From: "missing", To: "a"}}
		}, "unknown node"},
		{"not a number", func(r *LayoutDAGRequest) { r.Nodes[0].X = math.NaN() }, "finite"},
		{"infinite height", func(r *LayoutDAGRequest) { r.Nodes[0].Height = math.Inf(1) }, "finite"},
		{"negative width", func(r *LayoutDAGRequest) { r.Nodes[0].Width = -1 }, "negative"},
		{"negative spacing", func(r *LayoutDAGRequest) { r.Options.HorizontalSpacing = -1 }, "negative"},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			request := base()
			testCase.mutate(&request)
			if _, err := LayoutDAG(context.Background(), request); err == nil {
				t.Fatal("expected an error")
			} else if !strings.Contains(err.Error(), testCase.message) {
				t.Fatalf("error = %q, want it to mention %q", err.Error(), testCase.message)
			}
		})
	}
}

func TestLayoutDAGEmptyGraph(t *testing.T) {
	response, err := LayoutDAG(context.Background(), LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes:     []LayoutNode{},
		Edges:     []LayoutEdge{},
		Options:   LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err != nil {
		t.Fatalf("layout: %v", err)
	}
	if len(response.Positions) != 0 {
		t.Fatalf("positions = %v, want none", response.Positions)
	}
}

func TestLayoutDAGIsolatedNodesKeepTheRequestOrder(t *testing.T) {
	response, err := LayoutDAG(context.Background(), LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes: []LayoutNode{
			{ID: "a", X: 0, Y: 0, Width: 10, Height: 10},
			{ID: "b", X: 0, Y: 0, Width: 10, Height: 10},
			{ID: "c", X: 0, Y: 0, Width: 10, Height: 10},
		},
		Edges:   []LayoutEdge{},
		Options: LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err != nil {
		t.Fatalf("layout: %v", err)
	}
	want := []string{"a", "b", "c"}
	got := make([]string, 0, len(response.Positions))
	for _, position := range response.Positions {
		got = append(got, position.ID)
	}
	if !equalStrings(got, want) {
		t.Fatalf("positions = %v, want %v", got, want)
	}
	if response.Positions[1].Y-response.Positions[0].Y != DefaultVerticalSpacing {
		t.Errorf("vertical spacing = %v, want %v", response.Positions[1].Y-response.Positions[0].Y, float64(DefaultVerticalSpacing))
	}
}

func TestLayoutDAGDeepChain(t *testing.T) {
	const depth = 500
	nodes := make([]LayoutNode, 0, depth)
	edges := make([]LayoutEdge, 0, depth-1)
	for i := 0; i < depth; i++ {
		nodes = append(nodes, LayoutNode{ID: id(i), X: 0, Y: 0, Width: 100, Height: 50})
		if i > 0 {
			edges = append(edges, LayoutEdge{ID: id(i), From: id(i - 1), To: id(i)})
		}
	}
	response, err := LayoutDAG(context.Background(), LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes:     nodes,
		Edges:     edges,
		Options:   LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err != nil {
		t.Fatalf("layout: %v", err)
	}
	if len(response.Positions) != depth {
		t.Fatalf("positions = %d, want %d", len(response.Positions), depth)
	}
	last := response.Positions[depth-1]
	want := float64(depth-1) * (100 + DefaultHorizontalSpacing)
	if math.Abs(last.X-want) > floatTolerance {
		t.Errorf("last x = %v, want %v", last.X, want)
	}
}

func TestLayoutDAGDuplicateEdgesAndSelfLoops(t *testing.T) {
	response, err := LayoutDAG(context.Background(), LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes: []LayoutNode{
			{ID: "a", X: 0, Y: 0, Width: 10, Height: 10},
			{ID: "b", X: 0, Y: 0, Width: 10, Height: 10},
		},
		Edges: []LayoutEdge{
			{ID: "e1", From: "a", To: "b"},
			{ID: "e2", From: "a", To: "b"},
		},
		Options: LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err != nil {
		t.Fatalf("layout: %v", err)
	}
	if len(response.CycleNodeIDs) != 0 {
		t.Fatalf("cycleNodeIds = %v, want none", response.CycleNodeIDs)
	}
	if response.Positions[1].X != 10+DefaultHorizontalSpacing {
		t.Errorf("child x = %v, want %v", response.Positions[1].X, 10+DefaultHorizontalSpacing)
	}

	selfLoop, err := LayoutDAG(context.Background(), LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes: []LayoutNode{
			{ID: "a", X: 0, Y: 0, Width: 10, Height: 10},
			{ID: "b", X: 0, Y: 0, Width: 10, Height: 10},
		},
		Edges:   []LayoutEdge{{ID: "e1", From: "a", To: "a"}},
		Options: LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err != nil {
		t.Fatalf("layout: %v", err)
	}
	if len(selfLoop.CycleNodeIDs) != 1 || selfLoop.CycleNodeIDs[0] != "a" {
		t.Fatalf("cycleNodeIds = %v, want [a]", selfLoop.CycleNodeIDs)
	}
}

// A cycle that appears before the root used to make the TypeScript
// implementation drop a node and move the anchor. The Go implementation
// keeps every node and leaves the anchor where it is.
func TestLayoutDAGCycleBeforeRootKeepsEveryNode(t *testing.T) {
	response, err := LayoutDAG(context.Background(), LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes: []LayoutNode{
			{ID: "cyc1", X: 0, Y: 0, Width: 50, Height: 50},
			{ID: "cyc2", X: 0, Y: 0, Width: 50, Height: 50},
			{ID: "root", X: 0, Y: 0, Width: 50, Height: 50},
		},
		Edges: []LayoutEdge{
			{ID: "e1", From: "cyc1", To: "cyc2"},
			{ID: "e2", From: "cyc2", To: "cyc1"},
			{ID: "e3", From: "root", To: "cyc1"},
		},
		Options: LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err != nil {
		t.Fatalf("layout: %v", err)
	}
	if len(response.Positions) != 3 {
		t.Fatalf("positions = %v, want three nodes", response.Positions)
	}
	for _, position := range response.Positions {
		if position.ID != "root" {
			continue
		}
		if position.X != 0 || position.Y != 0 {
			t.Errorf("root position = %v, want the original position", position)
		}
		return
	}
	t.Error("the root is missing from the layout")
}

func TestLayoutDAGLockedNodesAreNotMoved(t *testing.T) {
	response, err := LayoutDAG(context.Background(), LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes: []LayoutNode{
			{ID: "root", X: 0, Y: 0, Width: 50, Height: 50},
			{ID: "child", X: 0, Y: 0, Width: 50, Height: 50, Locked: true},
		},
		Edges:   []LayoutEdge{{ID: "e1", From: "root", To: "child"}},
		Options: LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err != nil {
		t.Fatalf("layout: %v", err)
	}
	if len(response.Positions) != 1 || response.Positions[0].ID != "root" {
		t.Fatalf("positions = %v, want only the root", response.Positions)
	}
}

func TestLayoutDAGStopsWhenTheContextIsCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := LayoutDAG(ctx, LayoutDAGRequest{
		ProjectID: "project",
		RequestID: "request",
		Nodes: []LayoutNode{
			{ID: "a", X: 0, Y: 0, Width: 10, Height: 10},
			{ID: "b", X: 0, Y: 0, Width: 10, Height: 10},
		},
		Edges:   []LayoutEdge{{ID: "e1", From: "a", To: "b"}},
		Options: LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	})
	if err == nil {
		t.Fatal("expected a cancellation error")
	}
}

func equalStrings(got, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for i := range got {
		if got[i] != want[i] {
			return false
		}
	}
	return true
}

func id(index int) string {
	return "node-" + string(rune('a'+index%26)) + string(rune('a'+index/26%26))
}
