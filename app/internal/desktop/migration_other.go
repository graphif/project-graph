//go:build !windows

package desktop

import (
	"encoding/xml"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

func legacyInstallations() ([]LegacyInstallation, error) {
	result := []LegacyInstallation{}
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	if runtime.GOOS == "darwin" {
		for _, base := range []string{"/Applications", filepath.Join(home, "Applications")} {
			path := filepath.Join(base, "Project Graph.app")
			data, err := os.ReadFile(filepath.Join(path, "Contents", "Info.plist"))
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			if err != nil {
				return result, err
			}
			var plist struct {
				Values []string `xml:"dict>string"`
			}
			if err := xml.Unmarshal(data, &plist); err != nil {
				return result, err
			}
			// Only accept the legacy bundle identity, not the new app with the same display name.
			for _, value := range plist.Values {
				if value == legacyIdentifier {
					result = append(result, LegacyInstallation{Path: path, Evidence: "legacy bundle identity"})
					break
				}
			}
		}
	} else {
		for _, base := range []string{"/usr/share/applications", "/usr/local/share/applications", filepath.Join(home, ".local", "share", "applications")} {
			path := filepath.Join(base, legacyIdentifier+".desktop")
			data, err := os.ReadFile(path)
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			if err != nil {
				return result, err
			}
			if strings.Contains(string(data), "[Desktop Entry]") {
				result = append(result, LegacyInstallation{Path: path, Evidence: "legacy desktop entry (package source not verified)"})
			}
		}
	}
	return result, nil
}

func legacyProcessRunning() (bool, error) {
	output, err := exec.Command("/bin/ps", "-axo", "pid=,comm=").Output()
	if err != nil {
		return false, err
	}
	for _, line := range strings.Split(string(output), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		pid, err := strconv.Atoi(fields[0])
		if err != nil {
			return false, err
		}
		name := strings.ToLower(filepath.Base(strings.Join(fields[1:], " ")))
		if pid != os.Getpid() && (name == "project-graph" || name == "project graph") {
			return true, nil
		}
	}
	return false, nil
}
