package desktop

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"unicode/utf16"
)

type ProjectOwner struct {
	Kind     string `json:"kind"`
	Endpoint string `json:"endpoint,omitempty"`
}
type Acquisition struct {
	Status        string        `json:"status"`
	OwnershipID   string        `json:"ownershipId"`
	CanonicalPath string        `json:"canonicalPath"`
	Code          string        `json:"code,omitempty"`
	Owner         *ProjectOwner `json:"owner,omitempty"`
}
type heldProject struct {
	path       string
	locks      []*os.File
	ownerLocks []*os.File
}
type Ownership struct {
	mu       sync.Mutex
	held     map[string]*heldProject
	endpoint string
}

func NewOwnership(endpoint string) *Ownership {
	return &Ownership{held: map[string]*heldProject{}, endpoint: endpoint}
}
func SetOwnershipEndpoint(o *Ownership, endpoint string) {
	o.mu.Lock()
	defer o.mu.Unlock()
	o.endpoint = endpoint
}

func CanonicalProject(path string, forSave bool) (string, error) {
	if !filepath.IsAbs(path) || !strings.EqualFold(filepath.Ext(path), ".prg") {
		return "", errors.New("PROJECT_LOAD_FAILED")
	}
	resolved, err := canonicalName(path)
	if err == nil {
		info, err := os.Stat(resolved)
		if err != nil || !info.Mode().IsRegular() {
			return "", errors.New("PROJECT_LOAD_FAILED")
		}
		return resolved, nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return "", errors.New("PROJECT_LOAD_FAILED")
	}
	if !forSave {
		return "", errors.New("PROJECT_NOT_FOUND")
	}
	parent, err := canonicalName(filepath.Dir(path))
	if err != nil {
		return "", errors.New("PROJECT_LOAD_FAILED")
	}
	return filepath.Join(parent, filepath.Base(path)), nil
}
func OwnershipDirectories() ([]string, error) {
	if directory := os.Getenv("PROJECT_GRAPH_OWNERSHIP_DIRECTORY"); directory != "" {
		return []string{directory}, nil
	}
	paths, err := ResolvePaths(false)
	if err != nil {
		return nil, err
	}
	legacy, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	if runtime.GOOS == "linux" {
		legacy = os.Getenv("XDG_DATA_HOME")
		if legacy == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return nil, err
			}
			legacy = filepath.Join(home, ".local", "share")
		}
	}
	// Lock coordination alone uses the old identity; no old business data is loaded.
	return []string{filepath.Join(paths.UserData, "project-ownership"), filepath.Join(legacy, "liren.project-graph", "project-ownership")}, nil
}
func ownershipKey(path string) string {
	data := []byte(path)
	if runtime.GOOS == "windows" {
		units := utf16.Encode([]rune(path))
		data = make([]byte, len(units)*2)
		for i, unit := range units {
			binary.LittleEndian.PutUint16(data[i*2:], unit)
		}
	}
	return fmt.Sprintf("%x", sha256.Sum256(data))
}
func lockArtifact(directory, path, suffix string) (*os.File, bool, error) {
	if err := os.MkdirAll(directory, 0700); err != nil {
		return nil, false, err
	}
	file, err := os.OpenFile(filepath.Join(directory, ownershipKey(path)+suffix), os.O_RDWR|os.O_CREATE, 0600)
	if err != nil {
		return nil, false, err
	}
	ok, err := tryFileLock(file)
	if !ok || err != nil {
		file.Close()
		return nil, false, err
	}
	return file, true, nil
}
func releaseHeld(held *heldProject) error {
	var errs []error
	for _, file := range append(held.ownerLocks, held.locks...) {
		errs = append(errs, file.Close())
	}
	return errors.Join(errs...)
}
func acquireHeld(path string) (*heldProject, *ProjectOwner, error) {
	directories, err := OwnershipDirectories()
	if err != nil {
		return nil, nil, err
	}
	held := &heldProject{path: path}
	for _, directory := range directories {
		file, ok, err := lockArtifact(directory, path, ".lock")
		if err != nil || !ok {
			releaseHeld(held)
			if err != nil {
				return nil, nil, err
			}
			owner := &ProjectOwner{Kind: "unconnectable_holder"}
			probe, unlocked, probeErr := lockArtifact(directory, path, ".connectable.lock")
			if probe != nil {
				probe.Close()
			}
			if probeErr == nil && !unlocked {
				data, readErr := os.ReadFile(filepath.Join(directory, ownershipKey(path)+".connectable"))
				if readErr == nil {
					var found ProjectOwner
					if json.Unmarshal(data, &found) == nil && found.Kind == "connectable" && strings.HasPrefix(found.Endpoint, "tcp://127.0.0.1:") {
						owner = &found
					}
				}
			}
			return nil, owner, nil
		}
		held.locks = append(held.locks, file)
	}
	return held, nil, nil
}
func publishOwner(held *heldProject, endpoint string) error {
	if len(held.ownerLocks) > 0 {
		return nil
	}
	directories, err := OwnershipDirectories()
	if err != nil {
		return err
	}
	data, err := json.Marshal(ProjectOwner{Kind: "connectable", Endpoint: endpoint})
	if err != nil {
		return err
	}
	var acquired []*os.File
	for _, directory := range directories {
		file, ok, err := lockArtifact(directory, held.path, ".connectable.lock")
		if err == nil && !ok {
			err = errors.New("connectable owner lock is busy")
		}
		if err == nil {
			acquired = append(acquired, file)
			err = os.WriteFile(filepath.Join(directory, ownershipKey(held.path)+".connectable"), data, 0600)
		}
		if err != nil {
			for _, file := range acquired {
				file.Close()
			}
			return err
		}
	}
	held.ownerLocks = acquired
	return nil
}
func (o *Ownership) Acquire(path string, forSave bool) (Acquisition, error) {
	canonical, err := CanonicalProject(path, forSave)
	if err != nil {
		return Acquisition{Status: "error", Code: err.Error()}, nil
	}
	o.mu.Lock()
	defer o.mu.Unlock()
	for id, held := range o.held {
		if held.path == canonical {
			return Acquisition{Status: "already_owned", OwnershipID: id, CanonicalPath: canonical}, nil
		}
	}
	held, owner, err := acquireHeld(canonical)
	if err != nil {
		return Acquisition{}, err
	}
	if owner != nil {
		return Acquisition{Status: "busy", Code: "PROJECT_BUSY", Owner: owner}, nil
	}
	id := rand.Text()
	o.held[id] = held
	return Acquisition{Status: "acquired", OwnershipID: id, CanonicalPath: canonical}, nil
}
func (o *Ownership) MakeConnectable(id string) error {
	o.mu.Lock()
	defer o.mu.Unlock()
	held := o.held[id]
	if held == nil {
		return errors.New("project ownership not found")
	}
	return publishOwner(held, o.endpoint)
}
func (o *Ownership) Release(id string) error {
	o.mu.Lock()
	defer o.mu.Unlock()
	held := o.held[id]
	if held == nil {
		return nil
	}
	if err := releaseHeld(held); err != nil {
		return err
	}
	delete(o.held, id)
	return nil
}
func CloseOwnership(o *Ownership) error {
	o.mu.Lock()
	defer o.mu.Unlock()
	var errs []error
	for id, held := range o.held {
		errs = append(errs, releaseHeld(held))
		delete(o.held, id)
	}
	return errors.Join(errs...)
}
