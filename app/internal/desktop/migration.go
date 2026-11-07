package desktop

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"time"
)

const legacyIdentifier = "liren.project-graph"

type LegacyInstallation struct {
	Path     string `json:"path"`
	Version  string `json:"version"`
	Evidence string `json:"evidence"`
}

type LegacyDetection struct {
	Status          string               `json:"status"`
	Installations   []LegacyInstallation `json:"installations"`
	DataDirectories []string             `json:"dataDirectories"`
	Running         bool                 `json:"running"`
	Errors          []string             `json:"errors"`
}

type MigrationReport struct {
	Category    string `json:"category"`
	Imported    int    `json:"imported"`
	Omitted     int    `json:"omitted"`
	CompletedAt string `json:"completedAt"`
}

type Migration struct{ stores *Stores }

func NewMigration(stores *Stores) *Migration { return &Migration{stores: stores} }

func (*Migration) Detect() LegacyDetection {
	result := LegacyDetection{Installations: []LegacyInstallation{}, DataDirectories: []string{}, Errors: []string{}}
	config, err := os.UserConfigDir()
	if err != nil {
		result.Errors = append(result.Errors, err.Error())
	}
	cache, err := os.UserCacheDir()
	if err != nil {
		result.Errors = append(result.Errors, err.Error())
	}
	bases := []string{config, cache}
	if runtime.GOOS == "linux" {
		data := os.Getenv("XDG_DATA_HOME")
		if data == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				result.Errors = append(result.Errors, err.Error())
			} else {
				data = filepath.Join(home, ".local", "share")
			}
		}
		bases = append([]string{data}, bases...)
	}
	for _, base := range bases {
		if base == "" {
			continue
		}
		path := filepath.Join(base, legacyIdentifier)
		info, err := os.Lstat(path)
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			result.Errors = append(result.Errors, err.Error())
			continue
		}
		if info.IsDir() && info.Mode()&os.ModeSymlink == 0 && !slices.Contains(result.DataDirectories, path) {
			result.DataDirectories = append(result.DataDirectories, path)
		}
	}
	result.Installations, err = legacyInstallations()
	if err != nil {
		result.Errors = append(result.Errors, err.Error())
	}
	result.Running, err = legacyProcessRunning()
	if err != nil {
		result.Errors = append(result.Errors, err.Error())
	}
	result.Status = "not-detected"
	if len(result.DataDirectories) > 0 {
		result.Status = "data-only"
	}
	if len(result.Installations) > 0 {
		result.Status = "installed"
	}
	if len(result.Errors) > 0 {
		result.Status = "failed"
	}
	return result
}

func pathWithin(parent, child string) bool {
	relative, err := filepath.Rel(parent, child)
	return err == nil && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator))
}

func (m *Migration) sourceRoot(source string) (*os.Root, error) {
	if !filepath.IsAbs(source) {
		return nil, errors.New("select an absolute legacy data directory")
	}
	source = filepath.Clean(source)
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	if source == filepath.Dir(source) || source == home {
		return nil, errors.New("a filesystem root or home directory is not a migration source")
	}
	for path := source; ; path = filepath.Dir(path) {
		info, err := os.Lstat(path)
		if err != nil {
			return nil, err
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return nil, errors.New("migration source must not contain symlinks")
		}
		if path == filepath.Dir(path) {
			break
		}
	}
	target, err := filepath.Abs(filepath.Dir(m.stores.root))
	if err != nil {
		return nil, err
	}
	for _, development := range []bool{false, true} {
		paths, err := ResolvePaths(development)
		if err != nil {
			return nil, err
		}
		if pathWithin(source, paths.UserData) || pathWithin(paths.UserData, source) {
			return nil, errors.New("legacy and new data directories must not overlap")
		}
	}
	if pathWithin(source, target) || pathWithin(target, source) {
		return nil, errors.New("legacy and destination directories must not overlap")
	}
	return os.OpenRoot(source)
}

func (m *Migration) ImportAll() (MigrationReport, error) {
	detection := m.Detect()
	if detection.Running {
		return MigrationReport{}, errors.New("close the previous Project Graph before migrating")
	}
	if len(detection.DataDirectories) == 0 {
		return MigrationReport{}, errors.New("no previous Project Graph data found")
	}
	return m.importDirectories(detection.DataDirectories)
}

func (m *Migration) importDirectories(sources []string) (MigrationReport, error) {
	report := MigrationReport{Category: "all"}
	roots := make([]*os.Root, 0, len(sources))
	for _, source := range sources {
		root, err := m.sourceRoot(source)
		if err != nil {
			return report, err
		}
		defer root.Close()
		roots = append(roots, root)
	}
	m.stores.mu.Lock()
	defer m.stores.mu.Unlock()
	if err := os.MkdirAll(filepath.Dir(m.stores.root), 0700); err != nil {
		return report, err
	}
	target, err := os.OpenRoot(filepath.Dir(m.stores.root))
	if err != nil {
		return report, err
	}
	defer target.Close()
	var copyDirectory func(*os.Root, string, string) error
	copyDirectory = func(root *os.Root, from, to string) error {
		directory, err := root.Open(from)
		if err != nil {
			return err
		}
		items, readErr := directory.ReadDir(-1)
		closeErr := directory.Close()
		if err := errors.Join(readErr, closeErr); err != nil {
			return err
		}
		if err := target.MkdirAll(to, 0700); err != nil {
			return err
		}
		for _, item := range items {
			if from == "." {
				switch strings.ToLower(item.Name()) {
				case "onboarding.json", "ebwebview", "webview", "cache", "logs":
					continue
				}
			}
			src := filepath.Join(from, item.Name())
			dst := filepath.Join(to, item.Name())
			if from == "." && storeName.MatchString(item.Name()) {
				dst = filepath.Join("stores", item.Name())
			}
			if item.IsDir() {
				if err := copyDirectory(root, src, dst); err != nil {
					return err
				}
				continue
			}
			if item.Type()&os.ModeSymlink != 0 || !item.Type().IsRegular() {
				return fmt.Errorf("cannot copy special file: %s", src)
			}
			data, err := root.ReadFile(src)
			if err != nil {
				return err
			}
			if err := target.MkdirAll(filepath.Dir(dst), 0700); err != nil {
				return err
			}
			if err := replaceFile(target, dst, data, 0600); err != nil {
				return err
			}
			report.Imported++
		}
		return nil
	}
	// Prefer the primary data directory over local/cache copies of the same file.
	for _, root := range slices.Backward(roots) {
		if err := copyDirectory(root, ".", "."); err != nil {
			return report, err
		}
	}
	report.CompletedAt = time.Now().UTC().Format(time.RFC3339)
	return report, nil
}
