package desktop

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestMCPServerProcess(t *testing.T) {
	if os.Getenv("PROJECT_GRAPH_MCP_TEST_SERVER") != "1" {
		return
	}
	server := mcp.NewServer(&mcp.Implementation{Name: "fixture", Version: "1"}, nil)
	mcp.AddTool(server, &mcp.Tool{Name: "echo"}, func(context.Context, *mcp.CallToolRequest, struct{}) (*mcp.CallToolResult, any, error) {
		return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: os.Getenv("PROJECT_GRAPH_MCP_TEST_VALUE")}}}, nil, nil
	})
	mcp.AddTool(server, &mcp.Tool{Name: "wait"}, func(ctx context.Context, _ *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
		<-ctx.Done()
		return nil, nil, ctx.Err()
	})
	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		t.Fatal(err)
	}
	os.Exit(0)
}

func TestMCPLifecycleAndCancellation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	host := NewMCP("test")
	t.Cleanup(func() { CloseMCP(host) })
	executable, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	config := MCPConfig{ServerName: "fixture", Command: executable, Args: []string{"-test.run=^TestMCPServerProcess$"}, Env: map[string]string{
		"PROJECT_GRAPH_MCP_TEST_SERVER": "1", "PROJECT_GRAPH_MCP_TEST_VALUE": "configured environment",
	}}
	tools, err := host.Start(ctx, config)
	if err != nil || len(tools.([]*mcp.Tool)) != 2 {
		t.Fatalf("start tools: %v, %v", tools, err)
	}
	call, stop := context.WithTimeout(ctx, 100*time.Millisecond)
	_, err = host.CallTool(call, "fixture", "wait", map[string]any{})
	stop()
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("tool did not cancel: %v", err)
	}
	value, err := host.CallTool(ctx, "fixture", "echo", map[string]any{})
	if err != nil {
		t.Fatal(err)
	}
	result := value.(*mcp.CallToolResult)
	if len(result.Content) != 1 || result.Content[0].(*mcp.TextContent).Text != "configured environment" {
		t.Fatalf("session failed after cancellation: %+v", result)
	}
	if err := host.Stop("fixture"); err != nil {
		t.Fatal(err)
	}
	if _, err := host.ListTools(ctx, "fixture"); err == nil {
		t.Fatal("stopped session remained available")
	}
	if err := host.Stop("fixture"); err != nil {
		t.Fatal(err)
	}
	if _, err := host.Start(ctx, MCPConfig{ServerName: "missing", Command: filepath.Join(t.TempDir(), "absent")}); err == nil {
		t.Fatal("accepted a nonexistent server")
	}
}
