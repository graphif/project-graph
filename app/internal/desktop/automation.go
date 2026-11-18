package desktop

import (
	"crypto/subtle"
	"encoding/json"
	"net"
	"time"

	"github.com/graphif/project-graph/app/internal/automation"
)

type automationRecord struct {
	fingerprint string
	done        chan struct{}
	response    any
	completed   time.Time
}

func (b *Bridge) serveAutomation(connection net.Conn, data []byte) {
	respond := func(value any) { json.NewEncoder(connection).Encode(value) }
	fail := func(code, message string) {
		respond(map[string]any{"ok": false, "error": map[string]string{"code": code, "message": message}})
	}
	var request automation.Request
	if json.Unmarshal(data, &request) != nil {
		fail("INVALID_REQUEST", "Invalid JSON request")
		return
	}
	b.mu.Lock()
	session, ready := b.automationSession, b.ready
	b.mu.Unlock()
	if subtle.ConstantTimeCompare([]byte(request.Token), []byte(session.Token)) != 1 {
		fail("UNAUTHORIZED", "Invalid automation credentials")
		return
	}
	if request.Protocol != automation.ProtocolVersion {
		fail("PROTOCOL_VERSION_MISMATCH", "Incompatible CLI protocol")
		return
	}
	if request.Kind == "ping" {
		respond(map[string]any{"ok": ready})
		return
	}
	if !ready {
		fail("RUNTIME_HOST_UNAVAILABLE", "GUI is initializing")
		return
	}
	if request.RequestID == "" {
		fail("INVALID_REQUEST", "Missing request ID")
		return
	}
	if request.Kind == "status" {
		b.mu.Lock()
		record := b.records[request.RequestID]
		var response any
		if record != nil {
			response = record.response
		}
		b.mu.Unlock()
		if record == nil {
			fail("RESULT_UNKNOWN", "Request is unknown or expired")
			return
		}
		if response != nil {
			respond(response)
		} else {
			respond(map[string]any{"ok": true, "requestId": request.RequestID, "status": "running"})
		}
		return
	}
	if request.Kind != "invoke" {
		fail("INVALID_REQUEST", "Unknown request kind")
		return
	}
	canonical, err := CanonicalProject(request.ProjectPath, false)
	if err != nil {
		fail(err.Error(), "Cannot open project")
		return
	}
	fingerprint, _ := json.Marshal([]any{canonical, request.ToolName, request.Input, request.AllowUpgrade})
	b.mu.Lock()
	for id, record := range b.records {
		if !record.completed.IsZero() && time.Since(record.completed) > 30*time.Minute {
			delete(b.records, id)
		}
	}
	record := b.records[request.RequestID]
	created := record == nil
	if created {
		if len(b.records) >= 1024 {
			b.mu.Unlock()
			fail("REQUEST_LIMIT", "Too many retained requests; wait for expiry")
			return
		}
		record = &automationRecord{fingerprint: string(fingerprint), done: make(chan struct{})}
		b.records[request.RequestID] = record
	} else if record.fingerprint != string(fingerprint) {
		b.mu.Unlock()
		fail("REQUEST_ID_CONFLICT", "Request ID already used with different input")
		return
	}
	b.mu.Unlock()
	if created {
		var input any
		if err := json.Unmarshal(request.Input, &input); err != nil {
			b.Respond(request.RequestID, map[string]any{"ok": false, "error": map[string]string{"code": "INVALID_JSON", "message": err.Error()}})
		} else if err := b.emit(RuntimeInvocation{Kind: "invoke", RequestID: request.RequestID, ProjectPath: canonical, ToolName: request.ToolName, Input: input, AllowUpgrade: request.AllowUpgrade}); err != nil {
			b.Respond(request.RequestID, map[string]any{"ok": false, "error": map[string]string{"code": "RUNTIME_HOST_UNAVAILABLE", "message": err.Error()}})
		}
	}
	select {
	case <-record.done:
		b.mu.Lock()
		response := record.response
		b.mu.Unlock()
		respond(response)
	case <-b.closed:
		fail("RESULT_UNKNOWN", "GUI closed before a result was available")
	case <-time.After(4 * time.Minute):
		fail("RESULT_UNKNOWN", "Request is still running; query its status before retrying")
	}
}
