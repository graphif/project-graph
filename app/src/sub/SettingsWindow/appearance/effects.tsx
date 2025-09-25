import { ButtonField, Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Settings } from "@/core/service/Settings";
import { Check, Stars, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getOriginalNameOf } from "virtual:original-class-name";

/**
 * 实测log一下发现它是：
 * ["CircleChangeRadiusEffect", ...] 这样的格式
 */
const effects: string[] = Object.values(
  import.meta.glob("../../../core/service/feedbackService/effectEngine/concrete/*.tsx", {
    eager: true,
  }),
).map((module: any) => getOriginalNameOf(Object.values(module)[0] as any));

export default function EffectsPage() {
  const { t } = useTranslation("effects");
  const [effectsPerferences, setEffectsPerferences] = Settings.use("effectsPerferences");

  return (
    <>
      <ButtonField
        icon={<Check />}
        title="全开"
        onClick={() => {
          setEffectsPerferences(
            effects.reduce(
              (acc, effectName) => {
                acc[effectName] = true;
                return acc;
              },
              {} as Record<string, boolean>,
            ),
          );
        }}
        label="全开"
      />
      <ButtonField
        icon={<X />}
        title="全关"
        onClick={() => {
          setEffectsPerferences(
            effects.reduce(
              (acc, effectName) => {
                acc[effectName] = false;
                return acc;
              },
              {} as Record<string, boolean>,
            ),
          );
        }}
        label="全关"
      />
      <Field color="warning" title="如果修改了效果设置，需要重启软件才能生效。" />
      {effects.map((effectName) => (
        <Field
          key={effectName}
          icon={<Stars />}
          title={t(`${effectName}.title`)}
          description={t(`${effectName}.description`)}
        >
          <Switch
            checked={effectsPerferences[effectName] ?? true}
            onCheckedChange={(value: boolean) => {
              setEffectsPerferences({
                ...effectsPerferences,
                [effectName]: value,
              });
            }}
          />
        </Field>
      ))}
    </>
  );
}
