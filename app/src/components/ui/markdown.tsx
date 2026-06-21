import { cn } from "@/utils/cn";
import { useEffect, useState } from "react";
import production from "react/jsx-runtime";
import rehypeReact from "rehype-react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export default function Markdown({
  source,
  className = "",
  components,
}: {
  source: string;
  className?: string;
  components?: Record<string, React.ComponentType<any>>;
}) {
  const [content, setContent] = useState(<>loading</>);

  useEffect(() => {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkBreaks)
      .use(remarkRehype)
      .use(rehypeReact, { ...production, components });
    processor.process(source).then((data: any) => {
      setContent(data.result);
    });
  }, [source, components]);

  return (
    <div
      className={cn(
        className,
        "prose max-w-none cursor-text text-sm select-text",
        "[--tw-prose-body:var(--card-foreground)] [--tw-prose-bold:var(--card-foreground)] [--tw-prose-bullets:var(--muted-foreground)] [--tw-prose-captions:var(--muted-foreground)] [--tw-prose-code:var(--card-foreground)] [--tw-prose-counters:var(--muted-foreground)] [--tw-prose-headings:var(--card-foreground)] [--tw-prose-hr:var(--border)] [--tw-prose-lead:var(--card-foreground)] [--tw-prose-links:var(--primary)] [--tw-prose-pre-bg:var(--muted)] [--tw-prose-pre-code:var(--card-foreground)] [--tw-prose-quote-borders:var(--border)] [--tw-prose-quotes:var(--muted-foreground)] [--tw-prose-td-borders:var(--border)] [--tw-prose-th-borders:var(--border)]",
      )}
    >
      {content}
    </div>
  );
}
