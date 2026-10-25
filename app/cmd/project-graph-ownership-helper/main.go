package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/graphif/project-graph/app/internal/desktop"
)

func main() { os.Exit(run()) }
func output(value any) {
	if err := json.NewEncoder(os.Stdout).Encode(value); err != nil {
		fmt.Fprintln(os.Stderr, err)
	}
}
func run() int {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "expected command and project path")
		return 1
	}
	command, path := os.Args[1], os.Args[2]
	if command == "try-hold-project" || command == "hold-connectable-project" {
		endpoint := ""
		if len(os.Args) > 3 {
			endpoint = os.Args[3]
		}
		ownership := desktop.NewOwnership(endpoint)
		defer desktop.CloseOwnership(ownership)
		acquired, err := ownership.Acquire(path, false)
		if err != nil {
			output(map[string]any{"status": "error", "code": "PROJECT_LOAD_FAILED"})
			return 1
		}
		if acquired.Status == "error" {
			output(map[string]any{"status": "error", "code": acquired.Code})
			return 1
		}
		if acquired.Status == "busy" {
			output(map[string]any{"status": "busy", "owner": acquired.Owner})
			return 75
		}
		if command == "hold-connectable-project" {
			if err := ownership.MakeConnectable(acquired.OwnershipID); err != nil {
				output(map[string]any{"status": "error", "code": "PROJECT_LOAD_FAILED"})
				return 1
			}
		}
		output(map[string]any{"status": "acquired", "canonicalPath": acquired.CanonicalPath})
		_, err = io.Copy(io.Discard, os.Stdin)
		if err != nil {
			return 1
		}
		return 0
	}
	paths, err := desktop.ResolvePaths(false)
	if err != nil {
		return 1
	}
	references := desktop.NewReferences(paths.UserData)
	switch command {
	case "load-project-references":
		snapshot, err := references.Load(path, "")
		if err != nil {
			output(map[string]any{"status": "error", "code": "REFERENCE_STORE_LOAD_FAILED"})
			return 1
		}
		output(map[string]any{"status": "loaded", "snapshot": snapshot})
		return 0
	case "save-project-references":
		var snapshot map[string]any
		err := json.NewDecoder(io.LimitReader(os.Stdin, 8*1024*1024)).Decode(&snapshot)
		if err == nil {
			err = references.Save(path, snapshot)
		}
		if err != nil {
			output(map[string]any{"status": "error", "code": "REFERENCE_STORE_SAVE_FAILED"})
			return 1
		}
		output(map[string]any{"status": "saved"})
		return 0
	default:
		fmt.Fprintln(os.Stderr, "unknown helper command")
		return 1
	}
}
