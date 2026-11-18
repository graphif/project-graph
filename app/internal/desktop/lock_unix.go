//go:build !windows

package desktop

import (
	"errors"
	"golang.org/x/sys/unix"
	"os"
	"path/filepath"
)

func tryFileLock(file *os.File) (bool, error) {
	err := unix.Flock(int(file.Fd()), unix.LOCK_EX|unix.LOCK_NB)
	if errors.Is(err, unix.EWOULDBLOCK) {
		return false, nil
	}
	return err == nil, err
}
func canonicalName(path string) (string, error) { return filepath.EvalSymlinks(path) }
