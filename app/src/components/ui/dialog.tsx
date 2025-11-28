import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowUp,
  Check,
  Dock,
  Download,
  File,
  FileText,
  Folder,
  HardDrive,
  Home,
  Link,
  Usb,
  X,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fileSystemProviders } from "@/core/fs";
import { SubWindow } from "@/core/service/SubWindow";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useVirtualizer } from "@tanstack/react-virtual";
import { desktopDir, documentDir, downloadDir, homeDir } from "@tauri-apps/api/path";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { DirEntry } from "@tauri-apps/plugin-fs";
import { Suspense } from "react";
import { toast } from "sonner";
import { allSysInfo } from "tauri-plugin-system-info-api";
import { URI } from "vscode-uri";
import { ButtonGroup } from "./button-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        "data-[state=closed]:backdrop-blur-none data-[state=open]:backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 flex w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground rounded-xs focus:outline-hidden absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function ConfirmDialog({
  winId,
  title,
  description,
  destructive,
  resolve,
}: {
  winId?: string;
  title: string;
  description: string;
  destructive: boolean;
  resolve: (value: boolean) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const confirmButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    confirmButtonRef.current?.focus();
  }, [confirmButtonRef]);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resolve(false);
                setOpen(false);
                setTimeout(() => {
                  SubWindow.close(winId!);
                }, 500);
              }}
            >
              取消
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={() => {
                resolve(true);
                setOpen(false);
                setTimeout(() => {
                  SubWindow.close(winId!);
                }, 500);
              }}
              ref={confirmButtonRef}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
Dialog.confirm = (title = "你确定？", description = "", { destructive = false } = {}): Promise<boolean> => {
  return new Promise((resolve) => {
    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <ConfirmDialog {...{ title, description, destructive, resolve }} />,
    });
  });
};

function InputDialog({
  winId,
  title,
  description,
  defaultValue,
  placeholder,
  destructive,
  multiline,
  resolve,
}: {
  winId?: string;
  title: string;
  description: string;
  defaultValue: string;
  placeholder: string;
  destructive: boolean;
  multiline: boolean;
  resolve: (value?: string) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [value, setValue] = React.useState(defaultValue);
  const InputComponent = multiline ? Textarea : Input;

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <InputComponent
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                resolve(value);
                setOpen(false);
                setTimeout(() => {
                  SubWindow.close(winId!);
                }, 500);
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resolve(undefined);
                setOpen(false);
                setTimeout(() => {
                  SubWindow.close(winId!);
                }, 500);
              }}
            >
              取消
            </Button>
            <Button
              variant={destructive ? "destructive" : "default"}
              onClick={() => {
                resolve(value);
                setOpen(false);
                setTimeout(() => {
                  SubWindow.close(winId!);
                }, 500);
              }}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
Dialog.input = (
  title = "请输入文本",
  description = "",
  { defaultValue = "", placeholder = "...", destructive = false, multiline = false } = {},
): Promise<string | undefined> => {
  return new Promise((resolve) => {
    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <InputDialog {...{ title, description, defaultValue, placeholder, destructive, multiline, resolve }} />,
    });
  });
};

function ButtonsDialog({
  winId,
  title,
  description,
  buttons,
  resolve,
}: {
  winId?: string;
  title: string;
  description: string;
  buttons: readonly {
    id: string;
    label: string;
    variant?: Parameters<typeof Button>[0]["variant"];
  }[];
  resolve: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <DialogFooter>
            {buttons.map(({ id, label, variant = "default" }) => (
              <Button
                key={id}
                variant={variant}
                onClick={() => {
                  resolve(id);
                  setOpen(false);
                  setTimeout(() => {
                    SubWindow.close(winId!);
                  }, 500);
                }}
              >
                {label}
              </Button>
            ))}
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
Dialog.buttons = <
  const Buttons extends readonly {
    id: string;
    label: string;
    variant?: Parameters<typeof Button>[0]["variant"];
  }[],
>(
  title: string,
  description: string,
  buttons: Buttons,
): Promise<Buttons[number]["id"]> => {
  return new Promise((resolve) => {
    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <ButtonsDialog {...{ title, description, buttons, resolve }} />,
    });
  });
};

function CopyDialog({
  winId,
  title,
  description,
  value,
  resolve,
}: {
  winId?: string;
  title: string;
  description: string;
  value: string;
  resolve: () => void;
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {/* <Textarea value={value} style={{ height: "300px", minHeigt: "600px" }} /> */}
          <pre className="max-h-64 select-text overflow-y-auto rounded-md border p-2">{value}</pre>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                await writeText(value);
                toast.success("已复制到剪贴板");
              }}
            >
              复制
            </Button>
            <Button
              onClick={() => {
                resolve();
                setOpen(false);
                setTimeout(() => {
                  SubWindow.close(winId!);
                }, 500);
              }}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
