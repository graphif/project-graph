import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";

// Window state management
const windows = new Map<string, WindowState>();
let focusedWindow: string | null = null;

interface WindowState {
  label: string;
  visible: boolean;
  focused: boolean;
  maximized: boolean;
  minimized: boolean;
  fullscreen: boolean;
  decorated: boolean;
  resizable: boolean;
  enabled: boolean;
  closable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  alwaysOnTop: boolean;
  alwaysOnBottom: boolean;
  contentProtected: boolean;
  skipTaskbar: boolean;
  shadow: boolean;
  title: string;
  theme: string | null;
  innerPosition: { x: number; y: number };
  outerPosition: { x: number; y: number };
  innerSize: { width: number; height: number };
  outerSize: { width: number; height: number };
  scaleFactor: number;
  cursorGrab: boolean;
  cursorVisible: boolean;
  cursorIcon: string;
  focusable: boolean;
  visibleOnAllWorkspaces: boolean;
  titleBarStyle: string;
  backgroundColor: string | null;
}

// Initialize default windows
function initializeWindow(label: string): WindowState {
  mockWindows(label);

  const state: WindowState = {
    label,
    visible: true,
    focused: label === "main",
    maximized: false,
    minimized: false,
    fullscreen: false,
    decorated: true,
    resizable: true,
    enabled: true,
    closable: true,
    minimizable: true,
    maximizable: true,
    alwaysOnTop: false,
    alwaysOnBottom: false,
    contentProtected: false,
    skipTaskbar: false,
    shadow: true,
    title: label,
    theme: null,
    innerPosition: { x: 0, y: 0 },
    outerPosition: { x: 0, y: 0 },
    innerSize: { width: 800, height: 600 },
    outerSize: { width: 800, height: 600 },
    scaleFactor: 1.0,
    cursorGrab: false,
    cursorVisible: true,
    cursorIcon: "default",
    focusable: true,
    visibleOnAllWorkspaces: false,
    titleBarStyle: "visible",
    backgroundColor: null,
  };

  windows.set(label, state);
  return state;
}

function getWindow(label: string): WindowState {
  if (!windows.has(label)) {
    initializeWindow(label);
  }
  return windows.get(label)!;
}

