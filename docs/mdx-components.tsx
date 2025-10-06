import { DynamicLink } from "fumadocs-core/dynamic-link";
import { createGenerator } from "fumadocs-typescript";
import { AutoTypeTable } from "fumadocs-typescript/ui";
import * as TabsComponents from "fumadocs-ui/components/tabs";
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import Bilibili from "./app/components/Bilibili";

const generator = createGenerator();

export function getMDXComponents(extraComponents?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    a: DynamicLink,
    AutoTypeTable: (props) => <AutoTypeTable {...props} generator={generator} />,
    ...TabsComponents,
    ...extraComponents,
    Bilibili,
  };
}
