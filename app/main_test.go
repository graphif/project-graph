package main

import (
	"context"
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"
)

func TestEntryMode(t *testing.T) {
	for _, test := range []struct {
		name string
		args []string
		cli  bool
	}{
		{"desktop", nil, false},
		{"automation launch", []string{"--automation"}, false},
		{"file open", []string{"example.prg"}, false},
		{"URL open", []string{"project-graph://open/example"}, false},
		{"help", []string{"--help"}, true},
		{"version", []string{"--version"}, true},
		{"tool discovery", []string{"tool", "list"}, true},
		{"tool invocation", []string{"tool", "invoke", "get_all_nodes"}, true},
		{"request status", []string{"request", "status", "id"}, true},
		{"invalid tool command", []string{"tool"}, true},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := isCLIInvocation(test.args); got != test.cli {
				t.Fatalf("isCLIInvocation(%q) = %v, want %v", test.args, got, test.cli)
			}
		})
	}
}

func TestCLILocalCommands(t *testing.T) {
	for _, test := range []struct {
		name string
		args []string
		code int
		want string
		json bool
	}{
		{"help", []string{"--help"}, 0, "Usage:", false},
		{"version", []string{"--version"}, 0, "", false},
		{"describe", []string{"tool", "describe", "get_image_file"}, 0, "get_image_file", true},
		{"unknown tool", []string{"tool", "describe", "missing"}, 1, "UNKNOWN_TOOL", true},
		{"invalid command", []string{"tool"}, 1, "INVALID_COMMAND", true},
	} {
		t.Run(test.name, func(t *testing.T) {
			file, err := os.CreateTemp(t.TempDir(), "stdout")
			if err != nil {
				t.Fatal(err)
			}
			defer file.Close()
			previous := os.Stdout
			os.Stdout = file
			defer func() { os.Stdout = previous }()
			if code := runCLI(context.Background(), test.args); code != test.code {
				t.Fatalf("exit code = %d, want %d", code, test.code)
			}
			if _, err := file.Seek(0, io.SeekStart); err != nil {
				t.Fatal(err)
			}
			output, err := io.ReadAll(file)
			if err != nil {
				t.Fatal(err)
			}
			if !strings.Contains(string(output), test.want) || len(output) == 0 {
				t.Fatalf("unexpected output: %s", output)
			}
			if test.json && !json.Valid(output) {
				t.Fatalf("invalid JSON: %s", output)
			}
		})
	}
}
