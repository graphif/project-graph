package automation

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

const ProtocolVersion = 1

type Session struct {
	Endpoint string `json:"endpoint"`
	Token    string `json:"token"`
	Protocol int    `json:"protocol"`
}

type Request struct {
	RequestID    string          `json:"requestId"`
	Token        string          `json:"token"`
	Protocol     int             `json:"protocol"`
	Kind         string          `json:"kind,omitempty"`
	ProjectPath  string          `json:"projectPath,omitempty"`
	ToolName     string          `json:"toolName,omitempty"`
	Input        json.RawMessage `json:"input,omitempty"`
	AllowUpgrade bool            `json:"allowUpgrade,omitempty"`
}

func NewID() (string, error) {
	var value [24]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(value[:]), nil
}

func SessionPath() (string, error) {
	config, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	id := "dev.graphif.prg"
	if os.Getenv("PROJECT_GRAPH_DEVELOPMENT") == "1" {
		id += ".dev"
	}
	return filepath.Join(config, id, "automation-session.json"), nil
}

func ReadSession(path string) (Session, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Session{}, err
	}
	var session Session
	if err := json.Unmarshal(data, &session); err != nil {
		return Session{}, err
	}
	if session.Protocol != ProtocolVersion || session.Token == "" {
		return Session{}, errors.New("invalid automation session")
	}
	return session, nil
}

func PublishSession(path string, session Session) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	data, err := json.Marshal(session)
	if err != nil {
		return err
	}
	file, err := os.CreateTemp(filepath.Dir(path), ".automation-*")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	if err := file.Chmod(0600); err != nil {
		file.Close()
		return err
	}
	if _, err := file.Write(data); err != nil {
		file.Close()
		return err
	}
	if err := file.Close(); err != nil {
		return err
	}
	return os.Rename(file.Name(), path)
}
