import { Settings } from "@/core/service/Settings";
import { Button } from "./ui/button";
import { Toolbar } from "./ui/toolbar";
import { MousePointer, Pencil, Waypoints } from "lucide-react";
import { Tooltip } from "./ui/tooltip";
import { TooltipContent, TooltipTrigger } from "@radix-ui/react-tooltip";
import { useTranslation } from "react-i18next";

export default function ToolbarContent() {
  const { t } = useTranslation("keyBinds");
  return (
    <Toolbar className="absolute bottom-0 left-1/2 -translate-x-1/2 transform">
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              Settings.mouseLeftMode = "selectAndMove";
            }}
          >
            <MousePointer />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("checkoutLeftMouseToSelectAndMove.title")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              Settings.mouseLeftMode = "draw";
            }}
          >
            <Pencil />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("checkoutLeftMouseToDrawing.title")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              Settings.mouseLeftMode = "connectAndCut";
            }}
          >
            <Waypoints />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("checkoutLeftMouseToConnectAndCutting.title")}</TooltipContent>
      </Tooltip>
    </Toolbar>
  );
}
