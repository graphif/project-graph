package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/plugins/fetch"
	"github.com/egoist/mygo/plugins/updater"
	"github.com/graphif/project-graph/app/internal/automation"
	"github.com/graphif/project-graph/app/internal/desktop"
	"golang.org/x/net/publicsuffix"
)

var openRequestsChanged = mygo.NewEvent[bool]("open-requests-changed")

func main() {
	args := os.Args[1:]
	if isCLIInvocation(args) {
		if err := prepareCLIConsole(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		os.Exit(runCLIWithSignals(args))
	}
	runGUI()
}

func runCLIWithSignals(args []string) int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	return runCLI(ctx, args)
}

func isCLIInvocation(args []string) bool {
	if len(args) == 0 {
		return false
	}
	switch args[0] {
	case "tool", "request", "--help", "--version":
		return true
	default:
		return false
	}
}

func failCLI(code string, err error) int {
	json.NewEncoder(os.Stdout).Encode(map[string]any{"ok": false, "error": map[string]string{"code": code, "message": err.Error()}})
	return 1
}

func runCLI(ctx context.Context, args []string) int {
	if len(args) == 1 && args[0] == "--version" {
		fmt.Println(mygo.App.Version())
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
			return failCLI("CATALOG_INVALID", err)
		}
		for _, entry := range entries {
			var tool struct {
				Name string `json:"name"`
			}
			if err := json.Unmarshal(entry, &tool); err != nil {
				return failCLI("CATALOG_INVALID", err)
			}
			if tool.Name == args[2] {
				fmt.Println(string(entry))
				return 0
			}
		}
		return failCLI("UNKNOWN_TOOL", fmt.Errorf("unknown tool: %s", args[2]))
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
				return failCLI("INVALID_COMMAND", fmt.Errorf("missing value: %s", args[i]))
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
				return failCLI("INVALID_COMMAND", fmt.Errorf("unknown option: %s", key))
			}
		}
		if request.ProjectPath == "" || !json.Valid(request.Input) {
			return failCLI("INVALID_COMMAND", fmt.Errorf("--project and valid --input JSON are required"))
		}
		path, err := filepath.Abs(request.ProjectPath)
		if err != nil {
			return failCLI("PROJECT_NOT_FOUND", err)
		}
		if !strings.EqualFold(filepath.Ext(path), ".prg") {
			return failCLI("PROJECT_LOAD_FAILED", fmt.Errorf("expected a .prg file"))
		}
		if info, err := os.Stat(path); err != nil || !info.Mode().IsRegular() {
			return failCLI("PROJECT_NOT_FOUND", fmt.Errorf("project is not a regular file: %s", path))
		}
		request.ProjectPath = path
	default:
		return failCLI("INVALID_COMMAND", fmt.Errorf("use --help for supported commands"))
	}
	if request.RequestID == "" {
		id, err := automation.NewID()
		if err != nil {
			return failCLI("REQUEST_FAILED", err)
		}
		request.RequestID = id
	}
	path, err := automation.SessionPath()
	if err != nil {
		return failCLI("GUI_UNAVAILABLE", err)
	}
	readyContext, cancel := context.WithTimeout(ctx, 30*time.Second)
	session, err := automation.Connect(readyContext, path, automation.LaunchGUI)
	cancel()
	if err != nil {
		return failCLI("GUI_UNAVAILABLE", err)
	}
	callContext, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	response, err := automation.Call(callContext, session, request)
	if err != nil {
		return failCLI("RESULT_UNKNOWN", fmt.Errorf("request %s: %w; query request status before retrying", request.RequestID, err))
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

func runGUI() {
	paths, err := desktop.ResolvePaths(mygo.IsDev())
	if err != nil {
		log.Fatal(err)
	}
	mygo.App.SetPath(mygo.PathUserData, paths.UserData)
	mygo.App.SetPath(mygo.PathCache, paths.Cache)
	mygo.App.SetPath(mygo.PathLogs, paths.Logs)
	jar, err := cookiejar.New(&cookiejar.Options{PublicSuffixList: publicsuffix.List})
	if err != nil {
		log.Fatal(err)
	}
	mygo.Use(fetch.New(fetch.Options{Client: &http.Client{Jar: jar}}))
	mygo.Use(updater.Plugin)

	host := desktop.NewHost(paths, mygo.App.Version, mygo.IsDev())
	mygo.Bind(host)
	stores := desktop.NewStores(paths.UserData)
	mygo.Bind(stores)
	mygo.Bind(desktop.NewMigration(stores))
	mygo.Bind(desktop.NewNative(stores))
	mygo.Bind(&desktop.Files{})
	mygo.Bind(&desktop.Dialogs{})
	mygo.Bind(&desktop.Algorithms{})
	bridge := desktop.NewBridge()
	mygo.Bind(bridge)
	ownership := desktop.NewOwnership("")
	mygo.Bind(ownership)
	mygo.Bind(desktop.NewReferences(paths.UserData))

	enqueue := func(kind, target string) {
		if err := desktop.Enqueue(host, kind, target); err != nil {
			log.Print(err)
		}
		openRequestsChanged.Broadcast(true)
	}
	mygo.App.OnOpenFile(func(path string) { enqueue("file", path) })
	mygo.App.OnOpenURL(func(rawURL string) { enqueue("url", rawURL) })
	if os.Getenv("MYGO_GENERATE") == "" && !mygo.App.RequestSingleInstanceLock() {
		return
	}

	var window *mygo.Window
	openWindow := func() {
		options := mygo.WindowOptions{
			Title: "Project Graph", URL: "/", Width: 1280, Height: 800,
			MinWidth: 720, MinHeight: 480, StateKey: "workspace", Frameless: true,
		}
		if runtime.GOOS == "darwin" {
			options.Frameless = false
			options.TitleBarStyle = mygo.TitleBarHiddenInset
		}
		window = mygo.NewWindow(options)
		window.OnClose(func(event *mygo.CloseEvent) { event.PreventDefault(); desktop.WindowCloseRequested.Emit(window, true) })
		window.OnClosed(func() { window = nil })
	}
	mygo.App.OnSecondInstance(func(_ []string, _ string) {
		if window != nil {
			window.Restore()
			window.Focus()
		}
	})
	mygo.App.WhenReady(func() {
		endpoint, err := desktop.StartBridge(bridge)
		if err != nil {
			mygo.Dialog.Error("Cannot start desktop bridge", err.Error())
			mygo.App.Quit()
			return
		}
		desktop.SetOwnershipEndpoint(ownership, endpoint)
		if err := desktop.PublishAutomation(bridge, paths.UserData, endpoint); err != nil {
			mygo.Dialog.Error("Cannot publish automation endpoint", err.Error())
			mygo.App.Quit()
			return
		}
		openWindow()
	})
	defer desktop.CloseBridge(bridge)
	defer desktop.CloseOwnership(ownership)
	mygo.App.OnWindowAllClosed(func() {
		if runtime.GOOS != "darwin" {
			mygo.App.Quit()
		}
	})
	mygo.App.OnActivate(func(hasVisibleWindows bool) {
		if !hasVisibleWindows {
			if window == nil {
				openWindow()
			} else {
				window.Show()
			}
		}
	})
	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}
