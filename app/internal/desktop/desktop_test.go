package desktop

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestPathsAreIsolated(t *testing.T) {
	for _, platform := range []string{"windows", "linux", "darwin"} {
		t.Run(platform, func(t *testing.T) {
			base := t.TempDir()
			config, cache := filepath.Join(base, "config"), filepath.Join(base, "cache")
			production := resolvePaths(config, cache, base, platform, false)
			development := resolvePaths(config, cache, base, platform, true)
			for _, pair := range [][2]string{
				{production.UserData, development.UserData},
				{production.Cache, development.Cache},
				{production.Logs, development.Logs},
			} {
				if pair[0] == pair[1] || !strings.Contains(pair[0], Identifier) ||
					!strings.Contains(pair[1], Identifier+".dev") || strings.Contains(pair[0], "liren") {
					t.Fatalf("paths not isolated: %v", pair)
				}
			}
		})
	}
}

func TestDeviceIDIsStableAcrossConcurrentRequests(t *testing.T) {
	native := NewNative(NewStores(t.TempDir()))
	ids := make(chan string, 20)
	var group sync.WaitGroup
	for range 20 {
		group.Go(func() {
			id, err := native.DeviceID()
			if err != nil {
				t.Error(err)
			}
			ids <- id
		})
	}
	group.Wait()
	close(ids)
	expected := ""
	for id := range ids {
		if id == "" || (expected != "" && id != expected) {
			t.Fatalf("device identity changed: %q != %q", id, expected)
		}
		expected = id
	}
}

func TestStorePersistsConcurrentMutations(t *testing.T) {
	data := t.TempDir()
	store := NewStores(data)
	var group sync.WaitGroup
	for i := range 40 {
		group.Go(func() {
			if err := store.Set("settings.json", fmt.Sprint(i), i); err != nil {
				t.Error(err)
			}
		})
	}
	group.Wait()
	reopened := NewStores(data)
	values, err := reopened.Read("settings.json")
	if err != nil || len(values) != 40 {
		t.Fatalf("lost mutations: %d, %v", len(values), err)
	}
	if err := reopened.Set("settings.json", "0", "updated"); err != nil {
		t.Fatal(err)
	}
	deleted, err := reopened.Delete("settings.json", "0")
	if !deleted || err != nil {
		t.Fatalf("delete: %v, %v", deleted, err)
	}
	if err := reopened.Clear("settings.json"); err != nil {
		t.Fatal(err)
	}
	values, err = reopened.Read("settings.json")
	if err != nil || len(values) != 0 {
		t.Fatalf("clear: %v, %v", values, err)
	}
	entries, err := os.ReadDir(filepath.Join(data, "stores"))
	if err != nil || len(entries) != 1 {
		t.Fatalf("temporary files leaked: %v, %v", entries, err)
	}
}

func TestStoreRejectsTraversalAndPreservesCorruptData(t *testing.T) {
	data := t.TempDir()
	store := NewStores(data)
	for _, name := range []string{"../settings.json", `..\settings.json`, "", "settings", "CON.json"} {
		if err := store.Set(name, "key", true); err == nil {
			t.Fatalf("accepted unsafe store name %q", name)
		}
	}
	if err := os.MkdirAll(filepath.Join(data, "stores"), 0700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(data, "stores", "settings.json")
	for _, corrupt := range []string{"{invalid", "null", "[]"} {
		if err := os.WriteFile(path, []byte(corrupt), 0600); err != nil {
			t.Fatal(err)
		}
		if err := store.Set("settings.json", "key", true); err == nil {
			t.Fatal("silently overwrote corrupt data")
		}
		actual, err := os.ReadFile(path)
		if err != nil || string(actual) != corrupt {
			t.Fatalf("corrupt data changed: %s, %v", actual, err)
		}
	}
}

func TestOpenRequestsBoundedDeduplicatedAndAcknowledged(t *testing.T) {
	host := NewHost(Paths{}, func() string { return "4.2.6-alpha1" }, true)
	path := filepath.Join(t.TempDir(), "example.prg")
	for range 2 {
		if err := Enqueue(host, "file", path); err != nil {
			t.Fatal(err)
		}
	}
	if len(host.PendingOpenRequests().Items) != 1 {
		t.Fatal("duplicate request queued")
	}
	for i := 1; i < maxOpenRequests; i++ {
		if err := Enqueue(host, "url", fmt.Sprintf("prg://open/%d", i)); err != nil {
			t.Fatal(err)
		}
	}
	if err := Enqueue(host, "url", "prg://overflow"); err == nil {
		t.Fatal("unbounded queue")
	}
	requests := host.PendingOpenRequests()
	requests.Items[0].Target = "changed by caller"
	if host.PendingOpenRequests().Items[0].Target != path {
		t.Fatal("pending snapshot aliases queue")
	}
	host.AcknowledgeOpenRequests([]int{requests.Items[0].ID})
	remaining := host.PendingOpenRequests()
	if len(remaining.Items) != maxOpenRequests-1 || remaining.Rejected != 1 || remaining.Items[0].ID != 2 {
		t.Fatalf("invalid acknowledgment: %+v", remaining)
	}
}

func TestOpenRequestAndVersionValidation(t *testing.T) {
	host := NewHost(Paths{}, func() string { return "0.0.0" }, true)
	if _, err := host.Bootstrap(); err == nil {
		t.Fatal("accepted placeholder application version")
	}
	for _, request := range [][2]string{{"file", "relative.prg"}, {"url", "https://example.com"}, {"file", filepath.Join(t.TempDir(), "not-a-project.txt")}} {
		if err := Enqueue(host, request[0], request[1]); err == nil {
			t.Fatalf("accepted invalid request %v", request)
		}
	}
}

func TestFilesRoundTripAndNonRecursiveRemoval(t *testing.T) {
	files := Files{}
	dir := t.TempDir()
	path := filepath.Join(dir, "binary.prg")
	content := []byte{0, 1, 127, 128, 255}
	if err := files.Write(path, content); err != nil {
		t.Fatal(err)
	}
	actual, err := files.Read(path)
	if err != nil || string(actual) != string(content) {
		t.Fatalf("binary roundtrip: %v, %v", actual, err)
	}
	if err := files.Remove(dir); err == nil {
		t.Fatal("recursively removed a non-empty directory")
	}
	if _, err := files.Read("relative.prg"); err == nil {
		t.Fatal("accepted relative path")
	}
	entries, err := files.ReadDir(dir)
	if err != nil || len(entries) != 1 || entries[0].Name != "binary.prg" || !entries[0].IsFile {
		t.Fatalf("directory entries: %v, %v", entries, err)
	}
}
