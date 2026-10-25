package desktop

import (
	"bufio"
	"encoding/json"
	"errors"
	"net"
	"sync"
	"time"

	"github.com/egoist/mygo"
)

type RuntimeInvocation struct {
	Kind        string `json:"kind"`
	RequestID   string `json:"requestId"`
	ProjectPath string `json:"projectPath"`
	ToolName    string `json:"toolName"`
	Input       any    `json:"input"`
}

var ProjectRuntimeInvocation = mygo.NewEvent[RuntimeInvocation]("project-runtime-invocation")

type Bridge struct {
	mu       sync.Mutex
	listener net.Listener
	pending  map[string]chan any
	closed   chan struct{}
	emit     func(RuntimeInvocation) error
}

func NewBridge() *Bridge {
	return &Bridge{pending: map[string]chan any{}, closed: make(chan struct{}), emit: ProjectRuntimeInvocation.Broadcast}
}
func StartBridge(b *Bridge) (string, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	select {
	case <-b.closed:
		return "", errors.New("runtime bridge is closed")
	default:
	}
	if b.listener != nil {
		return "", errors.New("runtime bridge is already started")
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", err
	}
	b.listener = listener
	go func() {
		for {
			connection, err := listener.Accept()
			if err != nil {
				return
			}
			go b.serve(connection)
		}
	}()
	return "tcp://" + listener.Addr().String(), nil
}
func (b *Bridge) Respond(requestID string, response any) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	channel, ok := b.pending[requestID]
	if !ok {
		return false
	}
	delete(b.pending, requestID)
	channel <- response
	return true
}
func (b *Bridge) serve(connection net.Conn) {
	defer connection.Close()
	connection.SetDeadline(time.Now().Add(5 * time.Minute))
	scanner := bufio.NewScanner(connection)
	scanner.Buffer(make([]byte, 4096), 8*1024*1024)
	failure := map[string]any{"ok": false, "error": map[string]string{"code": "RUNTIME_HOST_UNAVAILABLE", "message": "Runtime host unavailable"}}
	respond := func(value any) { json.NewEncoder(connection).Encode(value) }
	if !scanner.Scan() {
		return
	}
	var request struct {
		RequestID       string `json:"requestId"`
		ProjectPath     string `json:"projectPath"`
		ToolName        string `json:"toolName"`
		Input           any    `json:"input"`
		CancelRequestID string `json:"cancelRequestId"`
	}
	if json.Unmarshal(scanner.Bytes(), &request) != nil {
		respond(failure)
		return
	}
	if request.CancelRequestID != "" {
		b.emit(RuntimeInvocation{Kind: "cancel", RequestID: request.CancelRequestID})
		respond(map[string]any{"ok": true, "value": nil})
		return
	}
	canonical, err := CanonicalProject(request.ProjectPath, false)
	if err != nil || request.RequestID == "" {
		respond(failure)
		return
	}
	channel := make(chan any, 1)
	b.mu.Lock()
	select {
	case <-b.closed:
		b.mu.Unlock()
		respond(failure)
		return
	default:
	}
	if _, exists := b.pending[request.RequestID]; exists || len(b.pending) >= 128 {
		b.mu.Unlock()
		respond(failure)
		return
	}
	b.pending[request.RequestID] = channel
	b.mu.Unlock()
	defer func() { b.mu.Lock(); delete(b.pending, request.RequestID); b.mu.Unlock() }()
	if err := b.emit(RuntimeInvocation{"invoke", request.RequestID, canonical, request.ToolName, request.Input}); err != nil {
		respond(failure)
		return
	}
	disconnected := make(chan struct{})
	done := make(chan struct{})
	defer close(done)
	go func() {
		defer close(disconnected)
		for scanner.Scan() {
			var cancel struct {
				CancelRequestID string `json:"cancelRequestId"`
			}
			if json.Unmarshal(scanner.Bytes(), &cancel) == nil && cancel.CancelRequestID == request.RequestID {
				select {
				case <-done:
					return
				default:
					b.emit(RuntimeInvocation{Kind: "cancel", RequestID: request.RequestID})
				}
			}
		}
	}()
	select {
	case response := <-channel:
		respond(response)
	case <-b.closed:
		b.emit(RuntimeInvocation{Kind: "cancel", RequestID: request.RequestID})
		respond(failure)
	case <-disconnected:
		b.emit(RuntimeInvocation{Kind: "cancel", RequestID: request.RequestID})
	case <-time.After(5 * time.Minute):
		b.emit(RuntimeInvocation{Kind: "cancel", RequestID: request.RequestID})
		respond(failure)
	}
}
func CloseBridge(b *Bridge) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	select {
	case <-b.closed:
		return nil
	default:
	}
	close(b.closed)
	if b.listener == nil {
		return nil
	}
	err := b.listener.Close()
	if errors.Is(err, net.ErrClosed) {
		return nil
	}
	return err
}
