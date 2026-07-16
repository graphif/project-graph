import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSubWindow } from "@/core/subWindowOpen";
import { TabWorkspace } from "@/core/TabWorkspace";
import { cn } from "@/utils/cn";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";
import { useState } from "react";
import z from "zod";

export interface FormOptions {
  title: string;
  confirmText?: string;
  cancelText?: string;
}

export function FormWindow(
  props: FormOptions & { schema: z.ZodObject; onConfirm: (data: any) => void; onCancel: () => void },
) {
  const [data, setData] = useState<Record<string, any>>(() => {
    // 对于没有默认值的boolean字段，使用false作为默认值，其他字段不变
    const initialData: Record<string, any> = {};
    for (const [key, value] of Object.entries(props.schema.shape)) {
      if (value.type === "string") {
        initialData[key] = "";
      } else if (value.type === "boolean") {
        initialData[key] = false;
      } else {
        initialData[key] = undefined;
      }
    }
    return initialData;
  });
  const [issues, setIssues] = useState<z.core.$ZodIssue[]>([]);

  function validate() {
    try {
      props.schema.parse(data);
      setIssues([]);
      return true;
    } catch (error) {
      if (!(error instanceof z.ZodError)) throw error;
      const zodError = error as z.ZodError;
      setIssues(zodError.issues);
      return false;
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (validate()) {
          props.onConfirm(data);
        }
      }}
      className="flex flex-col gap-4 p-4"
    >
      {Object.entries(props.schema.shape).map(([key, rawValue]) => {
        let value: z.core.$ZodType;
        if (rawValue instanceof z.ZodOptional) {
          value = rawValue.def.innerType;
        } else {
          value = rawValue;
        }
        return (
          <div
            key={key}
            className={cn(
              "outline-destructive/10 flex flex-col gap-2 outline-0 transition-all",
              value instanceof z.ZodBoolean && "flex-row items-center",
              issues.find((issue) => issue.path[0] === key) && "bg-destructive/10 rounded-lg outline-8",
            )}
          >
            {value instanceof z.ZodBoolean && (
              <Checkbox
                checked={data[key] as boolean}
                onCheckedChange={(checked) => setData({ ...data, [key]: checked })}
              />
            )}
            <span
              onClick={() => {
                if (value instanceof z.ZodBoolean) {
                  setData({ ...data, [key]: !data[key] });
                }
              }}
            >
              {(value as z.ZodType).description ?? key}
            </span>
            {value instanceof z.ZodString ? (
              <Textarea value={data[key] as string} onChange={(e) => setData({ ...data, [key]: e.target.value })} />
            ) : value instanceof z.ZodNumber ? (
              <Input
                type="number"
                value={data[key] as number}
                onChange={(e) => setData({ ...data, [key]: Number(e.target.value) })}
              />
            ) : value instanceof z.ZodUnion ? (
              <Select value={data[key]} onValueChange={(value) => setData({ ...data, [key]: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {value.options.map((option, index) => (
                      <SelectItem key={index} value={(option as z.ZodLiteral).values.values().next().value as string}>
                        {(option as z.ZodLiteral).description ?? (option as z.ZodLiteral).values.values().next().value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <span>不支持的类型: {(value as z.ZodType).type}</span>
            )}
            {issues.find((issue) => issue.path[0] === key) && (
              <span className="text-destructive text-sm">
                {issues.find((issue) => issue.path[0] === key)?.message ?? "未知错误"}
              </span>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button type="submit">{props.confirmText ?? "确认"}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            props.onCancel();
          }}
        >
          {props.cancelText ?? "取消"}
        </Button>
      </div>
    </form>
  );
}

FormWindow.open = (schema: z.ZodObject, options: FormOptions): Promise<z.infer<typeof schema>> => {
  return new Promise((resolve, reject) => {
    const win = createSubWindow("FormWindow", {
      title: options.title,
      children: (
        <FormWindow
          {...{
            schema,
            ...options,
            onConfirm: (data) => {
              resolve(data);
              void TabWorkspace.close(win.id);
            },
            onCancel: () => {
              reject();
              void TabWorkspace.close(win.id);
            },
          }}
        />
      ),
      rect: new Rectangle(
        new Vector(innerWidth * 0.65, innerHeight * 0.1875),
        new Vector(innerWidth * 0.175, innerHeight * 0.625),
      ),
      closable: false,
      closeOnEscape: false,
    });
  });
};
