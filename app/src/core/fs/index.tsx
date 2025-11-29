import { createFs } from "@graphif/fs";
import { FsProviderHttp } from "@graphif/fs-http";
import { FsProviderTauri } from "@graphif/fs-tauri";
import { fetch } from "@tauri-apps/plugin-http";
import { FsProviderDraft } from "./FsProviderDraft";

export const fs = createFs().use(FsProviderTauri).use(FsProviderDraft).use(FsProviderHttp, fetch);
