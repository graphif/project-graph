package desktop

import (
	"bytes"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestWriteNewDoesNotOverwrite(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "converted.prg")
	files := Files{}
	original := []byte("original")
	if err := files.WriteNew(path, original); err != nil {
		t.Fatal(err)
	}
	if err := files.WriteNew(path, []byte("replacement")); err == nil {
		t.Fatal("existing target was replaced")
	}
	actual, err := os.ReadFile(path)
	if err != nil || !bytes.Equal(actual, original) {
		t.Fatalf("original changed: %q, %v", actual, err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) != 1 {
		t.Fatalf("temporary files leaked: %v, %v", entries, err)
	}
}

func TestWriteNewConcurrentPublication(t *testing.T) {
	path := filepath.Join(t.TempDir(), "converted.prg")
	var wg sync.WaitGroup
	results := make(chan []byte, 8)
	for i := range 8 {
		wg.Go(func() {
			data := bytes.Repeat([]byte{byte(i)}, 128*1024)
			if err := (Files{}).WriteNew(path, data); err == nil {
				results <- data
			}
		})
	}
	wg.Wait()
	close(results)
	var winner []byte
	count := 0
	for data := range results {
		winner = data
		count++
	}
	actual, err := os.ReadFile(path)
	if count != 1 || err != nil || !bytes.Equal(actual, winner) {
		t.Fatalf("expected one complete publication: winners=%d, error=%v", count, err)
	}
}

func TestWriteNewRejectsSymlink(t *testing.T) {
	dir := t.TempDir()
	source := filepath.Join(dir, "source.prg")
	target := filepath.Join(dir, "alias.prg")
	if err := os.WriteFile(source, []byte("original"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(source, target); err != nil {
		t.Skipf("symlink unavailable: %v", err)
	}
	if err := (Files{}).WriteNew(target, []byte("replacement")); err == nil {
		t.Fatal("symlink target was accepted")
	}
	actual, err := os.ReadFile(source)
	if err != nil || string(actual) != "original" {
		t.Fatalf("source changed: %q, %v", actual, err)
	}
}
