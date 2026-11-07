import { FallbackProps } from "react-error-boundary";
import { toast } from "sonner";
import { Button } from "./components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Popover } from "./components/ui/popover";
import { Project } from "./core/Project";
import { store, tabsAtom } from "./state";

export default function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="bg-background text-foreground flex h-screen w-screen flex-col items-center justify-center gap-4">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="mb-2 text-xl">React 组件渲染出错</CardTitle>
          <CardDescription>
            <p>报错时间: {new Date().toLocaleString()}</p>
            <p>报错信息: {String(error)}</p>
            <p>
              <span className="text-foreground font-bold">您的文件没有丢失</span>，可尝试点击下方按钮重试，或保存文件
            </p>
            <p>如果问题持续存在，请保存文件并强制重启软件</p>
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button onClick={resetErrorBoundary}>重试</Button>
          <Button
            variant="outline"
            onClick={async () => {
              for (const tab of store.get(tabsAtom)) {
                if (tab instanceof Project) {
                  await toast
                    .promise(tab.save(), {
                      loading: `正在保存 ${tab.title}...`,
                      success: `成功保存 ${tab.title}`,
                      error: (error) => `保存 ${tab.title} 失败: ${String(error)}`,
                    })
                    .unwrap();
                }
              }
              toast.success("所有文件已保存");
            }}
          >
            保存所有文件
          </Button>
          <Popover.Confirm
            title="是否强制重启应用？"
            description="所有未保存的文件将会丢失"
            onConfirm={() => location.reload()}
          >
            <Button variant="destructive">强制重启</Button>
          </Popover.Confirm>
        </CardFooter>
      </Card>
    </div>
  );
}
