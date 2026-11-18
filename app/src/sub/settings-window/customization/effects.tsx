import { ButtonField, Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Settings } from "@/core/service/settings";
import { Check, Stars, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { registeredEffectIds as effects } from "@/core/service/feedback-service/effect-engine/effect-registry";

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
