import { store, activeResourceTabAtom } from "@/state";
import type { MediaNode } from "@/core/stage/stageObject/entity/MediaNode";
import type { Project } from "@/core/Project";
import { toast } from "sonner";

let activeNode: MediaNode | null = null;
let activeProject: Project | null = null;
let mediaEl: HTMLVideoElement | HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let rafId = 0;
let lastToggleTime = 0;
let audioCheckInterval = 0;

const VIDEO_Z_INDEX = 40;
const DEBOUNCE_MS = 300;
const AUDIO_CHECK_INTERVAL_MS = 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function syncVideoRect(el: HTMLVideoElement, project: Project, node: MediaNode) {
  const rect = node.rectangle;
  const viewRect = project.renderer.transformWorld2View(rect);
  const topLeft = project.canvas!.viewToClient(viewRect.location);
  const s = project.canvas!.viewToClientScale();
  el.style.left = `${topLeft.x}px`;
  el.style.top = `${topLeft.y}px`;
  el.style.width = `${viewRect.size.x * s.x}px`;
  el.style.height = `${viewRect.size.y * s.y}px`;
  el.style.borderRadius = `${clamp(4 * project.camera.currentScale * s.x, 0, 20)}px`;
}

function isProjectStillOpen(project: Project): boolean {
  if (project.closing) return false;
  const activeTab = store.get(activeResourceTabAtom);
  return activeTab === project;
}

function checkActiveStopped(): boolean {
  if (!activeNode || !activeProject) return true;
  if (activeNode.isDisposed) return true;
  if (activeNode.isHiddenBySectionCollapse) return true;
  if (!isProjectStillOpen(activeProject)) return true;
  return false;
}

function videoRafLoop() {
  if (!activeNode || activeNode.mediaKind !== "video" || !mediaEl || !activeProject) return;

  if (checkActiveStopped()) {
    stop();
    return;
  }

  if (!activeProject.canvas) {
    rafId = requestAnimationFrame(videoRafLoop);
    return;
  }

  syncVideoRect(mediaEl as HTMLVideoElement, activeProject, activeNode);

  rafId = requestAnimationFrame(videoRafLoop);
}

function audioCheckLoop() {
  if (checkActiveStopped()) {
    stop();
  }
}

function cleanup() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  if (audioCheckInterval) {
    clearInterval(audioCheckInterval);
    audioCheckInterval = 0;
  }
  if (mediaEl) {
    mediaEl.pause();
    if (document.body.contains(mediaEl)) {
      document.body.removeChild(mediaEl);
    }
    mediaEl = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  activeNode = null;
  activeProject = null;
}

export namespace MediaPlaybackManager {
  export function start(project: Project, node: MediaNode) {
    if (activeNode === node) return;

    const blob = project.attachments.get(node.attachmentId);
    if (!blob) {
      toast.error("媒体文件缺失");
      return;
    }

    cleanup();

    objectUrl = URL.createObjectURL(blob);

    if (node.mediaKind === "video") {
      const el = document.createElement("video");
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      el.src = objectUrl;
      el.style.position = "fixed";
      el.style.objectFit = "contain";
      el.style.background = "#000";
      el.style.zIndex = String(VIDEO_Z_INDEX);

      syncVideoRect(el, project, node);

      document.body.appendChild(el);

      el.addEventListener("loadedmetadata", () => {
        if (
          node._lastPlaybackTime > 0 &&
          Number.isFinite(el.duration) &&
          node._lastPlaybackTime < el.duration
        ) {
          el.currentTime = node._lastPlaybackTime;
        }
      });

      el.addEventListener("ended", () => {
        node._lastPlaybackTime = 0;
        stop();
      });

      el.addEventListener("error", () => {
        toast.error("播放失败");
        stop();
      });

      el.play().catch(() => {
        toast.error("播放失败");
        stop();
      });

      mediaEl = el;
      rafId = requestAnimationFrame(videoRafLoop);
    } else {
      const el = document.createElement("audio");
      el.src = objectUrl;
      el.style.display = "none";
      document.body.appendChild(el);

      el.addEventListener("loadedmetadata", () => {
        if (
          node._lastPlaybackTime > 0 &&
          Number.isFinite(el.duration) &&
          node._lastPlaybackTime < el.duration
        ) {
          el.currentTime = node._lastPlaybackTime;
        }
      });

      el.addEventListener("ended", () => {
        node._lastPlaybackTime = 0;
        stop();
      });

      el.addEventListener("error", () => {
        toast.error("播放失败");
        stop();
      });

      el.play().catch(() => {
        toast.error("播放失败");
        stop();
      });

      mediaEl = el;
      audioCheckInterval = window.setInterval(audioCheckLoop, AUDIO_CHECK_INTERVAL_MS);
    }

    activeNode = node;
    activeProject = project;
  }

  export function stop(node?: MediaNode) {
    if (node && activeNode !== node) return;
    if (!activeNode) return;

    if (mediaEl && activeNode) {
      const currentTime = mediaEl.currentTime;
      if (Number.isFinite(currentTime)) {
        activeNode._lastPlaybackTime =
          mediaEl instanceof HTMLVideoElement && (mediaEl as HTMLVideoElement).ended ? 0 : currentTime;
      }
    }

    cleanup();
  }

  export function togglePlay(project: Project, node: MediaNode) {
    const now = performance.now();
    if (now - lastToggleTime < DEBOUNCE_MS) return;
    lastToggleTime = now;

    if (isActive(node)) {
      if (mediaEl) {
        if (mediaEl.paused) {
          mediaEl.play().catch(() => {
            toast.error("播放失败");
            stop();
          });
        } else {
          mediaEl.pause();
        }
      }
    } else {
      stop();
      start(project, node);
    }
  }

  export function isActive(node: MediaNode): boolean {
    return activeNode === node;
  }

  export function hasActive(): boolean {
    return activeNode !== null;
  }

  export function isPaused(node: MediaNode): boolean {
    if (!isActive(node) || !mediaEl) return true;
    return mediaEl.paused;
  }

  export function getProgress(node: MediaNode): { current: number; total: number } | null {
    if (!isActive(node) || !mediaEl) return null;
    const current = mediaEl.currentTime;
    const total = mediaEl.duration;
    if (!Number.isFinite(current) || !Number.isFinite(total)) return null;
    return { current, total };
  }

  export function seekToRatio(node: MediaNode, ratio: number) {
    if (!isActive(node) || !mediaEl) return;
    const duration = mediaEl.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    mediaEl.currentTime = Math.max(0, Math.min(ratio, 1)) * duration;
  }
}
