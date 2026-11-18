package desktop

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

const Identifier = "dev.graphif.prg"

type Paths struct {
	UserData string `json:"userData"`
	Cache    string `json:"cache"`
	Logs     string `json:"logs"`
}

func ResolvePaths(development bool) (Paths, error) {
	config, err := os.UserConfigDir()
	if err != nil {
		return Paths{}, fmt.Errorf("resolve configuration directory: %w", err)
	}
	cache, err := os.UserCacheDir()
	if err != nil {
		return Paths{}, fmt.Errorf("resolve cache directory: %w", err)
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return Paths{}, fmt.Errorf("resolve home directory: %w", err)
	}
	return resolvePaths(config, cache, home, runtime.GOOS, development), nil
}

func resolvePaths(config, cache, home, platform string, development bool) Paths {
	id := Identifier
	if development {
		id += ".dev"
	}
	paths := Paths{
		UserData: filepath.Join(config, id),
		Cache:    filepath.Join(cache, id, "cache"),
	}
	paths.Logs = filepath.Join(paths.UserData, "logs")
	if platform == "darwin" {
		paths.Logs = filepath.Join(home, "Library", "Logs", id)
	}
	return paths
}
