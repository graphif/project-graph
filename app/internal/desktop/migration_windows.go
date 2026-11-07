package desktop

import (
	"encoding/csv"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"

	"golang.org/x/sys/windows/registry"
)

func legacyInstallations() ([]LegacyInstallation, error) {
	result := []LegacyInstallation{}
	for _, hive := range []registry.Key{registry.CURRENT_USER, registry.LOCAL_MACHINE} {
		for _, view := range []uint32{registry.WOW64_64KEY, registry.WOW64_32KEY} {
			for _, name := range []string{legacyIdentifier, "Project Graph"} {
				key, err := registry.OpenKey(hive, `Software\Microsoft\Windows\CurrentVersion\Uninstall\`+name, registry.QUERY_VALUE|view)
				if errors.Is(err, registry.ErrNotExist) {
					continue
				}
				if err != nil {
					return result, err
				}
				path, _, _ := key.GetStringValue("InstallLocation")
				version, _, _ := key.GetStringValue("DisplayVersion")
				key.Close()
				result = append(result, LegacyInstallation{Path: path, Version: version, Evidence: "legacy uninstall registration (installation candidate)"})
			}
		}
	}
	return result, nil
}

func legacyProcessRunning() (bool, error) {
	command := exec.Command(filepath.Join(os.Getenv("SystemRoot"), "System32", "tasklist.exe"), "/FO", "CSV", "/NH")
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := command.Output()
	if err != nil {
		return false, err
	}
	rows, err := csv.NewReader(strings.NewReader(string(output))).ReadAll()
	if err != nil {
		return false, err
	}
	for _, row := range rows {
		if len(row) < 2 {
			continue
		}
		name := strings.ToLower(row[0])
		pid, err := strconv.Atoi(row[1])
		if err != nil {
			return false, err
		}
		if pid != os.Getpid() && (name == "project-graph.exe" || name == "project graph.exe") {
			return true, nil
		}
	}
	return false, nil
}
