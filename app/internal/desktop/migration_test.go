package desktop

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestImportAllCopiesAndOverwritesWithoutParsing(t *testing.T) {
	source := t.TempDir()
	destination := t.TempDir()
	stores := NewStores(destination)
	if err := stores.Set("settings.json", "newOnly", true); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(source, "settings.json"), []byte("not json"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(source, "extensions", "sample"), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(source, "extensions", "sample", "data.bin"), []byte("extension data"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(source, "ai-chat-sessions.json"), []byte(`{"all":"data"}`), 0600); err != nil {
		t.Fatal(err)
	}
	migration := NewMigration(stores)
	for i := 0; i < 2; i++ {
		report, err := migration.importDirectories([]string{source})
		if err != nil || report.Imported != 3 {
			t.Fatalf("report %#v: %v", report, err)
		}
	}
	for name, expected := range map[string]string{
		"stores/settings.json":         "not json",
		"stores/ai-chat-sessions.json": `{"all":"data"}`,
		"extensions/sample/data.bin":   "extension data",
	} {
		data, err := os.ReadFile(filepath.Join(destination, filepath.FromSlash(name)))
		if err != nil || string(data) != expected {
			t.Fatalf("%s: %q, %v", name, data, err)
		}
	}
	data, err := os.ReadFile(filepath.Join(source, "settings.json"))
	if err != nil || string(data) != "not json" {
		t.Fatal("source was modified")
	}
}

func TestMigrationRejectsOverlappingSource(t *testing.T) {
	stores := NewStores(t.TempDir())
	if _, err := NewMigration(stores).importDirectories([]string{filepath.Dir(stores.root)}); err == nil {
		t.Fatal("accepted destination as source")
	}
}

func TestMigrationCombinesDirectoriesAndKeepsOnboarding(t *testing.T) {
	primary, local, destination := t.TempDir(), t.TempDir(), t.TempDir()
	stores := NewStores(destination)
	if err := stores.Set("onboarding.json", "state", "current"); err != nil {
		t.Fatal(err)
	}
	for _, item := range []struct{ root, name, data string }{
		{primary, "settings.json", `{"language":"en"}`},
		{local, "settings.json", `{"language":"zh_CN"}`},
		{local, "drafts/draft.prg", "draft"},
		{primary, "onboarding.json", "old"},
		{local, "EBWebView/locked-cache", "cache"},
		{local, "cache/temporary", "cache"},
		{local, "logs/old.log", "log"},
	} {
		path := filepath.Join(item.root, filepath.FromSlash(item.name))
		if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(item.data), 0600); err != nil {
			t.Fatal(err)
		}
	}
	report, err := NewMigration(stores).importDirectories([]string{primary, local})
	if err != nil || report.Imported != 3 || report.CompletedAt == "" {
		t.Fatalf("report %#v: %v", report, err)
	}
	for name, expected := range map[string]string{
		"stores/settings.json":   `{"language":"en"}`,
		"stores/onboarding.json": `{"state":"current"}`,
		"drafts/draft.prg":       "draft",
	} {
		data, err := os.ReadFile(filepath.Join(destination, filepath.FromSlash(name)))
		if err != nil || string(data) != expected {
			t.Fatalf("%s: %q, %v", name, data, err)
		}
	}
	for _, name := range []string{"EBWebView", "cache", "logs"} {
		if _, err := os.Stat(filepath.Join(destination, name)); !errors.Is(err, os.ErrNotExist) {
			t.Fatalf("copied runtime data %s: %v", name, err)
		}
	}
}
