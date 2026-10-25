package desktop

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/egoist/mygo"
	"github.com/egoist/mygo/plugins/updater"
)

var WindowCloseRequested = mygo.NewEvent[bool]("window-close-requested")
var ShortcutPressed = mygo.NewEvent[string]("shortcut-pressed")
var MenuCommand = mygo.NewEvent[string]("menu-command")

type Native struct{ stores *Stores }

func NewNative(stores *Stores) *Native { return &Native{stores: stores} }

func (Native) Path(name string) (string, error) {
	paths := map[string]mygo.PathName{
		"data": mygo.PathUserData, "cache": mygo.PathCache, "logs": mygo.PathLogs,
		"home": mygo.PathHome, "temp": mygo.PathTemp, "resources": mygo.PathResources,
	}
	path, ok := paths[name]
	if !ok {
		return "", errors.New("unknown application path")
	}
	return mygo.App.Path(path)
}
func (Native) Join(parts []string) string { return filepath.Join(parts...) }
func (Native) Dirname(path string) string { return filepath.Dir(path) }
func (Native) Open(path string) error {
	u, err := url.Parse(path)
	if err == nil && (u.Scheme == "http" || u.Scheme == "https" || u.Scheme == "mailto") {
		return mygo.Shell.OpenExternal(path)
	}
	if !filepath.IsAbs(path) {
		return errors.New("expected an absolute file path or http(s)/mailto URL")
	}
	return mygo.Shell.OpenPath(path)
}
func (Native) WriteText(text string)            { mygo.Clipboard.WriteText(text) }
func (Native) ReadText() string                 { return mygo.Clipboard.ReadText() }
func (Native) WriteImage(png []byte) error      { return mygo.Clipboard.WriteImage(png) }
func (Native) ReadImage() []byte                { return mygo.Clipboard.ReadImage() }
func (Native) WriteStdout(text string)          { fmt.Fprintln(os.Stdout, text) }
func (Native) WriteStderr(text string)          { fmt.Fprintln(os.Stderr, text) }
func (Native) Exit(code int)                    { mygo.App.Exit(code) }
func (Native) OpenDevtools(ctx context.Context) { mygo.CallerWindow(ctx).Page().OpenDevTools() }
func (n *Native) DeviceID() (string, error) {
	n.stores.mu.Lock()
	defer n.stores.mu.Unlock()
	root, err := n.stores.open("device.json")
	if err != nil {
		return "", err
	}
	defer root.Close()
	values, err := readStore(root, "device.json")
	if err != nil {
		return "", err
	}
	if id, ok := values["id"].(string); ok {
		return id, nil
	}
	id := rand.Text()
	values["id"] = id
	return id, writeStore(root, "device.json", values)
}
func (Native) SystemInfo() map[string]any {
	return map[string]any{"platform": runtime.GOOS, "arch": runtime.GOARCH, "cpus": runtime.NumCPU()}
}
func (Native) Restore(ctx context.Context)           { mygo.CallerWindow(ctx).Restore() }
func (Native) IsFullscreen(ctx context.Context) bool { return mygo.CallerWindow(ctx).IsFullScreen() }
func (Native) SetFullscreen(ctx context.Context, value bool) {
	mygo.CallerWindow(ctx).SetFullScreen(value)
}
func (Native) CheckForUpdates()            { updater.CheckForUpdates() }
func (Native) Show(ctx context.Context)    { mygo.CallerWindow(ctx).Show() }
func (Native) Hide(ctx context.Context)    { mygo.CallerWindow(ctx).Hide() }
func (Native) Destroy(ctx context.Context) { mygo.CallerWindow(ctx).Destroy() }
func (Native) Focus(ctx context.Context)   { mygo.CallerWindow(ctx).Focus() }
func (Native) SetSkipTaskbar(ctx context.Context, value bool) {
	mygo.CallerWindow(ctx).SetSkipTaskbar(value)
}
func (Native) SetAlwaysOnTop(ctx context.Context, value bool) {
	mygo.CallerWindow(ctx).SetAlwaysOnTop(value)
}
func (Native) SetIgnoreCursorEvents(ctx context.Context, value bool) {
	mygo.CallerWindow(ctx).SetIgnoreMouseEvents(value)
}
func (Native) SetSize(ctx context.Context, width, height int) {
	mygo.CallerWindow(ctx).SetSize(width, height)
}
func (Native) SetResizable(ctx context.Context, value bool) {
	mygo.CallerWindow(ctx).SetResizable(value)
}
func (Native) RegisterShortcut(accelerator string) error {
	return mygo.GlobalShortcut.Register(accelerator, func() { ShortcutPressed.Broadcast(accelerator) })
}
func (Native) UnregisterShortcut(accelerator string) { mygo.GlobalShortcut.Unregister(accelerator) }
func (Native) UnregisterAllShortcuts()               { mygo.GlobalShortcut.UnregisterAll() }
func (Native) IsShortcutRegistered(accelerator string) bool {
	return mygo.GlobalShortcut.IsRegistered(accelerator)
}

