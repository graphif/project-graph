import { getVersion } from "@/platform/app";
import { Native } from "@/platform/desktop";

export async function writeStdout(content: string): Promise<void> {
  return Native.writeStdout(content);
}

export async function writeStderr(content: string): Promise<void> {
  return Native.writeStderr(content);
}

export async function openDevtools(): Promise<void> {
  return Native.openDevtools();
}

export async function exit(code: number = 0): Promise<void> {
  return Native.exit(code);
}

export async function getAppVersion(): Promise<string> {
  return getVersion();
}

export async function getDeviceId(): Promise<string> {
  return Native.deviceID();
}
