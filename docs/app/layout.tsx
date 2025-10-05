import { RootProvider } from "fumadocs-ui/provider";
import "katex/dist/katex.css";
import { ReactNode } from "react";
import "./global.css";

const locales = [
  {
    name: "English",
    locale: "en",
  },
  {
    name: "简体中文",
    locale: "zh-CN",
  },
];

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const lang = (await params).lang;

  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans-vf@1.0.0/lib/MiSans.min.css" />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider
          search={{
            enabled: false,
          }}
          i18n={{
            locale: lang,
            locales,
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
