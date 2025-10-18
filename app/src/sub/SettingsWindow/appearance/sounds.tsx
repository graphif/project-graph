import FileChooser from "@/components/ui/file-chooser";
import { Popover } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Settings } from "@/core/service/Settings";
import { SoundService } from "@/core/service/feedbackService/SoundService";
import { AssetsRepository } from "@/core/service/AssetsRepository";
import { open } from "@tauri-apps/plugin-shell";
import { ExternalLink, Volume2, VolumeX, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { tempDir, join } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import { SettingField } from "@/components/ui/field";

// 音效配置列表
const SOUND_CONFIGS = [
  {
    settingKey: "cuttingLineStartSoundFile",
    name: "开始切割",
    testFunction: SoundService.play.cuttingLineStart,
    fileName: "cuttingLineStart.mp3",
  },
  {
    settingKey: "cuttingLineReleaseSoundFile",
    name: "释放切割",
    testFunction: SoundService.play.cuttingLineRelease,
    fileName: "cuttingLineRelease.mp3",
  },
  {
    settingKey: "connectLineStartSoundFile",
    name: "开始连接",
    testFunction: SoundService.play.connectLineStart,
    fileName: "connectLineStart.mp3",
  },
  {
    settingKey: "connectFindTargetSoundFile",
    name: "找到连接目标",
    testFunction: SoundService.play.connectFindTarget,
    fileName: "connectFindTarget.mp3",
  },
  {
    settingKey: "alignAndAttachSoundFile",
    name: "对齐吸附",
    testFunction: SoundService.play.alignAndAttach,
    fileName: "alignAndAttach.mp3",
  },
  {
    settingKey: "uiButtonEnterSoundFile",
    name: "按钮悬停",
    testFunction: SoundService.play.mouseEnterButton,
    fileName: "uiButtonEnter.mp3",
  },
  {
    settingKey: "uiButtonClickSoundFile",
    name: "按钮点击",
    testFunction: SoundService.play.mouseClickButton,
    fileName: "uiButtonClick.mp3",
  },
  {
    settingKey: "uiSwitchButtonOnSoundFile",
    name: "开关开启",
    testFunction: SoundService.play.mouseClickSwitchButtonOn,
    fileName: "uiSwitchButtonOn.mp3",
  },
  {
    settingKey: "uiSwitchButtonOffSoundFile",
    name: "开关关闭",
    testFunction: SoundService.play.mouseClickSwitchButtonOff,
    fileName: "uiSwitchButtonOff.mp3",
  },
];

// 一键下载并设置所有音效
const downloadAndSetAllSounds = async () => {
  try {
    toast.promise(
      async () => {
        // 创建临时目录用于存储音效文件
        const dir = await tempDir();

        // 逐个下载音效文件并设置
        for (const config of SOUND_CONFIGS) {
          try {
            // 从GitHub仓库下载音效文件
            const u8a = await AssetsRepository.fetchFile(`sfx/${config.fileName}`);
            const path = await join(dir, config.fileName);
            await writeFile(path, u8a);

            // 设置音效文件路径
            // @ts-expect-error settingKey is keyof Settings
            Settings[config.settingKey] = path;
          } catch (error) {
            console.error(`下载音效文件 ${config.fileName} 失败:`, error);
            throw new Error(`下载音效文件 ${config.fileName} 失败`);
          }
        }

        // 播放一个音效来验证设置成功
        if (Settings.soundEnabled && SOUND_CONFIGS.length > 0) {
          SOUND_CONFIGS[0].testFunction();
        }

        return true;
      },
      {
        loading: "正在下载并设置音效文件...",
        success: "所有音效文件已成功下载并设置！",
        error: (err) => `设置音效失败: ${err.message}`,
      },
    );
  } catch (error) {
    console.error("一键设置音效失败:", error);
    toast.error("一键设置音效失败，请稍后重试");
  }
};

export default function SoundEffectsPage() {
  const { t } = useTranslation("sounds");
  const [soundEnabled] = Settings.use("soundEnabled");

  // 在组件顶层预先调用所有需要的Settings.use，避免在循环中调用Hooks
  const soundFilePaths = SOUND_CONFIGS.reduce(
    (acc, config) => {
      acc[config.settingKey] = Settings.use(config.settingKey as any)[0];
      return acc;
    },
    {} as Record<string, string>,
  );

  // 测试音效
  const handleTestSound = (testFunction: () => void) => {
    if (soundEnabled) {
      testFunction();
    }
  };

  return (
    <div className="space-y-4">
      <p>提示：目前此页面有一个bug：需要切换一下页面再切回来，才能看到改动的效果</p>
      <div className="bg-muted flex items-center justify-between rounded-lg p-4">
        <div className="flex items-center gap-2">
          {soundEnabled ? <Volume2 /> : <VolumeX />}
          <span>{t("soundEnabled")}</span>
        </div>
        <Switch
          checked={soundEnabled}
          onCheckedChange={(value: boolean) => {
            Settings.soundEnabled = value;
          }}
        />
      </div>
      <SettingField settingKey={"soundPitchVariationRange"} />

      {soundEnabled && (
        <div className="space-y-2">
          {/* 一键设置所有音效按钮 */}
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:outline-none focus-visible:ring-2"
            onClick={downloadAndSetAllSounds}
          >
            <Download className="h-4 w-4" />
            <span>一键下载并设置所有官方音效</span>
          </button>
        </div>
      )}
      <Popover.Confirm
        title="提示"
        description="即将跳转github页面。如果github页面无法打开，请自行解决或使用自定义音效。"
        onConfirm={() => open("https://github.com/graphif/assets")}
      >
        <div className="bg-muted/50 **:cursor-pointer group flex flex-1 cursor-pointer flex-col justify-center gap-2 rounded-lg border p-4">
          <div className="flex items-center justify-center gap-2">
            <ExternalLink className="h-5 w-5" />
            <span className="text-lg">前往官方静态资源Github仓库:</span>
          </div>
          <div className="flex items-end justify-center gap-2 text-center">
            <span className="underline-offset-4 group-hover:underline">https://github.com/graphif/assets</span>
          </div>
        </div>
      </Popover.Confirm>
      {SOUND_CONFIGS.map(({ settingKey, name, testFunction }) => {
        const filePath = soundFilePaths[settingKey];
        return (
          <div key={settingKey} className="bg-muted flex items-center justify-between rounded-lg p-4">
            <div className="flex w-full flex-col">
              <span>{name}</span>
              <FileChooser
                kind="file"
                value={filePath || ""}
                onChange={(value) => {
                  // @ts-expect-error settingKey is keyof Settings
                  Settings[settingKey] = value;
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className="hover:bg-accent rounded-full p-2"
                onClick={() => handleTestSound(testFunction)}
                disabled={!filePath}
                title={t("testSound")}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>
          </div>
        );
      })}

      {!soundEnabled && (
        <div className="bg-muted/50 text-muted-foreground rounded-lg p-4 text-center">
          <p>{t("soundDisabledHint")}</p>
        </div>
      )}
    </div>
  );
}
