package desktop

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"
)

// Acceptance is bound only by the development host.
type Acceptance struct{}

func (Acceptance) Manifest() (any, error) {
	data, err := os.ReadFile(os.Getenv("PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_MANIFEST_PATH"))
	if err != nil {
		return nil, err
	}
	var value any
	err = json.Unmarshal(data, &value)
	return value, err
}
func (Acceptance) WriteState(state map[string]any) error {
	path := os.Getenv("PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_STATE_PATH")
	if !filepath.IsAbs(path) {
		return errors.New("acceptance state path is not configured")
	}
	root, err := os.OpenRoot(filepath.Dir(path))
	if err != nil {
		return err
	}
	defer root.Close()
	return writeStore(root, filepath.Base(path), state)
}
func (Acceptance) WaitForCompletion(ctx context.Context) error {
	path := os.Getenv("PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_COMPLETION_PATH")
	if !filepath.IsAbs(path) {
		return errors.New("acceptance completion path is not configured")
	}
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()
	for {
		if _, err := os.Stat(path); err == nil {
			return nil
		} else if !errors.Is(err, os.ErrNotExist) {
			return err
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}
