package desktop

import (
	"errors"
	"net/url"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

const maxOpenRequests = 64

type OpenRequest struct {
	ID     int    `json:"id"`
	Kind   string `json:"kind"`
	Target string `json:"target"`
}

type OpenRequests struct {
	Items    []OpenRequest `json:"items"`
	Rejected int           `json:"rejected"`
}

type Bootstrap struct {
	Identifier  string `json:"identifier"`
	Version     string `json:"version"`
	Platform    string `json:"platform"`
	Development bool   `json:"development"`
	Paths       Paths  `json:"paths"`
}

type Host struct {
	mu          sync.Mutex
	paths       Paths
	version     func() string
	development bool
	nextID      int
	requests    []OpenRequest
	rejected    int
}

func NewHost(paths Paths, version func() string, development bool) *Host {
	return &Host{paths: paths, version: version, development: development}
}

func (h *Host) Bootstrap() (Bootstrap, error) {
	version := h.version()
	if version == "" || version == "0.0.0" {
		return Bootstrap{}, errors.New("application version is missing; launch with go tool mygo dev")
	}
	platform := runtime.GOOS
	if platform == "windows" {
		platform = "win32"
	}
	return Bootstrap{Identifier, version, platform, h.development, h.paths}, nil
}

// Enqueue is host-only; pages cannot inject OS open requests.
func Enqueue(h *Host, kind, target string) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if kind == "file" {
		if !filepath.IsAbs(target) || !strings.EqualFold(filepath.Ext(target), ".prg") {
			h.rejected++
			return errors.New("open request must be an absolute .prg path")
		}
		target = filepath.Clean(target)
	} else if kind == "url" {
		u, err := url.Parse(target)
		if err != nil || !strings.EqualFold(u.Scheme, "prg") || len(target) > 8192 {
			h.rejected++
			return errors.New("invalid prg deep link")
		}
	} else {
		return errors.New("unknown open request kind")
	}
	for _, request := range h.requests {
		sameTarget := request.Target == target
		if kind == "file" && runtime.GOOS == "windows" {
			sameTarget = strings.EqualFold(request.Target, target)
		}
		if request.Kind == kind && sameTarget {
			return nil
		}
	}
	if len(h.requests) == maxOpenRequests {
		h.rejected++
		return errors.New("pending open request queue is full")
	}
	h.nextID++
	h.requests = append(h.requests, OpenRequest{h.nextID, kind, target})
	return nil
}

func (h *Host) PendingOpenRequests() OpenRequests {
	h.mu.Lock()
	defer h.mu.Unlock()
	return OpenRequests{append([]OpenRequest{}, h.requests...), h.rejected}
}

// AcknowledgeOpenRequests removes only requests the page successfully handled.
func (h *Host) AcknowledgeOpenRequests(ids []int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	acknowledged := make(map[int]bool, len(ids))
	for _, id := range ids {
		acknowledged[id] = true
	}
	remaining := h.requests[:0]
	for _, request := range h.requests {
		if !acknowledged[request.ID] {
			remaining = append(remaining, request)
		}
	}
	h.requests = remaining
}
