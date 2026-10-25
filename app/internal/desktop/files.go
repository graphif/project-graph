package desktop

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

type DirectoryEntry struct {
	Name      string `json:"name"`
	IsFile    bool   `json:"isFile"`
	IsDir     bool   `json:"isDirectory"`
	IsSymlink bool   `json:"isSymlink"`
}

type Files struct{}

func validateFilePath(path string) error {
	if !filepath.IsAbs(path) || filepath.Clean(path) == filepath.VolumeName(path)+string(filepath.Separator) {
		return errors.New("expected an absolute path below a filesystem root")
	}
	return nil
}

func (Files) Read(path string) ([]byte, error) {
	if err := validateFilePath(path); err != nil {
		return nil, err
	}
	return os.ReadFile(path)
}

func (Files) Write(path string, content []byte) error {
	if err := validateFilePath(path); err != nil {
		return err
	}
	root, err := os.OpenRoot(filepath.Dir(path))
	if err != nil {
		return err
	}
	defer root.Close()
	mode := os.FileMode(0600)
	if info, err := root.Lstat(filepath.Base(path)); err == nil {
		if !info.Mode().IsRegular() {
			return errors.New("refusing to replace a non-regular file")
		}
		mode = info.Mode().Perm()
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return replaceFile(root, filepath.Base(path), content, mode)
}

func (Files) ReadDir(path string) ([]DirectoryEntry, error) {
	if err := validateFilePath(path); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}
	result := make([]DirectoryEntry, 0, len(entries))
	for _, entry := range entries {
		result = append(result, DirectoryEntry{
			Name: entry.Name(), IsFile: entry.Type().IsRegular(),
			IsDir: entry.IsDir(), IsSymlink: entry.Type()&os.ModeSymlink != 0,
		})
	}
	return result, nil
}

func (Files) Exists(path string) (bool, error) {
	if err := validateFilePath(path); err != nil {
		return false, err
	}
	_, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	return err == nil, err
}

func (Files) Mkdir(path string, recursive bool) error {
	if err := validateFilePath(path); err != nil {
		return err
	}
	if recursive {
		return os.MkdirAll(path, 0700)
	}
	return os.Mkdir(path, 0700)
}

type FileInfo struct {
	Size        int64 `json:"size"`
	IsFile      bool  `json:"isFile"`
	IsDirectory bool  `json:"isDirectory"`
	IsSymlink   bool  `json:"isSymlink"`
	Mtime       int64 `json:"mtime"`
}

func (Files) Stat(path string, follow bool) (FileInfo, error) {
	if err := validateFilePath(path); err != nil {
		return FileInfo{}, err
	}
	var info fs.FileInfo
	var err error
	if follow {
		info, err = os.Stat(path)
	} else {
		info, err = os.Lstat(path)
	}
	if err != nil {
		return FileInfo{}, err
	}
	return FileInfo{info.Size(), info.Mode().IsRegular(), info.IsDir(), info.Mode()&os.ModeSymlink != 0, info.ModTime().UnixMilli()}, nil
}
func (Files) ReadRecursive(path string, extensions []string) ([]string, error) {
	if err := validateFilePath(path); err != nil {
		return nil, err
	}
	result := []string{}
	err := filepath.WalkDir(path, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.Type().IsRegular() {
			for _, extension := range extensions {
				if strings.EqualFold(filepath.Ext(path), extension) {
					result = append(result, path)
					break
				}
			}
		}
		return nil
	})
	return result, err
}

type Folder struct {
	Name        string   `json:"name"`
	Path        string   `json:"path"`
	IsDirectory bool     `json:"isDirectory"`
	Children    []Folder `json:"children"`
}

func (f Files) ReadStructure(path string) (Folder, error) {
	return readStructure(path, 0)
}
func readStructure(path string, depth int) (Folder, error) {
	if depth > 64 {
		return Folder{}, errors.New("folder tree exceeds 64 levels")
	}
	info, err := (Files{}).Stat(path, false)
	if err != nil {
		return Folder{}, err
	}
	result := Folder{Name: filepath.Base(path), Path: path, IsDirectory: info.IsDirectory, Children: []Folder{}}
	if info.IsDirectory {
		entries, err := os.ReadDir(path)
		if err != nil {
			return Folder{}, err
		}
		for _, entry := range entries {
			child, err := readStructure(filepath.Join(path, entry.Name()), depth+1)
			if err != nil {
				return Folder{}, err
			}
			result.Children = append(result.Children, child)
		}
	}
	return result, nil
}

func (Files) Rename(oldPath, newPath string) error {
	if err := validateFilePath(oldPath); err != nil {
		return err
	}
	if err := validateFilePath(newPath); err != nil {
		return err
	}
	return os.Rename(oldPath, newPath)
}

func (Files) Remove(path string) error {
	if err := validateFilePath(path); err != nil {
		return err
	}
	// Recursive deletion stays out of the page API; non-empty directories require a separate confirmed flow.
	return os.Remove(path)
}
