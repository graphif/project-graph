import { Field } from "@/components/ui/field";
import { Settings } from "@/core/service/Settings";
import { Themes } from "@/core/service/Themes";
import { Color } from "@graphif/color";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ThemePage() {
  const { i18n } = useTranslation();
  const [currentTheme, setCurrentTheme] = Settings.use("theme");

  return (
    <>
      {Themes.builtinThemes.map((theme) => (
        <Field
          key={theme.metadata.id}
          title={theme.metadata.name[i18n.resolvedLanguage!]}
          description={theme.metadata.description.zh_CN + "\n" + theme.metadata.author}
          style={{
            backgroundImage: getThemeGradient(theme.metadata.id),
          }}
          className="mb-4 cursor-pointer rounded-2xl text-white transition-all active:rounded-3xl"
          onClick={() => setCurrentTheme(theme.metadata.id)}
        >
          {currentTheme === theme.metadata.id && <Check className="text-white mix-blend-difference" />}
        </Field>
      ))}
    </>
  );
}

function getThemeGradient(theme: string) {
  const { content: colors } = Themes.getThemeById(theme)!;
  // 获取上面数组中定义的颜色
  const gradientColors = [colors.background, colors.popover, colors.secondary, colors.accent, colors.stage.Background]
    .map((it) => Color.fromCSS(it))
    .sort((a, b) => b.c - a.c);
  // 生成css渐变
  return `linear-gradient(to right,${gradientColors.join(",")})`;
}

getThemeGradient("park");
