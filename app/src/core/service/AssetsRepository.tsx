export namespace AssetsRepository {
  const repo = "https://assets.graphif.dev";

  /**
   * @param path 开头不能是`/`
   */
  export async function fetchFile<T extends string>(path: T extends `/${string}` ? never : T): Promise<Uint8Array> {
    const r = await fetch(AssetsRepository.getGuideFileUrl(path));
    if (!r.ok) throw new Error(`Failed to fetch asset: ${r.status} ${r.statusText}`);
    return new Uint8Array(await r.arrayBuffer());
  }

  export function getGuideFileUrl<T extends string>(path: T extends `/${string}` ? never : T) {
    return `${repo}/${path}`;
  }
}
