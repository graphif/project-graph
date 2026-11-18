import { isMyGo } from "mygo-runtime";
import { Dialogs, type FileDialogOptions } from "@/generated/mygo";

type Options = Partial<FileDialogOptions>;

function normalize(options: Options): FileDialogOptions {
  return {
    title: options.title ?? "",
    defaultPath: options.defaultPath ?? "",
    directory: options.directory ?? false,
    multiple: options.multiple ?? false,
    filters: options.filters ?? [],
  };
}

export function open(options: Options & { multiple: true }): Promise<string[] | null>;
export function open(options?: Options & { multiple?: false }): Promise<string | null>;
export function open(options: Options): Promise<string | string[] | null>;
export async function open(options: Options = {}): Promise<string | string[] | null> {
  if (!isMyGo()) throw new Error("Desktop host missing: native dialogs require MyGo.");
  const paths = await Dialogs.open(normalize(options));
  if (!paths?.length) return null;
  return options.multiple ? paths : paths[0];
}

export async function save(options: Options = {}): Promise<string | null> {
  if (!isMyGo()) throw new Error("Desktop host missing: native dialogs require MyGo.");
  return (await Dialogs.save(normalize(options))) || null;
}
