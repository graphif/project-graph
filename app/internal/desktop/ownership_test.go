package desktop

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOwnershipReservationPromotionAndRelease(t *testing.T) {
	t.Setenv("PROJECT_GRAPH_OWNERSHIP_DIRECTORY", t.TempDir())
	path := filepath.Join(t.TempDir(), "graph.prg")
	first, second := NewOwnership("tcp://127.0.0.1:1234"), NewOwnership("")
	t.Cleanup(func() { CloseOwnership(first); CloseOwnership(second) })
	reserved, err := first.Acquire(path, true)
	if err != nil || reserved.Status != "acquired" {
		t.Fatalf("reserve new file: %+v, %v", reserved, err)
	}
	if err := os.WriteFile(path, []byte("fixture"), 0600); err != nil {
		t.Fatal(err)
	}
	again, err := first.Acquire(path, false)
	if err != nil || again.Status != "already_owned" || again.OwnershipID != reserved.OwnershipID {
		t.Fatalf("same owner: %+v, %v", again, err)
	}
	busy, err := second.Acquire(path, false)
	if err != nil || busy.Status != "busy" || busy.Owner.Kind != "unconnectable_holder" {
		t.Fatalf("reservation must not route to an unregistered runtime: %+v, %v", busy, err)
	}
	if err := first.MakeConnectable(reserved.OwnershipID); err != nil {
		t.Fatal(err)
	}
	busy, err = second.Acquire(path, false)
	if err != nil || busy.Status != "busy" || busy.Owner.Endpoint != "tcp://127.0.0.1:1234" {
		t.Fatalf("promoted owner: %+v, %v", busy, err)
	}
	if err := first.Release(reserved.OwnershipID); err != nil {
		t.Fatal(err)
	}
	acquired, err := second.Acquire(path, false)
	if err != nil || acquired.Status != "acquired" {
		t.Fatalf("release retained a lock: %+v, %v", acquired, err)
	}
}

func TestOwnershipRejectsInvalidProjects(t *testing.T) {
	t.Setenv("PROJECT_GRAPH_OWNERSHIP_DIRECTORY", t.TempDir())
	owner := NewOwnership("")
	t.Cleanup(func() { CloseOwnership(owner) })
	for path, code := range map[string]string{
		"relative.prg": "PROJECT_LOAD_FAILED",
		filepath.Join(t.TempDir(), "missing.prg"): "PROJECT_NOT_FOUND",
		filepath.Join(t.TempDir(), "other.json"):  "PROJECT_LOAD_FAILED",
	} {
		result, err := owner.Acquire(path, false)
		if err != nil || result.Status != "error" || result.Code != code {
			t.Fatalf("invalid path %q: %+v, %v", path, result, err)
		}
	}
}
