import { mockIPC } from "@tauri-apps/api/mocks";

// Store 实例管理
const stores = new Map<number, Map<string, unknown>>();
let resourceIdCounter = 1;
const STORE_PREFIX = "tauri_store_";

// 获取或创建 store 实例
function getStore(rid: number): Map<string, unknown> {
  if (!stores.has(rid)) {
    stores.set(rid, new Map());
  }
  return stores.get(rid)!;
}

// 从 localStorage 加载 store 数据
function loadStoreFromStorage(path: string): Map<string, unknown> {
  const key = STORE_PREFIX + path;
  const data = localStorage.getItem(key);

  if (data) {
    try {
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch {
      return new Map();
    }
  }
  return new Map();
}

// 保存 store 数据到 localStorage
function saveStoreToStorage(path: string, storeData: Map<string, unknown>): void {
  const key = STORE_PREFIX + path;
  const obj = Object.fromEntries(storeData);
  localStorage.setItem(key, JSON.stringify(obj));
}

// 存储路径到 rid 的映射
const pathToRid = new Map<string, number>();

export function enableMockStore() {
  mockIPC((cmd, args: any) => {
    switch (cmd) {
      // 加载或创建 store
      case "plugin:store|load": {
        const { path, options } = args;
        let rid = pathToRid.get(path);

        if (!rid) {
          rid = resourceIdCounter++;
          pathToRid.set(path, rid);

          // 检查 localStorage 中是否有已有的数据
          const existingData = loadStoreFromStorage(path);
          const store = getStore(rid);

          if (options?.overrideDefaults && existingData.size > 0) {
            // 覆盖默认值，使用磁盘数据
            existingData.forEach((value, key) => {
              store.set(key, value);
            });
          } else if (options?.createNew || existingData.size === 0) {
            // 创建新的或不存在时使用默认值
            if (options?.defaults) {
              Object.entries(options.defaults).forEach(([key, value]) => {
                store.set(key, value);
              });
            }
            // 如果有现有数据且不是 createNew，则合并
            if (!options?.createNew) {
              existingData.forEach((value, key) => {
                if (!store.has(key)) {
                  store.set(key, value);
                }
              });
            }
          } else {
            // 合并默认值和磁盘数据
            if (options?.defaults) {
              Object.entries(options.defaults).forEach(([key, value]) => {
                if (!existingData.has(key)) {
                  existingData.set(key, value);
                }
              });
            }
            existingData.forEach((value, key) => {
              store.set(key, value);
            });
          }

          // 保存到 localStorage
          saveStoreToStorage(path, store);
        }

        return rid;
      }

      // 获取已加载的 store
      case "plugin:store|get_store": {
        const { path } = args;
        const rid = pathToRid.get(path);
        return rid ?? null;
      }

      // 设置值
      case "plugin:store|set": {
        const { rid, key, value } = args;
        const store = getStore(rid);
        store.set(key, value);

        // 获取路径并保存到 localStorage
        let path = "";
        pathToRid.forEach((storeRid, storePath) => {
          if (storeRid === rid) {
            path = storePath;
          }
        });

        if (path) {
          saveStoreToStorage(path, store);
        }

        return undefined;
      }

      // 获取值
      case "plugin:store|get": {
        const { rid, key } = args;
        const store = getStore(rid);
        const value = store.get(key);
        const exists = store.has(key);
        return [value, exists];
      }

      // 检查键是否存在
      case "plugin:store|has": {
        const { rid, key } = args;
        const store = getStore(rid);
        return store.has(key);
      }

      // 删除键
      case "plugin:store|delete": {
        const { rid, key } = args;
        const store = getStore(rid);
        const deleted = store.has(key);
        store.delete(key);

        // 保存到 localStorage
        let path = "";
        pathToRid.forEach((storeRid, storePath) => {
          if (storeRid === rid) {
            path = storePath;
          }
        });

        if (path) {
          saveStoreToStorage(path, store);
        }

        return deleted;
      }

      // 清空 store
      case "plugin:store|clear": {
        const { rid } = args;
        const store = getStore(rid);
        store.clear();

        // 保存到 localStorage
        let path = "";
        pathToRid.forEach((storeRid, storePath) => {
          if (storeRid === rid) {
            path = storePath;
          }
        });

        if (path) {
          saveStoreToStorage(path, store);
        }

        return undefined;
      }

      // 重置为默认值
      case "plugin:store|reset": {
        const { rid } = args;
        const store = getStore(rid);

        // 获取路径和原始选项
        let path = "";
        pathToRid.forEach((storeRid, storePath) => {
          if (storeRid === rid) {
            path = storePath;
          }
        });

        // 清空并使用默认值
        store.clear();

        // 保存到 localStorage
        if (path) {
          saveStoreToStorage(path, store);
        }

        return undefined;
      }

      // 获取所有键
      case "plugin:store|keys": {
        const { rid } = args;
        const store = getStore(rid);
        return Array.from(store.keys());
      }

      // 获取所有值
      case "plugin:store|values": {
        const { rid } = args;
        const store = getStore(rid);
        return Array.from(store.values());
      }

      // 获取所有条目
      case "plugin:store|entries": {
        const { rid } = args;
        const store = getStore(rid);
        return Array.from(store.entries());
      }

      // 获取长度
      case "plugin:store|length": {
        const { rid } = args;
        const store = getStore(rid);
        return store.size;
      }

      // 重新加载
      case "plugin:store|reload": {
        const { rid, ignoreDefaults } = args;
        const store = getStore(rid);

        // 获取路径
        let path = "";
        pathToRid.forEach((storeRid, storePath) => {
          if (storeRid === rid) {
            path = storePath;
          }
        });

        if (path) {
          const diskData = loadStoreFromStorage(path);

          if (ignoreDefaults) {
            // 完全替换为磁盘数据
            store.clear();
            diskData.forEach((value, key) => {
              store.set(key, value);
            });
          } else {
            // 合并磁盘数据，磁盘数据优先
            diskData.forEach((value, key) => {
              store.set(key, value);
            });
          }
        }

        return undefined;
      }

      // 保存到磁盘
      case "plugin:store|save": {
        const { rid } = args;
        const store = getStore(rid);

        // 获取路径
        let path = "";
        pathToRid.forEach((storeRid, storePath) => {
          if (storeRid === rid) {
            path = storePath;
          }
        });

        if (path) {
          saveStoreToStorage(path, store);
        }

        return undefined;
      }

      default:
        return undefined;
    }
  });
}