Dialog.copy = (title = "导出成功", description = "", value = ""): Promise<void> => {
  return new Promise((resolve) => {
    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <CopyDialog {...{ title, description, value, resolve }} />,
    });
  });
};

// type MyDirEntry = DirEntry &
//   (
//     | {
//         isSymlink: false;
//       }
//     | {
//         isSymlink: true;
//         target: URI;
//       }
//   );
const sysInfoPromise = allSysInfo();
const homeDirPromise = homeDir();
const desktopDirPromise = desktopDir();
const downloadDirPromise = downloadDir();
const documentDirPromise = documentDir();
function FileDialog({
  winId,
  title,
  kind,
  extensions,
  resolve,
}: {
  winId?: string;
  title: string;
  kind: "file" | "directory" | "save";
  extensions?: string[];
  resolve: (value?: URI) => void;
}) {
  const [open, setOpen] = React.useState(true);

  const sysInfo = React.use(sysInfoPromise);
  const homeDir = React.use(homeDirPromise);
  const desktopDir = React.use(desktopDirPromise);
  const downloadDir = React.use(downloadDirPromise);
  const documentDir = React.use(documentDirPromise);

  const [currentUri, setCurrentUri] = React.useState<URI>(URI.file("/"));
  const fs = React.useMemo(() => new fileSystemProviders[currentUri.scheme](), [currentUri.scheme]);
  const [data, setData] = React.useState<DirEntry[]>([]);
  const scrollParentRef = React.useRef<HTMLTableElement>(null);
  const [saveFileName, setSaveFileName] = React.useState<string>("");
  const [saveFileExtension, setSaveFileExtension] = React.useState<string>(extensions ? extensions[0] : "");

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 38,
    overscan: 5,
  });

  React.useEffect(() => {
    (async () => {
      setSaveFileName("");
      const entries = await fs.readDir(currentUri);
      // 排序：文件夹->文件->符号链接->隐藏的文件夹->隐藏的文件
      // 分别按照字母排序
      entries.sort((a, b) => {
        const getOrder = (entry: DirEntry) => {
          if (entry.isDirectory && !entry.name.startsWith(".")) return 0;
          if (entry.isFile && !entry.name.startsWith(".")) return 1;
          if (entry.isSymlink) return 2;
          if (entry.isDirectory && entry.name.startsWith(".")) return 3;
          if (entry.isFile && entry.name.startsWith(".")) return 4;
          return 5;
        };
        const orderA = getOrder(a);
        const orderB = getOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      setData(entries);
    })();
  }, [currentUri]);

  async function finishSave() {
    const existingEntry = data.find((entry) => entry.name === `${saveFileName}.${saveFileExtension}`);
    if (existingEntry) {
      if (existingEntry.isDirectory) {
        // 进入文件夹
        setCurrentUri(
          currentUri.with({
            path: `${currentUri.path}${currentUri.path.endsWith("/") ? "" : "/"}${existingEntry.name}`,
          }),
        );
        return;
      }
      // 覆盖提示
      if (
        !(await Dialog.confirm("文件已存在", `文件 ${saveFileName}.${saveFileExtension} 已存在，是否覆盖？`, {
          destructive: true,
        }))
      ) {
        return;
      }
    }
    resolve(
      currentUri.with({
        path: `${currentUri.path}${currentUri.path.endsWith("/") ? "" : "/"}${saveFileName}.${saveFileExtension}`,
      }),
    );
    setOpen(false);
    setTimeout(() => {
      SubWindow.close(winId!);
    }, 500);
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="max-w-full! h-2/3 w-1/2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind === "file" ? <File /> : <Folder />}
            {title}
            <div className="grow" />
            {kind === "save" && (
              <ButtonGroup>
                <Input
                  className="w-72"
                  placeholder="文件名"
                  value={saveFileName}
                  onChange={(e) => setSaveFileName(e.target.value)}
                  autoFocus
                  onKeyUp={(e) => {
                    if (e.key === "Enter" && saveFileName) {
                      finishSave();
                    }
                  }}
                />
                {extensions && (
                  <Select value={saveFileExtension} onValueChange={(ext) => setSaveFileExtension(ext)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {extensions.map((ext) => (
                        <SelectItem key={ext} value={ext} onSelect={() => setSaveFileExtension(ext)}>
                          .{ext}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </ButtonGroup>
            )}
            <Button
              variant="outline"
              onClick={() => {
                resolve(undefined);
                setOpen(false);
                setTimeout(() => {
                  SubWindow.close(winId!);
                }, 500);
              }}
            >
              <X />
              取消
            </Button>
            {kind === "directory" && (
              <Button
                onClick={() => {
                  resolve(currentUri);
                  setOpen(false);
                  setTimeout(() => {
                    SubWindow.close(winId!);
                  }, 500);
                }}
              >
                <Check />
                选择当前目录
              </Button>
            )}
            {kind === "save" && (
              <Button disabled={!saveFileName} onClick={finishSave}>
                <Check />
                保存
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex size-full gap-2 overflow-hidden">
          <Sidebar className="h-full overflow-auto p-0">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>用户目录</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {[
                      { icon: Home, name: "家目录", path: homeDir },
                      { icon: Dock, name: "桌面", path: desktopDir },
                      { icon: Download, name: "下载", path: downloadDir },
                      { icon: FileText, name: "文档", path: documentDir },
                    ].map((it) => (
                      <SidebarMenuItem key={it.path}>
                        <SidebarMenuButton
                          onClick={() => setCurrentUri(URI.file(it.path))}
                          isActive={currentUri.scheme === "file" && currentUri.fsPath.startsWith(it.path)}
                        >
                          <it.icon />
                          {it.name}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>挂载点</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sysInfo.disks.map((it) => (
                      <SidebarMenuItem key={it.mount_point}>
                        <SidebarMenuButton
                          onClick={() => setCurrentUri(URI.file(it.mount_point))}
                          isActive={currentUri.scheme === "file" && currentUri.fsPath.startsWith(it.mount_point)}
                        >
                          {it.is_removable ? <Usb /> : <HardDrive />}
                          {it.name} ({it.mount_point})
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <div className="flex grow flex-col gap-2 *:data-[slot=table-container]:h-full">
            <div className="flex gap-2">
              <Button
                disabled={currentUri.path === "/"}
                onClick={() => {
                  const segments = currentUri.path.replace(/\/$/g, "").split("/");
                  segments.pop();
                  const parentPath = segments.join("/") || "/";
                  setCurrentUri(currentUri.with({ path: parentPath }));
                }}
                size="icon"
                variant="outline"
              >
                <ArrowUp />
              </Button>
              <ButtonGroup className="grow">
                <Select value={currentUri.scheme} onValueChange={(scheme) => setCurrentUri(URI.from({ scheme }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(fileSystemProviders).map((scheme) => (
                      <SelectItem key={scheme} value={scheme}>
                        {scheme}:
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="grow"
                  value={currentUri.toString().replace(`${currentUri.scheme}://`, "")}
                  readOnly
                  onClick={async () => {
                    const value = await Dialog.input("手动设置 URI", "请输入 URI 中除去协议的部分，或完整的 URI", {
                      defaultValue: currentUri.toString().replace(/^[a-z]+:\/*/g, ""),
                    });
                    if (!value) return;
                    let newUri: URI;
                    if (value.match(/^[a-z]+:\/*/)) {
                      newUri = URI.parse(value);
                    } else {
                      let path = value;
                      if (!path.startsWith("/")) {
                        path = "/" + path;
                      }
                      newUri = currentUri.with({ path });
                    }
                    setCurrentUri(newUri);
                  }}
                />
              </ButtonGroup>
            </div>
            <Table ref={scrollParentRef}>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => (
                    <TableRow
                      className="block"
                      key={virtualRow.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      onClick={() => {
                        if (data[virtualRow.index].isDirectory) {
                          setCurrentUri(
                            currentUri.with({
                              path:
                                currentUri.path +
                                (currentUri.path.endsWith("/") ? "" : "/") +
                                data[virtualRow.index].name,
                            }),
                          );
                        }
                        if (data[virtualRow.index].isFile) {
                          if (kind === "file") {
                            resolve(
                              currentUri.with({
                                path:
                                  currentUri.path +
                                  (currentUri.path.endsWith("/") ? "" : "/") +
                                  data[virtualRow.index].name,
                              }),
                            );
                            setOpen(false);
                            setTimeout(() => {
                              SubWindow.close(winId!);
                            }, 500);
                          }
                          if (kind === "save") {
                            setSaveFileName(data[virtualRow.index].name);
                          }
                        }
                        if (data[virtualRow.index].isSymlink) {
                          toast.warning("由于技术限制，暂不支持读取符号链接");
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {data[virtualRow.index].isFile && <File size={16} />}
                          {data[virtualRow.index].isDirectory && <Folder size={16} />}
                          {data[virtualRow.index].isSymlink && <Link size={16} />}
                          {data[virtualRow.index].name}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </div>
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
Dialog.file = async (
  title: string,
  kind: "file" | "directory" | "save",
  extensions?: string[],
): Promise<URI | undefined> => {
  return new Promise((resolve) => {
    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: (
        <Suspense>
          <FileDialog {...{ title, kind, extensions, resolve }} />
        </Suspense>
      ),
    });
  });
};

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
