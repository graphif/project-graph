package desktop

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type MCPConfig struct {
	ServerName string            `json:"serverName"`
	Command    string            `json:"command"`
	Args       []string          `json:"args"`
	Cwd        string            `json:"cwd"`
	Env        map[string]string `json:"env"`
}
type MCP struct {
	mu       sync.Mutex
	sessions map[string]*mcp.ClientSession
	version  string
}

func NewMCP(version string) *MCP {
	return &MCP{sessions: map[string]*mcp.ClientSession{}, version: version}
}
func (m *MCP) Start(ctx context.Context, config MCPConfig) (any, error) {
	if config.ServerName == "" || config.Command == "" {
		return nil, errors.New("MCP name and command are required")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if session := m.sessions[config.ServerName]; session != nil {
		return listTools(ctx, session)
	}
	command := exec.Command(config.Command, config.Args...)
	hideCommand(command)
	command.Dir = config.Cwd
	command.Env = os.Environ()
	for key, value := range config.Env {
		command.Env = append(command.Env, key+"="+value)
	}
	initialization, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	client := mcp.NewClient(&mcp.Implementation{Name: "Project Graph", Version: m.version}, nil)
	session, err := client.Connect(initialization, &mcp.CommandTransport{Command: command, TerminateDuration: time.Second}, nil)
	if err != nil {
		return nil, err
	}
	tools, err := listTools(ctx, session)
	if err != nil {
		session.Close()
		return nil, err
	}
	m.sessions[config.ServerName] = session
	return tools, nil
}
func listTools(ctx context.Context, session *mcp.ClientSession) (any, error) {
	tools := []*mcp.Tool{}
	for tool, err := range session.Tools(ctx, nil) {
		if err != nil {
			return nil, err
		}
		tools = append(tools, tool)
	}
	return tools, nil
}
func (m *MCP) ListTools(ctx context.Context, name string) (any, error) {
	m.mu.Lock()
	session := m.sessions[name]
	m.mu.Unlock()
	if session == nil {
		return nil, errors.New("MCP server is not running")
	}
	return listTools(ctx, session)
}
func (m *MCP) CallTool(ctx context.Context, name, tool string, arguments map[string]any) (any, error) {
	m.mu.Lock()
	session := m.sessions[name]
	m.mu.Unlock()
	if session == nil {
		return nil, errors.New("MCP server is not running")
	}
	return session.CallTool(ctx, &mcp.CallToolParams{Name: tool, Arguments: arguments})
}
func (m *MCP) Stop(name string) error {
	m.mu.Lock()
	session := m.sessions[name]
	delete(m.sessions, name)
	m.mu.Unlock()
	if session != nil {
		return session.Close()
	}
	return nil
}
func CloseMCP(m *MCP) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	var errs []error
	for name, session := range m.sessions {
		errs = append(errs, session.Close())
		delete(m.sessions, name)
	}
	return errors.Join(errs...)
}
