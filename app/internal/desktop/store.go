package desktop

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sync"
)

var storeName = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*\.json$`)

// Stores persists each mutation before acknowledging it to the page.
type Stores struct {
	mu   sync.Mutex
	root string
}

func NewStores(userData string) *Stores {
	return &Stores{root: filepath.Join(userData, "stores")}
}

func (s *Stores) open(name string) (*os.Root, error) {
	if !storeName.MatchString(name) {
		return nil, errors.New("invalid store name: expected a lowercase JSON filename")
	}
	if err := os.MkdirAll(s.root, 0700); err != nil {
		return nil, err
	}
	return os.OpenRoot(s.root)
}

func readStore(root *os.Root, name string) (map[string]any, error) {
	data, err := root.ReadFile(name)
	if errors.Is(err, os.ErrNotExist) {
		return map[string]any{}, nil
	}
	if err != nil {
		return nil, err
	}
	values := map[string]any{}
	if err := json.Unmarshal(data, &values); err != nil {
		return nil, fmt.Errorf("read %s: %w", name, err)
	}
	if values == nil {
		return nil, fmt.Errorf("read %s: expected a JSON object", name)
	}
	return values, nil
}

func writeStore(root *os.Root, name string, values map[string]any) error {
	data, err := json.Marshal(values)
	if err != nil {
		return err
	}
	return replaceFile(root, name, data, 0600)
}

func replaceFile(root *os.Root, name string, data []byte, mode os.FileMode) error {
	temporary := "." + rand.Text() + ".tmp"
	file, err := root.OpenFile(temporary, os.O_WRONLY|os.O_CREATE|os.O_EXCL, mode)
	if err != nil {
		return err
	}
	defer root.Remove(temporary)
	_, writeErr := file.Write(data)
	if writeErr == nil {
		writeErr = file.Sync()
	}
	closeErr := file.Close()
	if err := errors.Join(writeErr, closeErr); err != nil {
		return err
	}
	return root.Rename(temporary, name)
}

func (s *Stores) Read(name string) (map[string]any, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	root, err := s.open(name)
	if err != nil {
		return nil, err
	}
	defer root.Close()
	return readStore(root, name)
}

func (s *Stores) Set(name, key string, value any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	root, err := s.open(name)
	if err != nil {
		return err
	}
	defer root.Close()
	values, err := readStore(root, name)
	if err != nil {
		return err
	}
	values[key] = value
	return writeStore(root, name, values)
}

func (s *Stores) Delete(name, key string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	root, err := s.open(name)
	if err != nil {
		return false, err
	}
	defer root.Close()
	values, err := readStore(root, name)
	if err != nil {
		return false, err
	}
	if _, exists := values[key]; !exists {
		return false, nil
	}
	delete(values, key)
	return true, writeStore(root, name, values)
}

func (s *Stores) Clear(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	root, err := s.open(name)
	if err != nil {
		return err
	}
	defer root.Close()
	return writeStore(root, name, map[string]any{})
}
