import { Project, service } from "@/core/project";
import { Settings } from "@/core/service/settings";
import { StageStyle } from "@/core/service/feedback-service/stage-style/stage-style";

/**
 * 舞台上的颜色风格管理器
 */
@service("stageStyleManager")
export class StageStyleManager {
  currentStyle = new StageStyle();

  // 软件启动运行一次
  constructor(private readonly project: Project) {
    const syncStageStyle = () => {
      this.currentStyle = StageStyle.styleFromTheme(Settings.theme);
      // 主题或窗口背景不透明度切换（含 ViewTransition 捕获新快照）时立即重置倒计时并同步重绘画布，避免旧主题画布残留造成透明度叠加异常
      if (this.project?.renderer && this.project.canvas?.ctx && this.project.renderer.w > 0) {
        this.project.controller?.resetCountdownTimer();
        this.project.renderer.tick();
      }
    };
    Settings.watch("theme", syncStageStyle);
    Settings.watch("windowBackgroundAlpha", syncStageStyle);
  }
}