type CommandResult struct {
	Code   int    `json:"code"`
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
}

func (Native) RunCommand(ctx context.Context, program string, args []string, stdin string) (CommandResult, error) {
	command := exec.CommandContext(ctx, program, args...)
	hideCommand(command)
	command.Stdin = strings.NewReader(stdin)
	var stdout, stderr bytes.Buffer
	command.Stdout, command.Stderr = &stdout, &stderr
	err := command.Run()
	var exit *exec.ExitError
	if err != nil && !errors.As(err, &exit) {
		return CommandResult{}, err
	}
	return CommandResult{command.ProcessState.ExitCode(), stdout.String(), stderr.String()}, nil
}

type MenuEntry struct {
	ID        string      `json:"id"`
	Label     string      `json:"label"`
	Separator bool        `json:"separator"`
	Disabled  bool        `json:"disabled"`
	Children  []MenuEntry `json:"children"`
}

func (Native) SetMenu(entries []MenuEntry) {
	var convert func([]MenuEntry) []*mygo.MenuItem
	convert = func(entries []MenuEntry) []*mygo.MenuItem {
		items := make([]*mygo.MenuItem, 0, len(entries))
		for _, entry := range entries {
			if entry.Separator {
				items = append(items, mygo.Separator())
				continue
			}
			item := &mygo.MenuItem{ID: entry.ID, Label: entry.Label, Disabled: entry.Disabled}
			if len(entry.Children) > 0 {
				item.Submenu = convert(entry.Children)
			} else {
				id := entry.ID
				item.Click = func(_ *mygo.MenuItem, _ *mygo.Window) { MenuCommand.Broadcast(id) }
			}
			items = append(items, item)
		}
		return items
	}
	items := convert(entries)
	if runtime.GOOS == "darwin" {
		appItems := []*mygo.MenuItem{}
		top := []*mygo.MenuItem{}
		for _, item := range items {
			if item.ID == "settings" || item.ID == "about" {
				appItems = append(appItems, item)
				continue
			}
			if item.ID == "window" {
				item.Role = mygo.RoleWindow
				item.Submenu = append([]*mygo.MenuItem{{Role: mygo.RoleMinimize}, {Role: mygo.RoleZoom}, mygo.Separator()}, item.Submenu...)
			}
			top = append(top, item)
		}
		appItems = append(appItems, mygo.Separator(), &mygo.MenuItem{Role: mygo.RoleServices}, mygo.Separator(), &mygo.MenuItem{Role: mygo.RoleHide}, &mygo.MenuItem{Role: mygo.RoleHideOthers}, &mygo.MenuItem{Role: mygo.RoleUnhide}, mygo.Separator(), &mygo.MenuItem{Role: mygo.RoleQuit})
		items = append([]*mygo.MenuItem{{Label: "Project Graph", Submenu: appItems}}, top...)
	}
	mygo.App.SetMenu(mygo.NewMenu(items))
}
