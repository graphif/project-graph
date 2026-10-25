package main

import (
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"path/filepath"
	"runtime"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/plugins/fetch"
	"github.com/egoist/mygo/plugins/updater"
	"github.com/graphif/project-graph/app/internal/desktop"
	"golang.org/x/net/publicsuffix"
)

var openRequestsChanged = mygo.NewEvent[bool]("open-requests-changed")

func main() {
	paths, err := desktop.ResolvePaths(mygo.IsDev())
	if err != nil {
		log.Fatal(err)
	}
	acceptance := mygo.IsDev() && os.Getenv("PROJECT_GRAPH_CLI_DESKTOP_ACCEPTANCE_MANIFEST_PATH") != ""
	if acceptance {
		directory := os.Getenv("PROJECT_GRAPH_ACCEPTANCE_DIRECTORY")
		if !filepath.IsAbs(directory) {
			log.Fatal("desktop acceptance requires an absolute isolated directory")
		}
		paths = desktop.Paths{UserData: filepath.Join(directory, "data"), Cache: filepath.Join(directory, "cache"), Logs: filepath.Join(directory, "logs")}
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
	mygo.Bind(desktop.NewNative(stores))
	mygo.Bind(&desktop.Files{})
	mygo.Bind(&desktop.Dialogs{})
	bridge := desktop.NewBridge()
	mygo.Bind(bridge)
	ownership := desktop.NewOwnership("")
	mygo.Bind(ownership)
	mygo.Bind(desktop.NewReferences(paths.UserData))
	mcp := desktop.NewMCP(mygo.App.Version())
	mygo.Bind(mcp)
	if mygo.IsDev() {
		mygo.Bind(&desktop.Acceptance{})
	}

	enqueue := func(kind, target string) {
		if err := desktop.Enqueue(host, kind, target); err != nil {
			log.Print(err)
		}
		openRequestsChanged.Broadcast(true)
	}
	mygo.App.OnOpenFile(func(path string) { enqueue("file", path) })
	mygo.App.OnOpenURL(func(rawURL string) { enqueue("url", rawURL) })
	if !acceptance && os.Getenv("MYGO_GENERATE") == "" && !mygo.App.RequestSingleInstanceLock() {
		return
	}

	var window *mygo.Window
	openWindow := func() {
		url := "/"
		if acceptance {
			url = "/?cli-desktop-acceptance=1"
		}
		options := mygo.WindowOptions{
			Title: "Project Graph", URL: url, Width: 1280, Height: 800,
			MinWidth: 720, MinHeight: 480, StateKey: "workspace", Frameless: true,
		}
		if runtime.GOOS == "darwin" {
			options.Frameless = false
			options.TitleBarStyle = mygo.TitleBarHiddenInset
		}
		if acceptance {
			options.StateKey = ""
		}
		window = mygo.NewWindow(options)
		if acceptance {
			window.SetSkipTaskbar(true)
		}
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
		openWindow()
	})
	defer desktop.CloseBridge(bridge)
	defer desktop.CloseOwnership(ownership)
	defer desktop.CloseMCP(mcp)
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
