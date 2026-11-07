import { service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { StageStyle } from "@/core/service/feedbackService/stageStyle/stageStyle";

/**
 * 舞台上的颜色风格管理器
 */
@service("stageStyleManager")
export class StageStyleManager {
  currentStyle = new StageStyle();

  // 软件启动运行一次
  constructor() {
    Settings.watch("theme", (value) => {
      this.currentStyle = StageStyle.styleFromTheme(value);
    });
  }
}
