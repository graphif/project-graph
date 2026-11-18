package main

import (
	"io"
	"os"
	"testing"
)

func TestCLIConsolePreservesRedirectedOutput(t *testing.T) {
	file, err := os.CreateTemp(t.TempDir(), "output")
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	reader, writer, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	defer writer.Close()
	for _, output := range []*os.File{file, writer} {
		t.Run(output.Name(), func(t *testing.T) {
			previous := os.Stdout
			os.Stdout = output
			defer func() { os.Stdout = previous }()
			if err := prepareCLIConsole(); err != nil {
				t.Fatal(err)
			}
			if os.Stdout != output {
				t.Fatal("CLI replaced redirected stdout")
			}
			if _, err := io.WriteString(os.Stdout, "CLI output"); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestCLIOutputRejectsMissingHandles(t *testing.T) {
	if hasCLIOutput(nil) {
		t.Fatal("nil output is valid")
	}
	file, err := os.CreateTemp(t.TempDir(), "closed")
	if err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	if hasCLIOutput(file) {
		t.Fatal("closed output is valid")
	}
}