export function enableMockWindow() {
  // Initialize main and splash windows
  initializeWindow("splash");
  initializeWindow("main");
  focusedWindow = "main";

  mockIPC((cmd, args: any) => {
    switch (cmd) {
      // Create window
      case "plugin:window|create": {
        const { options } = args;
        const label = options.label || "new-window";
        initializeWindow(label);
        return undefined;
      }

      // Get all windows
      case "plugin:window|get_all_windows": {
        return Array.from(windows.keys());
      }

      // Scale factor
      case "plugin:window|scale_factor": {
        const { label } = args;
        const window = getWindow(label);
        return window.scaleFactor;
      }

      // Inner position
      case "plugin:window|inner_position": {
        const { label } = args;
        const window = getWindow(label);
        return window.innerPosition;
      }

      // Outer position
      case "plugin:window|outer_position": {
        const { label } = args;
        const window = getWindow(label);
        return window.outerPosition;
      }

      // Inner size
      case "plugin:window|inner_size": {
        const { label } = args;
        const window = getWindow(label);
        return window.innerSize;
      }

      // Outer size
      case "plugin:window|outer_size": {
        const { label } = args;
        const window = getWindow(label);
        return window.outerSize;
      }

      // Is fullscreen
      case "plugin:window|is_fullscreen": {
        const { label } = args;
        const window = getWindow(label);
        return window.fullscreen;
      }

      // Is minimized
      case "plugin:window|is_minimized": {
        const { label } = args;
        const window = getWindow(label);
        return window.minimized;
      }

      // Is maximized
      case "plugin:window|is_maximized": {
        const { label } = args;
        const window = getWindow(label);
        return window.maximized;
      }

      // Is focused
      case "plugin:window|is_focused": {
        const { label } = args;
        const window = getWindow(label);
        return window.focused;
      }

      // Is decorated
      case "plugin:window|is_decorated": {
        const { label } = args;
        const window = getWindow(label);
        return window.decorated;
      }

      // Is resizable
      case "plugin:window|is_resizable": {
        const { label } = args;
        const window = getWindow(label);
        return window.resizable;
      }

      // Is maximizable
      case "plugin:window|is_maximizable": {
        const { label } = args;
        const window = getWindow(label);
        return window.maximizable;
      }

      // Is minimizable
      case "plugin:window|is_minimizable": {
        const { label } = args;
        const window = getWindow(label);
        return window.minimizable;
      }

      // Is closable
      case "plugin:window|is_closable": {
        const { label } = args;
        const window = getWindow(label);
        return window.closable;
      }

      // Is visible
      case "plugin:window|is_visible": {
        const { label } = args;
        const window = getWindow(label);
        return window.visible;
      }

      // Is enabled
      case "plugin:window|is_enabled": {
        const { label } = args;
        const window = getWindow(label);
        return window.enabled;
      }

      // Is always on top
      case "plugin:window|is_always_on_top": {
        const { label } = args;
        const window = getWindow(label);
        return window.alwaysOnTop;
      }

      // Get title
      case "plugin:window|title": {
        const { label } = args;
        const window = getWindow(label);
        return window.title;
      }

      // Get theme
      case "plugin:window|theme": {
        const { label } = args;
        const window = getWindow(label);
        return window.theme;
      }

      // Center
      case "plugin:window|center": {
        const { label } = args;
        const window = getWindow(label);
        window.innerPosition = { x: 400, y: 300 };
        window.outerPosition = { x: 400, y: 300 };
        return undefined;
      }

      // Request user attention
      case "plugin:window|request_user_attention": {
        return undefined;
      }

      // Set resizable
      case "plugin:window|set_resizable": {
        const { label, value } = args;
        const window = getWindow(label);
        window.resizable = value;
        return undefined;
      }

      // Set enabled
      case "plugin:window|set_enabled": {
        const { label, value } = args;
        const window = getWindow(label);
        window.enabled = value;
        return undefined;
      }

      // Set maximizable
      case "plugin:window|set_maximizable": {
        const { label, value } = args;
        const window = getWindow(label);
        window.maximizable = value;
        return undefined;
      }

      // Set minimizable
      case "plugin:window|set_minimizable": {
        const { label, value } = args;
        const window = getWindow(label);
        window.minimizable = value;
        return undefined;
      }

      // Set closable
      case "plugin:window|set_closable": {
        const { label, value } = args;
        const window = getWindow(label);
        window.closable = value;
        return undefined;
      }

      // Set title
      case "plugin:window|set_title": {
        const { label, value } = args;
        const window = getWindow(label);
        window.title = value;
        return undefined;
      }

      // Maximize
      case "plugin:window|maximize": {
        const { label } = args;
        const window = getWindow(label);
        window.maximized = true;
        return undefined;
      }

      // Unmaximize
      case "plugin:window|unmaximize": {
        const { label } = args;
        const window = getWindow(label);
        window.maximized = false;
        return undefined;
      }

      // Toggle maximize
      case "plugin:window|toggle_maximize": {
        const { label } = args;
        const window = getWindow(label);
        window.maximized = !window.maximized;
        return undefined;
      }

      // Minimize
      case "plugin:window|minimize": {
        const { label } = args;
        const window = getWindow(label);
        window.minimized = true;
        return undefined;
      }

      // Unminimize
      case "plugin:window|unminimize": {
        const { label } = args;
        const window = getWindow(label);
        window.minimized = false;
        return undefined;
      }

      // Show
      case "plugin:window|show": {
        const { label } = args;
        const window = getWindow(label);
        window.visible = true;
        return undefined;
      }

      // Hide
      case "plugin:window|hide": {
        const { label } = args;
        const window = getWindow(label);
        window.visible = false;
        return undefined;
      }

      // Close
      case "plugin:window|close": {
        const { label } = args;
        windows.delete(label);
        if (focusedWindow === label) {
          focusedWindow = windows.size > 0 ? Array.from(windows.keys())[0] : null;
        }
        return undefined;
      }

      // Destroy
      case "plugin:window|destroy": {
        const { label } = args;
        windows.delete(label);
        if (focusedWindow === label) {
          focusedWindow = windows.size > 0 ? Array.from(windows.keys())[0] : null;
        }
        return undefined;
      }

      // Set decorations
      case "plugin:window|set_decorations": {
        const { label, value } = args;
        const window = getWindow(label);
        window.decorated = value;
        return undefined;
      }

      // Set shadow
      case "plugin:window|set_shadow": {
        const { label, value } = args;
        const window = getWindow(label);
        window.shadow = value;
        return undefined;
      }

      // Set effects
      case "plugin:window|set_effects": {
        return undefined;
      }

      // Set always on top
      case "plugin:window|set_always_on_top": {
        const { label, value } = args;
        const window = getWindow(label);
        window.alwaysOnTop = value;
        return undefined;
      }

      // Set always on bottom
      case "plugin:window|set_always_on_bottom": {
        const { label, value } = args;
        const window = getWindow(label);
        window.alwaysOnBottom = value;
        return undefined;
      }

      // Set content protected
      case "plugin:window|set_content_protected": {
        const { label, value } = args;
        const window = getWindow(label);
        window.contentProtected = value;
        return undefined;
      }

      // Set size
      case "plugin:window|set_size": {
        const { label, value } = args;
        const window = getWindow(label);
        const size = value.type === "Logical" ? value : value;
        window.innerSize = { width: size.width, height: size.height };
        window.outerSize = { width: size.width, height: size.height };
        return undefined;
      }

      // Set min size
      case "plugin:window|set_min_size": {
        return undefined;
      }

      // Set max size
      case "plugin:window|set_max_size": {
        return undefined;
      }

      // Set size constraints
      case "plugin:window|set_size_constraints": {
        return undefined;
      }

      // Set position
      case "plugin:window|set_position": {
        const { label, value } = args;
        const window = getWindow(label);
        window.innerPosition = { x: value.x, y: value.y };
        window.outerPosition = { x: value.x, y: value.y };
        return undefined;
      }

      // Set fullscreen
      case "plugin:window|set_fullscreen": {
        const { label, value } = args;
        const window = getWindow(label);
        window.fullscreen = value;
        return undefined;
      }

      // Set simple fullscreen
      case "plugin:window|set_simple_fullscreen": {
        const { label, value } = args;
        const window = getWindow(label);
        window.fullscreen = value;
        return undefined;
      }

      // Set focus
      case "plugin:window|set_focus": {
        const { label } = args;
        focusedWindow = label;
        const window = getWindow(label);
        window.focused = true;
        return undefined;
      }

      // Set focusable
      case "plugin:window|set_focusable": {
        const { label, value } = args;
        const window = getWindow(label);
        window.focusable = value;
        return undefined;
      }

      // Set icon
      case "plugin:window|set_icon": {
        return undefined;
      }

      // Set skip taskbar
      case "plugin:window|set_skip_taskbar": {
        const { label, value } = args;
        const window = getWindow(label);
        window.skipTaskbar = value;
        return undefined;
      }

      // Set cursor grab
      case "plugin:window|set_cursor_grab": {
        const { label, value } = args;
        const window = getWindow(label);
        window.cursorGrab = value;
        return undefined;
      }

      // Set cursor visible
      case "plugin:window|set_cursor_visible": {
        const { label, value } = args;
        const window = getWindow(label);
        window.cursorVisible = value;
        return undefined;
      }

      // Set cursor icon
      case "plugin:window|set_cursor_icon": {
        const { label, value } = args;
        const window = getWindow(label);
        window.cursorIcon = value;
        return undefined;
      }

      // Set background color
      case "plugin:window|set_background_color": {
        const { label, color } = args;
        const window = getWindow(label);
        window.backgroundColor = color;
        return undefined;
      }

      // Set cursor position
      case "plugin:window|set_cursor_position": {
        return undefined;
      }

      // Set ignore cursor events
      case "plugin:window|set_ignore_cursor_events": {
        return undefined;
      }

      // Start dragging
      case "plugin:window|start_dragging": {
        return undefined;
      }

      // Start resize dragging
      case "plugin:window|start_resize_dragging": {
        return undefined;
      }

      // Set badge count
      case "plugin:window|set_badge_count": {
        return undefined;
      }

      // Set badge label
      case "plugin:window|set_badge_label": {
        return undefined;
      }

      // Set overlay icon
      case "plugin:window|set_overlay_icon": {
        return undefined;
      }

      // Set progress bar
      case "plugin:window|set_progress_bar": {
        return undefined;
      }

      // Set visible on all workspaces
      case "plugin:window|set_visible_on_all_workspaces": {
        const { label, value } = args;
        const window = getWindow(label);
        window.visibleOnAllWorkspaces = value;
        return undefined;
      }

      // Set title bar style
      case "plugin:window|set_title_bar_style": {
        const { label, value } = args;
        const window = getWindow(label);
        window.titleBarStyle = value;
        return undefined;
      }

      // Set theme
      case "plugin:window|set_theme": {
        const { label, value } = args;
        const window = getWindow(label);
        window.theme = value;
        return undefined;
      }

      // Monitor functions
      case "plugin:window|current_monitor": {
        return {
          name: "Primary Monitor",
          scaleFactor: 1.0,
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1080 },
          workArea: {
            position: { x: 0, y: 0 },
            size: { width: 1920, height: 1040 },
          },
        };
      }

      case "plugin:window|primary_monitor": {
        return {
          name: "Primary Monitor",
          scaleFactor: 1.0,
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1080 },
          workArea: {
            position: { x: 0, y: 0 },
            size: { width: 1920, height: 1040 },
          },
        };
      }

      case "plugin:window|monitor_from_point": {
        return {
          name: "Primary Monitor",
          scaleFactor: 1.0,
          position: { x: 0, y: 0 },
          size: { width: 1920, height: 1080 },
          workArea: {
            position: { x: 0, y: 0 },
            size: { width: 1920, height: 1040 },
          },
        };
      }

      case "plugin:window|available_monitors": {
        return [
          {
            name: "Primary Monitor",
            scaleFactor: 1.0,
            position: { x: 0, y: 0 },
            size: { width: 1920, height: 1080 },
            workArea: {
              position: { x: 0, y: 0 },
              size: { width: 1920, height: 1040 },
            },
          },
        ];
      }

      case "plugin:window|cursor_position": {
        return { x: 960, y: 540 };
      }

      default:
        return undefined;
    }
  });
}
