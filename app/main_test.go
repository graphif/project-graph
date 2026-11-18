package main

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"os"
	"path/filepath"
	"runtime"
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

func TestDMABufSafe(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("Linux renderer detection uses Unix sockets and sysfs driver links")
	}
	runtimeDir := t.TempDir()
	listener, err := net.Listen("unix", filepath.Join(runtimeDir, "wayland-1"))
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()

	makeHost := func(t *testing.T, files map[string]string) string {
		root := t.TempDir()
		renderDir := filepath.Join(root, "dev", "dri")
		if err := os.MkdirAll(renderDir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(renderDir, "renderD128"), nil, 0o644); err != nil {
			t.Fatal(err)
		}
		driverDir := filepath.Join(root, "sys/class/drm/renderD128/device")
		if err := os.MkdirAll(driverDir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.Symlink("../../../../bus/pci/drivers/i915", filepath.Join(driverDir, "driver")); err != nil {
			t.Fatal(err)
		}
		for name, content := range files {
			p := filepath.Join(root, name)
			if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
				t.Fatal(err)
			}
		}
		return root
	}

	baseEnv := map[string]string{
		"WAYLAND_DISPLAY": "wayland-1",
		"XDG_RUNTIME_DIR": runtimeDir,
	}
	withEnv := func(overrides ...string) func(string) string {
		env := make(map[string]string, len(baseEnv)+len(overrides)/2)
		for k, v := range baseEnv {
			env[k] = v
		}
		for i := 0; i < len(overrides); i += 2 {
			env[overrides[i]] = overrides[i+1]
		}
		return func(key string) string { return env[key] }
	}

	for _, tc := range []struct {
		name   string
		getenv func(string) string
		files  map[string]string
		want   bool
	}{
		{"wayland mesa laptop", withEnv(), map[string]string{"sys/class/dmi/id/product_name": "XPS 13\n"}, true},
		{"gdk backend x11", withEnv("GDK_BACKEND", "x11"), nil, false},
		{"missing wayland display", withEnv("WAYLAND_DISPLAY", ""), nil, false},
		{"software gl", withEnv("LIBGL_ALWAYS_SOFTWARE", "1"), nil, false},
		{"llvmpipe", withEnv("GALLIUM_DRIVER", "llvmpipe"), nil, false},
		{"nvidia module", withEnv(), map[string]string{"sys/module/nvidia/version": "550.0"}, false},
		{"nvidia device", withEnv(), map[string]string{"dev/nvidia0": ""}, false},
		{"docker container", withEnv(), map[string]string{".dockerenv": ""}, false},
		{"qemu vm", withEnv(), map[string]string{"sys/class/dmi/id/sys_vendor": "QEMU\n"}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := makeHost(t, tc.files)
			if got := dmabufSafe(tc.getenv, root); got != tc.want {
				t.Fatalf("dmabufSafe() = %v, want %v", got, tc.want)
			}
		})
	}
	for _, driver := range []string{"i915", "xe", "amdgpu", "radeon", "nouveau", "virtio_gpu", "unknown", ""} {
		t.Run("driver "+driver, func(t *testing.T) {
			root := makeHost(t, nil)
			path := filepath.Join(root, "sys/class/drm/renderD128/device/driver")
			if err := os.Remove(path); err != nil {
				t.Fatal(err)
			}
			if driver != "" {
				if err := os.Symlink(filepath.Join("../../../../bus/pci/drivers", driver), path); err != nil {
					t.Fatal(err)
				}
			}
			want := driver == "i915" || driver == "xe" || driver == "amdgpu" || driver == "radeon"
			if got := dmabufSafe(withEnv(), root); got != want {
				t.Fatalf("dmabufSafe() = %v, want %v", got, want)
			}
		})
	}
}
