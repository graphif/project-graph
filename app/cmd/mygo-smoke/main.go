package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/egoist/mygo"
	"github.com/graphif/project-graph/app/internal/desktop"
)

// This development-only check uses a hidden WebView and a disposable data directory.
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println("MyGo WebView bridge: store persistence, binary file I/O and Go errors passed")
}

func run() error {
	directory, err := os.MkdirTemp("", "project-graph-mygo-smoke-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(directory)
	mygo.App.SetName("Project Graph MyGo Smoke")
	mygo.App.SetPath(mygo.PathUserData, filepath.Join(directory, "data"))
	mygo.App.SetPath(mygo.PathCache, filepath.Join(directory, "cache"))
	mygo.App.SetPath(mygo.PathLogs, filepath.Join(directory, "logs"))
	mygo.Bind(desktop.NewStores(directory))
	mygo.Bind(&desktop.Files{})
	binaryPath := filepath.Join(directory, "binary.prg")
	encodedPath, err := json.Marshal(binaryPath)
	if err != nil {
		return err
	}
	result := make(chan error, 1)
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-time.After(30 * time.Second):
			result <- fmt.Errorf("MyGo smoke test timed out")
			mygo.App.Quit()
		case <-done:
		}
	}()
	mygo.App.WhenReady(func() {
		window := mygo.NewWindow(mygo.WindowOptions{URL: "about:blank", Hidden: true})
		window.Page().OnDOMReady(func() {
			go func() {
				value, err := mygo.EvalAs[bool](window.Page(), fmt.Sprintf(`
                  await mygo.call("Stores.Set", "smoke.json", "theme", "dark");
                  const values = await mygo.call("Stores.Read", "smoke.json");
                  if (values.theme !== "dark") throw new Error("Store roundtrip failed");
                  let rejected = false;
                  try { await mygo.call("Stores.Read", "../escape.json"); }
                  catch { rejected = true; }
                  if (!rejected) throw new Error("Traversal was accepted");
                  const path = %s;
                  await mygo.call("Files.Write", path, "AAH/");
                  const bytes = await mygo.call("Files.Read", path);
                  if (bytes !== "AAH/") throw new Error("Binary base64 roundtrip failed");
                  return true;
                `, encodedPath))
				if err == nil && !value {
					err = fmt.Errorf("page did not confirm bridge checks")
				}
				result <- err
				mygo.App.Quit()
			}()
		})
	})
	if err := mygo.App.Run(); err != nil {
		return err
	}
	select {
	case err := <-result:
		if err != nil {
			return err
		}
	case <-time.After(time.Second):
		return fmt.Errorf("MyGo quit before bridge verification completed")
	}
	values, err := desktop.NewStores(directory).Read("smoke.json")
	if err != nil {
		return err
	}
	if values["theme"] != "dark" {
		return fmt.Errorf("store mutation was not persisted")
	}
	bytes, err := os.ReadFile(binaryPath)
	if err != nil {
		return err
	}
	if string(bytes) != string([]byte{0, 1, 255}) {
		return fmt.Errorf("binary mutation was not persisted")
	}
	return nil
}
