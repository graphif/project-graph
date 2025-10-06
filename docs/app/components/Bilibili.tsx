export default function Bilibili({ bvid }: { bvid: string }) {
  return (
    <iframe
      src={`https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&poster=1`}
      className="w-max rounded-xl border-0"
      allowFullScreen={true}
    ></iframe>
  );
}
