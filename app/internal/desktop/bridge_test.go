package desktop

import (
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestBridgeResponseCancellationAndDisconnect(t *testing.T) {
	for _, mode := range []string{"response", "cancel", "disconnect", "shutdown"} {
		t.Run(mode, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "graph.prg")
			if err := os.WriteFile(path, []byte("fixture"), 0600); err != nil {
				t.Fatal(err)
			}
			bridge := NewBridge()
			events := make(chan RuntimeInvocation, 4)
			bridge.emit = func(event RuntimeInvocation) error { events <- event; return nil }
			t.Cleanup(func() { CloseBridge(bridge) })
			server, client := net.Pipe()
			t.Cleanup(func() { client.Close() })
			client.SetDeadline(time.Now().Add(5 * time.Second))
			finished := make(chan struct{})
			go func() { defer close(finished); bridge.serve(server) }()
			if err := json.NewEncoder(client).Encode(map[string]any{
				"requestId": "request-1", "projectPath": path, "toolName": "get_all_nodes", "input": map[string]any{},
			}); err != nil {
				t.Fatal(err)
			}
			waitEvent := func(kind string) {
				t.Helper()
				select {
				case event := <-events:
					if event.Kind != kind || event.RequestID != "request-1" {
						t.Fatalf("unexpected event: %+v", event)
					}
				case <-time.After(5 * time.Second):
					t.Fatalf("missing %s event", kind)
				}
			}
			waitEvent("invoke")
			switch mode {
			case "response":
				if !bridge.Respond("request-1", map[string]any{"ok": true}) {
					t.Fatal("request not pending")
				}
			case "cancel":
				if err := json.NewEncoder(client).Encode(map[string]string{"cancelRequestId": "request-1"}); err != nil {
					t.Fatal(err)
				}
				waitEvent("cancel")
				bridge.Respond("request-1", map[string]any{"ok": false})
			case "disconnect":
				client.Close()
				waitEvent("cancel")
			case "shutdown":
				CloseBridge(bridge)
				waitEvent("cancel")
			}
			if mode != "disconnect" {
				var response map[string]any
				if err := json.NewDecoder(client).Decode(&response); err != nil {
					t.Fatal(err)
				}
				if (response["ok"] == true) != (mode == "response") {
					t.Fatalf("unexpected result: %v", response)
				}
			}
			select {
			case <-finished:
			case <-time.After(5 * time.Second):
				t.Fatal("bridge retained disconnected request")
			}
			if bridge.Respond("request-1", nil) {
				t.Fatal("completed request retained")
			}
			if err := CloseBridge(bridge); err != nil {
				t.Fatal(err)
			}
		})
	}
}
