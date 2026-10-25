// |x|⁴ + |y|⁴ = 1; the normalized quarter is shared by all canvas corners.
const quarter = Array.from({ length: 33 }, (_, i) => {
  if (i === 0) return [1, 0] as const;
  if (i === 32) return [0, 1] as const;
  const angle = (i / 32) * (Math.PI / 2);
  return [Math.cos(angle) ** (2 / 4), Math.sin(angle) ** (2 / 4)] as const;
});

type PathTarget = Pick<CanvasRenderingContext2D, "moveTo" | "lineTo" | "closePath" | "rect">;

export function superellipseRect(ctx: PathTarget, x: number, y: number, width: number, height: number, radius: number) {
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    ctx.rect(x, y, width, height);
    return;
  }
  ctx.moveTo(x + width, y + height - r);
  for (let corner = 0; corner < 4; corner++) {
    const cx = corner === 0 || corner === 3 ? x + width - r : x + r;
    const cy = corner < 2 ? y + height - r : y + r;
    for (const [u, v] of quarter) {
      const dx = corner === 0 ? u : corner === 1 ? -v : corner === 2 ? -u : v;
      const dy = corner === 0 ? v : corner === 1 ? u : corner === 2 ? -v : -u;
      ctx.lineTo(cx + r * dx, cy + r * dy);
    }
  }
  ctx.closePath();
}

export function superellipseSvgPath(x: number, y: number, width: number, height: number, radius: number) {
  const commands: string[] = [];
  superellipseRect(
    {
      moveTo: (px, py) => {
        commands.push(`M${px} ${py}`);
      },
      lineTo: (px, py) => {
        commands.push(`L${px} ${py}`);
      },
      closePath: () => {
        commands.push("Z");
      },
      rect: (px, py, w, h) => {
        commands.push(`M${px} ${py}h${w}v${h}h${-w}Z`);
      },
    },
    x,
    y,
    width,
    height,
    radius,
  );
  return commands.join(" ");
}
