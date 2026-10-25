//go:build !windows

package desktop

import "os/exec"

func hideCommand(command *exec.Cmd) {}
