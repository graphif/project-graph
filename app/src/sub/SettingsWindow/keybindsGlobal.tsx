import { SettingField } from "@/components/ui/field";

export default function KeyBindsGlobalPage() {
  return (
    <div className="p-4">
      <h2>全局快捷键</h2>
      <p>说明：目前仅有两个全局快捷键：Alt+1 打开软件窗口，Alt+2 开启/关闭窗口穿透点击。</p>
      <SettingField settingKey="allowGlobalHotKeys" />
    </div>
  );
}
