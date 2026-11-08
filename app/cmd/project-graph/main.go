package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"time"

	"github.com/graphif/project-graph/app/internal/automation"
)

var version = "development"

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	os.Exit(run(ctx, os.Args[1:]))
}

func fail(code string, err error) int {
	json.NewEncoder(os.Stdout).Encode(map[string]any{"ok": false, "error": map[string]string{"code": code, "message": err.Error()}})
	return 1
}

func run(ctx context.Context, args []string) int {
	if len(args) == 1 && args[0] == "--version" {
		fmt.Println(version)
		return 0
	}
	if len(args) == 0 || (len(args) == 1 && args[0] == "--help") {
		fmt.Println("Usage: project-graph tool list | tool describe <tool> | tool invoke <tool> --project <path> --input <JSON> [--allow-upgrade] [--request-id <id>] | request status <id>")
		return 0
	}
	request := automation.Request{}
	switch {
	case len(args) == 2 && args[0] == "tool" && args[1] == "list":
		fmt.Println(string(automation.Catalog))
		return 0
	case len(args) == 3 && args[0] == "tool" && args[1] == "describe":
		var entries []json.RawMessage
		if err := json.Unmarshal(automation.Catalog, &entries); err != nil {
			return fail("CATALOG_INVALID", err)
		}
		for _, entry := range entries {
			var tool struct {
				Name string `json:"name"`
			}
			if err := json.Unmarshal(entry, &tool); err != nil {
				return fail("CATALOG_INVALID", err)
			}
			if tool.Name == args[2] {
				fmt.Println(string(entry))
				return 0
			}
		}
		return fail("UNKNOWN_TOOL", fmt.Errorf("unknown tool: %s", args[2]))
	case len(args) == 3 && args[0] == "request" && args[1] == "status":
		request.Kind, request.RequestID = "status", args[2]
	case len(args) >= 3 && args[0] == "tool" && args[1] == "invoke":
		request.Kind, request.ToolName = "invoke", args[2]
		for i := 3; i < len(args); i++ {
			if args[i] == "--allow-upgrade" {
				request.AllowUpgrade = true
				continue
			}
			if i+1 >= len(args) {
				return fail("INVALID_COMMAND", fmt.Errorf("missing value: %s", args[i]))
			}
			key, value := args[i], args[i+1]
			i++
			switch key {
			case "--project":
				request.ProjectPath = value
			case "--input":
				request.Input = json.RawMessage(value)
			case "--request-id":
				request.RequestID = value
			default:
				return fail("INVALID_COMMAND", fmt.Errorf("unknown option: %s", key))
			}
		}
		if request.ProjectPath == "" || !json.Valid(request.Input) {
			return fail("INVALID_COMMAND", fmt.Errorf("--project and valid --input JSON are required"))
		}
		path, err := filepath.Abs(request.ProjectPath)
		if err != nil {
			return fail("PROJECT_NOT_FOUND", err)
		}
		if !strings.EqualFold(filepath.Ext(path), ".prg") {
			return fail("PROJECT_LOAD_FAILED", fmt.Errorf("expected a .prg file"))
		}
		if info, err := os.Stat(path); err != nil || !info.Mode().IsRegular() {
			return fail("PROJECT_NOT_FOUND", fmt.Errorf("project is not a regular file: %s", path))
		}
		request.ProjectPath = path
	default:
		return fail("INVALID_COMMAND", fmt.Errorf("use --help for supported commands"))
	}
	if request.RequestID == "" {
		id, err := automation.NewID()
		if err != nil {
			return fail("REQUEST_FAILED", err)
		}
		request.RequestID = id
	}
	path, err := automation.SessionPath()
	if err != nil {
		return fail("GUI_UNAVAILABLE", err)
	}
	readyContext, cancel := context.WithTimeout(ctx, 30*time.Second)
	session, err := automation.Connect(readyContext, path, automation.LaunchGUI)
	cancel()
	if err != nil {
		return fail("GUI_UNAVAILABLE", err)
	}
	callContext, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	response, err := automation.Call(callContext, session, request)
	if err != nil {
		return fail("RESULT_UNKNOWN", fmt.Errorf("request %s: %w; query request status before retrying", request.RequestID, err))
	}
	fmt.Println(string(response))
	var result struct {
		OK bool `json:"ok"`
	}
	if json.Unmarshal(response, &result) != nil || !result.OK {
		return 1
	}
	return 0
}
