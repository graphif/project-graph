type Origin = { x: number; y: number };
let active: { add: (origin: Origin) => void; done: Promise<void> } | undefined;

export function runThemeTransition(origin: Origin, update: () => void): Promise<void> {
  if (active) {
    active.add(origin);
    return active.done;
  }
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return Promise.resolve();
  }

  const root = document.documentElement;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "fixed";
  const mask = document.createElementNS(ns, "mask");
  mask.id = "pg-theme-ripple-mask";
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", "0");
  mask.setAttribute("y", "0");
  mask.setAttribute("width", String(innerWidth));
  mask.setAttribute("height", String(innerHeight));
  mask.style.maskType = "luminance";
  svg.append(mask);
  document.body.append(svg);
  root.dataset.themeTransition = "ripple";
  let count = 0;
  let pending = 0;
  let ready = false;
  const starts: (() => void)[] = [];
  const animations = new Set<Animation>();
  const transition = document.startViewTransition(update);
  const add = ({ x, y }: Origin) => {
    count++;
    pending++;
    const circle = document.createElementNS(ns, "circle");
    const cx = Math.max(0, Math.min(innerWidth, x));
    const cy = Math.max(0, Math.min(innerHeight, y));
    const radius = Math.ceil(Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy))) + 2;
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", "0");
    circle.setAttribute("fill", count % 2 ? "white" : "black");
    mask.append(circle);
    const start = () => {
      const animation = circle.animate(
        { r: ["0px", `${radius}px`] },
        {
          duration: 480,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "forwards",
        },
      );
      animations.add(animation);
      animation.onfinish = () => {
        circle.setAttribute("r", String(radius));
        circle.dataset.finished = "true";
        // 满屏的波纹已覆盖旧层，不再保留之前完成的遮罩。
        let previous = circle.previousElementSibling;
        while (previous && (previous as SVGElement).dataset.finished === "true") {
          const older = previous.previousElementSibling;
          previous.remove();
          previous = older;
        }
        animation.cancel();
        animations.delete(animation);
        pending--;
        if (pending === 0) {
          // 偶数次点击回到原主题；动画期间复用同一对主题快照。
          if (count % 2 === 0) update();
          transition.skipTransition();
        }
      };
    };
    if (ready) start();
    else starts.push(start);
  };
  add(origin);
  const prepare = transition.ready
    .then(() => {
      ready = true;
      starts.forEach((start) => start());
    })
    .catch(async () => {
      transition.skipTransition();
      await transition.updateCallbackDone;
      if (count % 2 === 0) update();
    });
  const done = Promise.all([prepare, transition.finished])
    .then(() => undefined)
    .finally(() => {
      for (const animation of animations) animation.cancel();
      svg.remove();
      delete root.dataset.themeTransition;
      active = undefined;
    });
  active = { add, done };
  return done;
}
