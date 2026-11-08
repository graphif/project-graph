package main

import (
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
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
