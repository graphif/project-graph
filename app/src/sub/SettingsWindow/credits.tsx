import { Popover } from "@/components/ui/popover";
import { cn } from "@/utils/cn";
import { open } from "@tauri-apps/plugin-shell";
import { Calendar, ExternalLink, Heart, Server, User } from "lucide-react";
import "./assets/font.css";

interface DonationData {
  user: string;
  note?: string;
  amount: number;
  currency?: string;
}

// 新的在前
const donations: DonationData[] = [
  { user: "购买服务器", note: "zty012", amount: -480 },
  // { user: "域名 2y.nz", note: "zty012", amount: -151.8 },
  // { user: "MacBook", note: "littlefean", amount: -7599.2 },
  { user: "域名 project-graph.top", note: "zty012", amount: -13.66 },
  // 以下为捐赠用户
  { user: "", note: "加油大伙，你们是最帅的，希望这个最快的开发越来越好", amount: 20 },
  { user: "xiazhan", note: "", amount: 40 },
  { user: "专心神游", note: "感谢你们带来的如此简约而强大的应用，感谢你们的无私奉献", amount: 10 },
  { user: "🍒", note: "感谢开源！", amount: 50 },
  { user: "虹色之梦", note: "超棒的软件，开发速度超乎想象，我喜欢这个", amount: 10 },
  { user: "狸猫", note: "自由思维，自由记录记录思绪的自然律动，捕捉灵感的无限扩散", amount: 20 },
  { user: "季不是鸡", note: "蛙趣……？原来这里才是捐赠界面……", amount: 10 },
  { user: "隔壁小王", note: "老哥能不能构建个Linux arm版本的呢？", amount: 50 },
  { user: "田子", note: "优秀的开源项目！", amount: 20 },
  { user: "", note: "非常感谢，软件真的很好用！！", amount: 20 },
  { user: "", note: "请你喝瓶好的", amount: 20 },
  { user: "葉谋", note: "软件很棒，加油", amount: 5 },
  { user: "yunlunnn", note: "没什么钱，潜力很大，浅浅支持一下", amount: 10 },
  { user: "韭莲宝灯", note: "", amount: 10 },
  { user: "Wall", note: "非常喜欢的产品，加油", amount: 100 },
  { user: "旅人与猫&", note: "感谢开发这么好用的软件，对于知识框架搭建有着极好的帮助", amount: 50 },
  { user: "djh", note: "", amount: 8.88 },
  { user: "beta Orionis", note: "pg神软！可否新增vim键位？", amount: 20 },
  { user: "DeDo", note: "加油加油🐱", amount: 8.88 },
  { user: "", note: "比市面上常见的那几个软件好用", amount: 20 },
  { user: "hussein", note: "做大做强", amount: 5 },
  { user: "Shawnpoo", note: "PRG很棒，加油", amount: 5 },
  { user: "Yun Ti", note: "希望大佬以后添加子舞台嵌套功能", amount: 6.66 },
  { user: "张新磊", note: "解密加群", amount: 20 },
  { user: "小马", note: "感谢开源带来的便利与惊喜，期待越来越好", amount: 200 },
  { user: "天行健", note: "伟大之作", amount: 20.01 },
  { user: "弘毅", note: "pg大佬们加油", amount: 6.66 },
  { user: "Yahha", note: "", amount: 10 },
  { user: "X-rayDK 小风", note: "捐赠一波", amount: 50 },
  { user: "1", note: "感谢开发project graph", amount: 5 },
  { user: "xxx", note: "", amount: 5 },
  { user: "马栋", note: "祝软件越来越好，主要是太好用了", amount: 10 },
  { user: "荔枝2333", note: "好东西，期待更完善的功能", amount: 50 },
  { user: "Amayer", note: "支持一下", amount: 10 },
  { user: "Freaky Forward.", note: "软件及理念深得我心是我寻找已久的软件！希望能走得更远", amount: 25 },
  { user: "至岸", note: "", amount: 2 },
  { user: " ", note: "很棒的酷东西，不是吗？", amount: 100 },
  { user: "MT-F不觉💯", note: "非常牛逼的应用", amount: 6.66 },
  { user: "巴巴拉斯", note: "加油！", amount: 20 },
  { user: "丞相何故发笑", note: "", amount: 6.66 },
  { user: "宏坤", note: "", amount: 10 },
  { user: "", note: "刚开始用就被作者的思维导图震撼到了，还是小学生支持一下", amount: 1 },
  { user: "好吃的琵琶腿", note: "感谢大佬", amount: 1 },
  { user: "[C-S-Z]", note: "我喜欢这个ui设计", amount: 10 },
  { user: "今晚打老虎", note: "支持", amount: 20 },
  { user: "山东扣扣人", note: "很简洁明了 好", amount: 5 },
  { user: "程彦轲", note: "pg是一个极其有潜力的项目，期待继续更新新的功能", amount: 50 },
  { user: "Oxygen_Retrain", note: "感谢开发者们为Linux提供支持，加油", amount: 10 },
  { user: "末影", note: "", amount: 20 },
  { user: "不入", note: "希望可以考虑 32 64版本适用以及贝塞尔曲线自定义形状问题", amount: 30 },
  { user: "", note: "加油加油", amount: 20 },
  { user: "🍀🌟🏅 叶善译", note: "开源万岁，加油加油", amount: 20 },
  { user: "asasasasaa", note: "加油，希望你们做的更好", amount: 5 },
  { user: "韩淼", note: "pg软件挺好用", amount: 40 },
  { user: "番茄炒土豆", note: "希望越来越好", amount: 5 },
  { user: "V_V", note: "", amount: 5 },
  { user: "哈士基🐶", note: "知识没有这么廉价，但这个月太穷", amount: 50 },
  { user: "端点", note: "希望能一直做下去，请加油", amount: 50 }, // 9.5
  { user: "Fush1d5", note: "", amount: 88 }, // 9.5
  { user: "20", note: "感谢开源，你的劳动应得回报", amount: 50 }, // 9.4
  { user: "三知六应", note: "感谢群主一直耐心倾听我的需求，并给我解答", amount: 20 }, // 9.3
  { user: "闫刚", note: "感谢🙏", amount: 5 }, // 9.2
  { user: "", note: "", amount: 20 }, // 8.31
  { user: "天", note: "能设置连线不穿过文本框就好了", amount: 5 },
  { user: "", note: "用了半年，非常好用，由于经济能力有限，只能捐些小钱", amount: 5 },
  { user: "余伟锋", note: "", amount: 5 },
  { user: "墨水云裳", note: "", amount: 5 },
  { user: "ShawnSnow", note: "感谢PG", amount: 40 },
  { user: "飞度", note: "做的很酷，真的谢谢你们", amount: 50 },
  { user: "鳕鱼", note: "支持开源支持国产，加油", amount: 70 },
  { user: "木头", amount: 100 },
  { user: "林檎LOKI", amount: 5 },
  { user: "Edelweiß", amount: 5 },
  { user: "Z·z.", note: "求个ipad版本的", amount: 5 },
  { user: "", note: "太酷了哥们", amount: 5 },
  { user: "蓝海", amount: 10 },
  { user: "渡己", amount: 5 },
  { user: "微角秒", note: "希望这个项目越做越好", amount: 50 },
  { user: "安麒文", note: "感谢您的软件，加油", amount: 5 },
  { user: "", note: "SVG", amount: 16 },
  { user: "💥知识学爆💥", note: "你们的软件很好用，给你们点赞", amount: 20 },
  { user: "点正🌛🌛🌛", note: "膜拜一下", amount: 10 },
  { user: "米虫先生", amount: 100 },
  { user: "星尘_", note: "加油，看好你们", amount: 5 },
  { user: "可乐mono", note: "加油，目前用过最好的导图类软件", amount: 5 },
  { user: "62.3%", note: "Up要加油呀，我换新电脑第一个装的就是你的软件", amount: 5 },
  { user: "All the luck", note: "感谢你的存在让世界更美好，我希望也在努力的做到", amount: 30 },
  { user: "胡俊海", amount: 5 },
  { user: "人", amount: 20 },
  { user: "木棉", note: "谢谢up主的软件", amount: 20 },
  { user: "Distance", note: "加油！！！还没用，先捐赠", amount: 5 },
  { user: "xxx", amount: 5 },
  { user: "", amount: 5 },
  { user: "", amount: 10 },
  { user: "chocolate", amount: 20 },
  { user: "Think", amount: 100 },
  { user: "Sullivan", note: "为知识付费", amount: 5 },
  { user: "天涯", note: "为知识付费", amount: 2.33 },
  { user: "", note: "66666666", amount: 6.66 },
  { user: "阿龙", note: "好，请继续努力！", amount: 20 },
  { user: "把验航", amount: 5 },
  { user: "全沾工程师", note: "太棒啦，能力有限，先小小支持一波", amount: 20 },
  { user: "耀轩之", note: "祝你越来越好", amount: 5 },
  { user: "otto pan", note: "求mac缩放优化", amount: 50 },
  { user: "llll", note: "支持", amount: 5 },
  { user: "透明", amount: 8.88 },
  { user: "七侠镇的小智", amount: 20 },
  { user: "", amount: 20 },
  { user: "ifelse", note: "keep dev", amount: 20 },
  { user: "Ray", note: "继续加油[加油]", amount: 18 },
  { user: "耀辰", note: "思维导图太牛了", amount: 5 },
  { user: "云深不知处", note: "帅", amount: 5 },
  { user: "好的名字", note: "pg太好用了，只能说", amount: 5 },
  { user: "", note: "好用", amount: 10 },
  { user: "解京", note: "感谢软件，祝早日多平台通用", amount: 50 },
  { user: "唐扬睡醒了", note: "我会互相嵌套了(开心)", amount: 0.01 },
  { user: "唐扬睡醒了", note: "很好用，请问如何交叉嵌套", amount: 6.66 },
  { user: "Kelton", note: "很棒的软件，感谢开发者！", amount: 5 },
  { user: "", amount: 50 },
  { user: "斑驳窖藏", amount: 5 },
  { user: "灰烬", amount: 20 },
  { user: "赵长江", amount: 50 },
  { user: "cityoasis", note: "感谢你的付出。这是一个很好的软件。希望能尽快做到美观成熟", amount: 5 },
  { user: "A许诺溪", note: "希望能和obsidian完美协同", amount: 20 },
  { user: "L.L.", note: "加油小小心思，不成敬意", amount: 20 },
];

/**
 * 鸣谢界面
 * @returns
 */
export default function CreditsTab() {
  const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

  // 计算从2024年9月1日到现在的月数
  const startDate = new Date(2024, 8, 1);
  const currentDate = new Date();
  const monthsDiff =
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
    (currentDate.getMonth() - startDate.getMonth()) +
    (currentDate.getDate() >= startDate.getDate() ? 0 : -1);
  const actualMonths = Math.max(monthsDiff + 1, 1); // 至少为1个月
  const averageMonthlyAmount = totalAmount / actualMonths;

  return (
    <div className="mx-auto flex w-2/3 flex-col overflow-auto py-4">
      <div className="mb-4 flex gap-4">
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
        <Popover.Confirm
          title="提示"
          description="此列表并不是实时更新的，开发者将在您捐赠后的下一个版本中手动更新此列表，当您选择要捐赠时，请在开头添加备注“pg”，以便开发者能区分您的捐赠的项目是project-graph。"
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
        {donations.map((donation, index) => (
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

      {note && <div className="text-muted-foreground bg-background/50 rounded p-2 text-sm">{note}</div>}
    </div>
  );
}
