package desktop

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
)

func referenceSnapshot() map[string]any {
	return map[string]any{
		"entries":     []any{map[string]any{"ref": "n1", "uuid": "node-1"}},
		"nextNodeRef": float64(2), "nextEdgeRef": float64(1),
	}
}

func TestReferencesPreserveProtocolAndConcurrentWriters(t *testing.T) {
	path := filepath.Join(t.TempDir(), "references.json")
	t.Setenv("PROJECT_GRAPH_REFERENCE_STORE_PATH", path)
	var group sync.WaitGroup
	for i := range 12 {
		group.Go(func() {
			err := NewReferences(t.TempDir()).Save(fmt.Sprintf("file:///project-%d.prg", i), referenceSnapshot())
			if err != nil {
				t.Error(err)
			}
		})
	}
	group.Wait()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var values map[string]any
	if err := json.Unmarshal(data, &values); err != nil || len(values) != 12 {
		t.Fatalf("lost concurrent writes: %s, %v", data, err)
	}
	stored := values["project:file:///project-0.prg:references"].(map[string]any)
	if stored["version"] != float64(1) || stored["updatedAt"] == nil {
		t.Fatalf("changed reference protocol: %v", stored)
	}
	actual, err := NewReferences(t.TempDir()).Load("file:///project-0.prg", "")
	if err != nil || !reflect.DeepEqual(actual, referenceSnapshot()) {
		t.Fatalf("round trip: %v, %v", actual, err)
	}
}

func TestReferencesRejectCorruptionWithoutOverwriting(t *testing.T) {
	path := filepath.Join(t.TempDir(), "references.json")
	t.Setenv("PROJECT_GRAPH_REFERENCE_STORE_PATH", path)
	store := NewReferences(t.TempDir())
	for _, data := range []string{
		"{invalid", "null", "[]",
		`{"project:file:///graph.prg:references":{"version":2,"references":{}}}`,
		`{"project:file:///graph.prg:references":{"version":1,"references":{"entries":[{"ref":"bad","uuid":"node"}],"nextNodeRef":2,"nextEdgeRef":1}}}`,
	} {
		if err := os.WriteFile(path, []byte(data), 0600); err != nil {
			t.Fatal(err)
		}
		if _, err := store.Load("file:///graph.prg", ""); err == nil {
			t.Fatalf("loaded invalid data: %s", data)
		}
		if err := store.Save("file:///graph.prg", referenceSnapshot()); err == nil {
			t.Fatalf("overwrote invalid data: %s", data)
		}
		actual, err := os.ReadFile(path)
		if err != nil || string(actual) != data {
			t.Fatalf("corruption changed: %s, %v", actual, err)
		}
	}
}

func TestReferencesRejectReusedAndUnsafeCounters(t *testing.T) {
	for _, counter := range []float64{0, 1, 1.5, 9007199254740992} {
		snapshot := referenceSnapshot()
		snapshot["nextNodeRef"] = counter
		if err := validateReferences(snapshot); err == nil {
			t.Fatalf("accepted invalid next reference: %v", counter)
		}
	}
	snapshot := referenceSnapshot()
	snapshot["entries"] = []any{map[string]any{"ref": "n1", "uuid": "node-1"}, map[string]any{"ref": "n1", "uuid": "node-2"}}
	if err := validateReferences(snapshot); err == nil {
		t.Fatal("accepted duplicate reference")
	}
}
