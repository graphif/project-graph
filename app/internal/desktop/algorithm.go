package desktop

import (
	"context"

	"github.com/graphif/project-graph/app/internal/algorithm"
)

// Algorithms exposes the pure computation kernels to the page. The binding
// only moves data across the bridge: validation and the algorithm itself live
// in the algorithm package, which the standalone helper calls as well.
type Algorithms struct{}

// LayoutDAG lays out a directed graph and answers with the positions of the
// nodes that may move.
func (Algorithms) LayoutDAG(ctx context.Context, request algorithm.LayoutDAGRequest) (algorithm.LayoutDAGResponse, error) {
	return algorithm.LayoutDAG(ctx, request)
}
