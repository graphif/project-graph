package desktop

import (
	"os/exec"
	"syscall"
)

func hideCommand(command *exec.Cmd) {
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
