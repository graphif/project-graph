package automation

import (
	"path/filepath"
	"testing"
)

func TestSessionRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "automation-session.json")
	session := Session{Endpoint: "tcp://127.0.0.1:1234", Token: "secret", Protocol: ProtocolVersion}
	if err := PublishSession(path, session); err != nil {
		t.Fatal(err)
	}
	read, err := ReadSession(path)
	if err != nil {
		t.Fatal(err)
	}
	if read != session {
		t.Fatalf("session mismatch: got %+v, want %+v", read, session)
	}
}
