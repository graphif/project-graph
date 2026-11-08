package automation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

func Call(ctx context.Context, session Session, request Request) (json.RawMessage, error) {
	address, err := url.Parse(session.Endpoint)
	if err != nil || address.Scheme != "tcp" || address.Hostname() != "127.0.0.1" || address.Port() == "" {
		return nil, errors.New("invalid local automation endpoint")
	}
	connection, err := (&net.Dialer{}).DialContext(ctx, "tcp", address.Host)
	if err != nil {
		return nil, err
	}
	defer connection.Close()
	if deadline, ok := ctx.Deadline(); ok {
		connection.SetDeadline(deadline)
	}
	stop := context.AfterFunc(ctx, func() { connection.Close() })
	defer stop()
	request.Token, request.Protocol = session.Token, ProtocolVersion
	if err := json.NewEncoder(connection).Encode(request); err != nil {
		return nil, err
	}
	var response json.RawMessage
	if err := json.NewDecoder(connection).Decode(&response); err != nil {
		return nil, err
	}
	return response, nil
}

func Connect(ctx context.Context, path string, launch func() error) (Session, error) {
	check := func() (Session, bool) {
		session, err := ReadSession(path)
		if err != nil {
			return Session{}, false
		}
		pingContext, cancel := context.WithTimeout(ctx, time.Second)
		defer cancel()
		response, err := Call(pingContext, session, Request{Kind: "ping"})
		var result struct {
			OK bool `json:"ok"`
		}
		return session, err == nil && json.Unmarshal(response, &result) == nil && result.OK
	}
	if session, ok := check(); ok {
		return session, nil
	}
	if err := launch(); err != nil {
		return Session{}, fmt.Errorf("GUI_START_FAILED: %w", err)
	}
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return Session{}, fmt.Errorf("GUI_READY_TIMEOUT: %w", ctx.Err())
		case <-ticker.C:
			if session, ok := check(); ok {
				return session, nil
			}
		}
	}
}

func LaunchGUI() error {
	path := os.Getenv("PROJECT_GRAPH_GUI")
	if path == "" {
		cli, err := os.Executable()
		if err != nil {
			return err
		}
		name := "Project Graph"
		if runtime.GOOS == "windows" {
			name += ".exe"
		}
		directory := filepath.Dir(cli)
		if runtime.GOOS == "darwin" {
			directory = filepath.Join(directory, "MacOS")
		}
		path = filepath.Join(directory, name)
	}
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("GUI_EXECUTABLE_NOT_FOUND: %w; set PROJECT_GRAPH_GUI", err)
	}
	if !info.Mode().IsRegular() {
		return errors.New("GUI executable is not a regular file")
	}
	command := exec.Command(path, "--automation")
	if err := command.Start(); err != nil {
		return err
	}
	return command.Process.Release()
}
