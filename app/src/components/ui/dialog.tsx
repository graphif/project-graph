import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubWindow } from "@/core/service/SubWindow";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";

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
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
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

Dialog.confirm = (title = "你确定？", description = "", { destructive = false } = {}): Promise<boolean> => {
  return new Promise((resolve) => {
    function Component({ winId }: { winId?: string }) {
      const [open, setOpen] = React.useState(true);

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
                >
                  确定
                </Button>
              </DialogFooter>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    }

    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <Component />,
    });
  });
};

Dialog.input = (
  title = "请输入文本",
  description = "",
  { defaultValue = "", placeholder = "...", destructive = false, multiline = false } = {},
): Promise<string | undefined> => {
  return new Promise((resolve) => {
    function Component({ winId }: { winId?: string }) {
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
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    resolve(undefined);
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
                  取消（Esc）
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
                  确定（Enter）
                </Button>
              </DialogFooter>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    }

    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <Component />,
    });
  });
};

Dialog.buttons = <
  const Buttons extends readonly {
    id: string;
    label: string;
    variant?: Parameters<typeof Button>[number]["variant"];
  }[],
>(
  title: string,
  description: string,
  buttons: Buttons,
): Promise<Buttons[number]["id"]> => {
  return new Promise((resolve) => {
    function Component({ winId }: { winId?: string }) {
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

    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <Component />,
    });
  });
};

Dialog.copy = (title = "导出成功", description = "", value = ""): Promise<void> => {
  return new Promise((resolve) => {
    function Component({ winId }: { winId?: string }) {
      const [open, setOpen] = React.useState(true);

      return (
        <Dialog open={open}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
              <pre className="max-h-64 max-w-96 select-text overflow-y-auto rounded-md border p-2">{value}</pre>
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

    SubWindow.create({
      titleBarOverlay: true,
      closable: false,
      rect: new Rectangle(Vector.same(100), Vector.same(-1)),
      children: <Component />,
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
