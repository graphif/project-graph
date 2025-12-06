import { Popover } from "@/components/ui/popover";
import { cn } from "@/utils/cn";
import { fetch } from "@tauri-apps/plugin-http";
import { open } from "@tauri-apps/plugin-shell";
import { Calendar, ExternalLink, Heart, Server, User } from "lucide-react";
import { use } from "react";
import "./assets/font.css";

interface DonationData {
  user: string;
  note?: string;
  amount: number;
  currency?: string;
}

const donationsPromise = fetch(import.meta.env.LR_API_BASE_URL + "/api/donations").then((res) => res.json()) as Promise<
  DonationData[]
>;
/**
 * 鸣谢界面
 * @returns
 */
export default function CreditsTab() {
  const donations = use(donationsPromise);

  const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

  // 计算从2024年9月1日到现在的天数
  const startDate = new Date(2024, 8, 1);
  const currentDate = new Date();
  const monthsDiff =
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
    (currentDate.getMonth() - startDate.getMonth()) +
    (currentDate.getDate() >= startDate.getDate() ? 0 : -1);
  const actualMonths = Math.max(monthsDiff + 1, 1); // 至少为1个月
  const averageMonthlyAmount = totalAmount / actualMonths;
  const diffTime = currentDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const actualDays = Math.max(daysDiff + 1, 1); // 至少为1天

  return (
    <div className="mx-auto flex w-2/3 flex-col overflow-auto py-4">
      <div className="mb-4 flex gap-4">
        {import.meta.env.DEV ? (
          <>
            <div className="bg-muted/50 flex flex-1 flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-center gap-2">
                <Heart className="h-5 w-5" />
                <span className="text-lg">合计</span>
              </div>
              <div
                className={cn(
                  "flex items-end justify-center gap-2 text-center *:font-[DINPro]",
                  totalAmount < 0 ? "text-red-500" : "text-green-500",
                )}
              >
                <span className="text-3xl">{totalAmount.toFixed(2)}</span>
                <span className="text-xl">CNY</span>
              </div>
            </div>
            <div className="bg-muted/50 flex flex-1 flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-lg">平均每月</span>
              </div>
              <div
                className={cn(
                  "flex items-end justify-center gap-2 text-center *:font-[DINPro]",
                  averageMonthlyAmount < 0 ? "text-red-500" : "text-green-500",
                )}
              >
                <span className="text-3xl">{averageMonthlyAmount.toFixed(2)}</span>
                <span className="text-xl">CNY</span>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-muted/50 flex flex-1 flex-col items-center gap-2 rounded-lg border p-4 text-sm">
            <p className="text-center">在过去的{actualDays}个日夜中，是屏幕前您的认可与支持，给了我们最温暖的鼓励</p>
            <p className="text-xs opacity-50">您的支持可以让开发者的维护更持久，激励我们研究并创新</p>
            <div className="flex flex-nowrap items-center justify-center gap-1">
              <Heart className="size-4" />
              <span className="text-sm">谨以此墙，致敬所有同行者</span>
            </div>
          </div>
        )}

        <Popover.Confirm
          title="提示"
          description="此列表并不是实时更新的，开发者将在看到您捐赠后的第一时间手动更新此列表"
          onConfirm={() => open("https://2y.nz/pgdonate")}
        >
          <div className="bg-muted/50 **:cursor-pointer group flex flex-1 cursor-pointer flex-col justify-center gap-2 rounded-lg border p-4">
            <div className="flex items-center justify-center gap-2">
              <ExternalLink className="h-5 w-5" />
              <span className="text-lg">前往捐赠页面</span>
            </div>
            <div className="flex items-end justify-center gap-2 text-center">
              <span className="underline-offset-4 group-hover:underline">2y.nz/pgdonate</span>
            </div>
          </div>
        </Popover.Confirm>
      </div>

      <div className="columns-1 gap-4 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5">
        {donations.toReversed().map((donation, index) => (
          <Donation
            key={index}
            user={donation.user}
            note={donation.note}
            amount={donation.amount}
            currency={donation.currency}
          />
        ))}
      </div>
    </div>
  );
}

function Donation({
  user,
  note = "",
  amount,
  currency = "CNY",
}: {
  user: string;
  note?: string;
  amount: number;
  currency?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/50 mb-4 inline-flex w-full break-inside-avoid flex-col gap-2 rounded-lg border p-4",
        amount < 0 && "bg-destructive/25",
      )}
    >
      <div className="flex items-center gap-2">
        {amount < 0 ? <Server className="size-4" /> : <User className="size-4" />}
        <span className="text-sm font-medium">{user || "匿名"}</span>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-center gap-1 *:font-[DINPro]">
          <span className="text-lg font-bold">{amount}</span>
          <span className="text-muted-foreground text-sm">{currency}</span>
        </div>
      </div>

      {note && <div className="text-muted-foreground bg-background/50 rounded p-2 text-xs md:text-sm">{note}</div>}
    </div>
  );
}
