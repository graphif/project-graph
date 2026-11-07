package algorithm

import (
	"context"
	"fmt"
	"testing"
)

func benchmarkRequest(size int) LayoutDAGRequest {
	nodes := make([]LayoutNode, 0, size)
	edges := make([]LayoutEdge, 0, size)
	for i := 0; i < size; i++ {
		nodes = append(nodes, LayoutNode{ID: fmt.Sprintf("node-%d", i), X: 0, Y: 0, Width: 100, Height: 50})
		if i > 0 {
			edges = append(edges, LayoutEdge{ID: fmt.Sprintf("edge-%d", i), From: fmt.Sprintf("node-%d", i-1), To: fmt.Sprintf("node-%d", i)})
		}
	}
	return LayoutDAGRequest{
		ProjectID: "benchmark",
		RequestID: "benchmark",
		Nodes:     nodes,
		Edges:     edges,
		Options:   LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
	}
}

func BenchmarkLayoutDAGDeepChain(b *testing.B) {
	for _, size := range []int{100, 1000, 10000} {
		request := benchmarkRequest(size)
		b.Run(fmt.Sprintf("chain-%d", size), func(b *testing.B) {
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				if _, err := LayoutDAG(context.Background(), request); err != nil {
					b.Fatal(err)
				}
			}
		})
	}
}

func BenchmarkLayoutDAGWideTree(b *testing.B) {
	for _, size := range []int{1000, 10000} {
		request := LayoutDAGRequest{
			ProjectID: "benchmark",
			RequestID: "benchmark",
			Options:   LayoutOptions{HorizontalSpacing: DefaultHorizontalSpacing, VerticalSpacing: DefaultVerticalSpacing},
		}
		request.Nodes = append(request.Nodes, LayoutNode{ID: "root", Width: 100, Height: 50})
		for i := 1; i < size; i++ {
			request.Nodes = append(request.Nodes, LayoutNode{ID: fmt.Sprintf("node-%d", i), Width: 100, Height: 50})
			request.Edges = append(request.Edges, LayoutEdge{ID: fmt.Sprintf("edge-%d", i), From: "root", To: fmt.Sprintf("node-%d", i)})
		}
		b.Run(fmt.Sprintf("tree-%d", size), func(b *testing.B) {
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				if _, err := LayoutDAG(context.Background(), request); err != nil {
					b.Fatal(err)
				}
			}
		})
	}
}
