import { useEffect, useState } from "react";

export function useHitokoto() {
  const [data, setData] = useState({
    id: 7338,
    uuid: "75a45fd4-4f2f-45eb-80cb-6f0a7bcdfaf2",
    hitokoto: "用代码表达言语的魅力，用代码书写山河的壮丽。",
    type: "f",
    from: "一言开发者中心",
    from_who: "一言",
    creator: "DreamOne",
    creator_uid: 9209,
    reviewer: 4756,
    commit_from: "web",
    created_at: "1621833280",
    length: 22,
  });

  async function fetchHitokoto() {
    try {
      const response = await fetch("https://v1.hitokoto.cn/?encode=json");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch hitokoto:", error);
    }
  }

  useEffect(() => {
    fetchHitokoto();
  }, []);

  return { data };
}
