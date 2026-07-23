import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Project } from "@/core/Project";
import type { CollaborationStatus, CollabStateSnapshot } from "@/core/service/collaboration/CollaborationService";
import type { CollabPresence, CollabRole } from "@/core/service/collaboration/CollabProtocol";
import { onJoinCollaboration, onLeaveCollaboration } from "@/core/service/GlobalMenu";
import { createSubWindow } from "@/core/subWindowOpen";
import { ComponentTab } from "@/core/Tab";
import { TabWorkspace } from "@/core/TabWorkspace";
import { activeResourceTabAtom, store, tabsAtom } from "@/state";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useAtomValue } from "jotai";
import { Copy, DoorOpen, LogIn, RefreshCcw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const COLLAB_WINDOW_TITLE = "协作";

function statusLabel(status: CollaborationStatus): string {
  switch (status) {
    case "idle":
      return "未连接";
    case "connecting":
      return "连接中";
    case "synced":
      return "已同步";
    case "disconnected":
      return "已断开";
    case "error":
      return "错误";
  }
}

function statusVariant(status: CollaborationStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "synced":
      return "default";
    case "connecting":
      return "secondary";
    case "disconnected":
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

function roleLabel(role: CollabRole | null): string {
  switch (role) {
    case "owner":
      return "房主";
    case "editor":
      return "编辑";
    case "viewer":
      return "只读";
    default:
      return "—";
  }
}

function emptyState(): CollabStateSnapshot {
  return {
    status: "idle",
    roomId: null,
    inviteCode: null,
    version: 0,
    role: null,
    members: [],
    presences: [],
    userId: null,
    sessionId: null,
  };
}

function PresenceRow({
  presence,
  isSelf,
  indexAmongSameUser,
}: {
  presence: CollabPresence;
  isSelf: boolean;
  indexAmongSameUser: number;
}) {
  const deviceLabel = indexAmongSameUser > 0 ? ` #${indexAmongSameUser}` : "";
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {presence.name || presence.email}
          {deviceLabel}
          {isSelf ? <span className="text-muted-foreground ml-1 text-xs">(本端)</span> : null}
        </div>
        <div className="text-muted-foreground truncate text-xs">{presence.email}</div>
      </div>
      <Badge variant="outline" className="shrink-0">
        {roleLabel(presence.role)}
      </Badge>
    </div>
  );
}

export default function CollaborationWindow() {
  const tab = useAtomValue(activeResourceTabAtom);
  const project = tab instanceof Project ? tab : undefined;
  const [state, setState] = useState<CollabStateSnapshot>(emptyState());

  useEffect(() => {
    if (!project) {
      setState(emptyState());
      return;
    }
    const onState = (snapshot: CollabStateSnapshot) => setState(snapshot);
    setState(project.collaboration.getState());
    project.on("collab-state", onState);
    return () => {
      project.off("collab-state", onState);
    };
  }, [project]);

  if (!project) {
    return <div className="text-muted-foreground p-3 text-sm">请先打开一个工程</div>;
  }

  const active = project.collaboration.isActive;

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-4" />
          <span className="font-semibold">协作</span>
        </div>
        <Badge variant={statusVariant(state.status)}>{statusLabel(state.status)}</Badge>
      </div>

      {!active ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">当前未加入协作房间。</p>
          <Button
            onClick={() => {
              void onJoinCollaboration();
            }}
          >
            <LogIn />
            加入协作
          </Button>
        </div>
      ) : (
        <>
          <section className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">房间</span>
              <span className="max-w-[60%] truncate font-mono text-xs" title={state.roomId ?? undefined}>
                {state.roomId ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">邀请码</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-semibold tracking-wider">{state.inviteCode ?? "—"}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={!state.inviteCode}
                  onClick={async () => {
                    if (!state.inviteCode) return;
                    await navigator.clipboard.writeText(state.inviteCode);
                    toast.success("邀请码已复制");
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">版本</span>
              <span className="font-mono">v{state.version}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">我的角色</span>
              <span>{roleLabel(state.role)}</span>
            </div>
          </section>

          <Separator />

          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">在线 ({state.presences.length})</h3>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => setState(project.collaboration.getState())}
                title="刷新"
              >
                <RefreshCcw className="size-3.5" />
              </Button>
            </div>
            <div className="flex flex-col gap-1.5 overflow-auto">
              {state.presences.length === 0 ? (
                <p className="text-muted-foreground text-xs">暂无在线连接</p>
              ) : (
                state.presences.map((presence) => {
                  const sameUser = state.presences.filter((p) => p.userId === presence.userId);
                  const indexAmongSameUser =
                    sameUser.length > 1 ? sameUser.findIndex((p) => p.sessionId === presence.sessionId) + 1 : 0;
                  return (
                    <PresenceRow
                      key={presence.sessionId}
                      presence={presence}
                      isSelf={presence.sessionId === state.sessionId}
                      indexAmongSameUser={indexAmongSameUser}
                    />
                  );
                })
              )}
            </div>
          </section>

          <Separator />

          <Button
            variant="destructive"
            onClick={() => {
              void onLeaveCollaboration();
            }}
          >
            <DoorOpen />
            离开协作
          </Button>
        </>
      )}
    </div>
  );
}

function isCollaborationTab(tab: { title: string; closing: boolean }): boolean {
  return !tab.closing && tab.title === COLLAB_WINDOW_TITLE;
}

CollaborationWindow.open = () => {
  const existing = store.get(tabsAtom).find((tab) => isCollaborationTab(tab));
  if (existing) {
    TabWorkspace.focus(existing.id);
    return existing;
  }
  return createSubWindow("CollaborationWindow", {
    title: COLLAB_WINDOW_TITLE,
    icon: Users,
    contextTarget: "activeResourceTab",
    children: <CollaborationWindow />,
    rect: new Rectangle(new Vector(100, 100), new Vector(320, 520)),
  });
};

CollaborationWindow.closeAll = () => {
  for (const tab of store.get(tabsAtom)) {
    if (isCollaborationTab(tab) && tab instanceof ComponentTab) {
      void TabWorkspace.close(tab.id);
    }
  }
};
