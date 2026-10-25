package desktop

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"
	"time"
)

type References struct {
	mu   sync.Mutex
	path string
}

func NewReferences(userData string) *References {
	if path := os.Getenv("PROJECT_GRAPH_REFERENCE_STORE_PATH"); path != "" {
		return &References{path: path}
	}
	return &References{path: filepath.Join(userData, "stores", "ai-project-references.json")}
}

var referencePattern = regexp.MustCompile(`^[ne][1-9][0-9]*$`)

func validateReferences(snapshot map[string]any) error {
	entries, ok := snapshot["entries"].([]any)
	if !ok {
		return errors.New("invalid reference entries")
	}
	seen := map[string]bool{}
	maxima := map[byte]uint64{'n': 0, 'e': 0}
	for _, entry := range entries {
		object, ok := entry.(map[string]any)
		if !ok {
			return errors.New("invalid reference entry")
		}
		ref, _ := object["ref"].(string)
		uuid, _ := object["uuid"].(string)
		if !referencePattern.MatchString(ref) || uuid == "" || seen[ref] {
			return errors.New("invalid or duplicate reference")
		}
		seen[ref] = true
		number, err := strconv.ParseUint(ref[1:], 10, 53)
		if err != nil {
			return errors.New("reference index exceeds the JSON safe range")
		}
		if number > maxima[ref[0]] {
			maxima[ref[0]] = number
		}
	}
	for _, name := range []string{"nextNodeRef", "nextEdgeRef"} {
		value, ok := snapshot[name].(float64)
		prefix := byte('n')
		if name == "nextEdgeRef" {
			prefix = 'e'
		}
		if !ok || value < 1 || value > 9007199254740991 || value != float64(int64(value)) || value <= float64(maxima[prefix]) {
			return fmt.Errorf("invalid %s", name)
		}
	}
	return nil
}
func (r *References) access(update func(map[string]any) error, write bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !filepath.IsAbs(r.path) {
		return errors.New("reference store path must be absolute")
	}
	if err := os.MkdirAll(filepath.Dir(r.path), 0700); err != nil {
		return err
	}
	root, err := os.OpenRoot(filepath.Dir(r.path))
	if err != nil {
		return err
	}
	defer root.Close()
	lock, err := root.OpenFile(filepath.Base(r.path)+".lock", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	deadline := time.Now().Add(10 * time.Second)
	for {
		locked, err := tryFileLock(lock)
		if err != nil {
			return err
		}
		if locked {
			break
		}
		if time.Now().After(deadline) {
			return errors.New("reference store is busy")
		}
		time.Sleep(10 * time.Millisecond)
	}
	values, err := readStore(root, filepath.Base(r.path))
	if err != nil {
		return err
	}
	if err := update(values); err != nil {
		return err
	}
	if write {
		if info, err := root.Lstat(filepath.Base(r.path)); err == nil {
			if !info.Mode().IsRegular() || info.Mode().Perm()&0200 == 0 {
				return errors.New("reference store is not a writable regular file")
			}
		} else if !errors.Is(err, os.ErrNotExist) {
			return err
		}
		return writeStore(root, filepath.Base(r.path), values)
	}
	return nil
}
func (r *References) Load(projectURI, legacyProjectURI string) (any, error) {
	var value any
	err := r.access(func(values map[string]any) error {
		value = values[referenceKey(projectURI)]
		if value == nil && legacyProjectURI != "" {
			value = values[referenceKey(legacyProjectURI)]
		}
		if value == nil {
			return nil
		}
		stored, ok := value.(map[string]any)
		if !ok {
			return errors.New("invalid stored reference snapshot")
		}
		if stored["version"] != float64(1) {
			return errors.New("unsupported reference snapshot version")
		}
		snapshot, ok := stored["references"].(map[string]any)
		if !ok {
			return errors.New("invalid stored reference snapshot")
		}
		value = snapshot
		return validateReferences(snapshot)
	}, false)
	if err != nil {
		return nil, err
	}
	return value, nil
}
func (r *References) Save(projectURI string, snapshot map[string]any) error {
	if err := validateReferences(snapshot); err != nil {
		return err
	}
	if projectURI == "" {
		return errors.New("project URI is required")
	}
	return r.access(func(values map[string]any) error {
		key := referenceKey(projectURI)
		if existing, ok := values[key]; ok {
			stored, ok := existing.(map[string]any)
			if !ok || stored["version"] != float64(1) {
				return errors.New("invalid existing reference snapshot")
			}
			previous, ok := stored["references"].(map[string]any)
			if !ok {
				return errors.New("invalid existing reference snapshot")
			}
			if err := validateReferences(previous); err != nil {
				return err
			}
		}
		values[key] = map[string]any{"version": 1, "references": snapshot, "updatedAt": time.Now().UnixMilli()}
		return nil
	}, true)
}
func referenceKey(uri string) string { return "project:" + uri + ":references" }
