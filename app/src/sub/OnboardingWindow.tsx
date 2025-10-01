import { SubWindow } from "@/core/service/SubWindow";
import { Vector } from "@graphif/data-structures";
import { Rectangle } from "@graphif/shapes";

export default function OnboardingWindow() {
  return <></>;
}

OnboardingWindow.open = () => {
  SubWindow.create({
    children: <OnboardingWindow />,
    rect: Rectangle.inCenter(new Vector(innerWidth > 1653 ? 1240 : innerWidth * 0.75, innerHeight * 0.875)),
    titleBarOverlay: true,
    closable: true,
  });
};
