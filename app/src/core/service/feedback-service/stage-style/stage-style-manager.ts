import { service } from "@/core/project";
import { Settings } from "@/core/service/settings";
import { StageStyle } from "@/core/service/feedback-service/stage-style/stage-style";

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
