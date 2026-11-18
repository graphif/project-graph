package main

import (
	"fmt"
	"os"

	"golang.org/x/sys/windows"
)

func prepareCLIConsole() error {
	if hasCLIOutput(os.Stdout) {
		return nil
	}
	// Windows GUI executables have no console by default; keep inherited pipes intact.
	attachConsole := windows.NewLazySystemDLL("kernel32.dll").NewProc("AttachConsole")
	attached, _, err := attachConsole.Call(uintptr(^uint32(0)))
	if attached == 0 && err != windows.ERROR_ACCESS_DENIED {
		return fmt.Errorf("cannot attach CLI to parent console: %w", err)
	}
	output, err := os.OpenFile("CONOUT$", os.O_WRONLY, 0)
	if err != nil {
		return fmt.Errorf("cannot open CLI console output: %w", err)
	}
	os.Stdout = output
	if !hasCLIOutput(os.Stderr) {
		os.Stderr = output
	}
	return nil
}

func hasCLIOutput(file *os.File) bool {
	if file == nil {
		return false
	}
	_, err := windows.GetFileType(windows.Handle(file.Fd()))
	return err == nil
}
