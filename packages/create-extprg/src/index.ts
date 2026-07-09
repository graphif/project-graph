#!/usr/bin/env node

import { cancel, confirm, intro, isCancel, outro, select, spinner, text } from "@clack/prompts";
import cac from "cac";
import { execSync } from "child_process";
import { render } from "ejs";
import { access, mkdir, readdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getDefaultTemplateDir(): string {
  return resolve(__dirname, "../src/template");
}

function getGitAuthor(): { name: string; email: string } {
  try {
    const name = execSync("git config user.name", { encoding: "utf-8" }).trim();
    const email = execSync("git config user.email", {
      encoding: "utf-8",
    }).trim();
    return { name, email };
  } catch {
    return { name: "", email: "" };
  }
}

function formatAuthor(name: string, email: string): string {
  if (name && email) return `${name} <${email}>`;
  if (name) return name;
  return "";
}

interface UserOptions {
  projectName: string;
  displayName: string;
  description: string;
  author: string;
  packageManager: "pnpm" | "npm" | "yarn" | "bun";
  projectDir: string;
  install: boolean;
}

interface TemplateFile {
  src: string;
  dest: string;
  render: boolean;
}

async function promptUser(defaultAuthor: string) {
  const projectName = await text({
    message: "Extension ID",
    placeholder: "my-ext",
    defaultValue: "my-ext",
    validate(value) {
      if (!value) return "Project name cannot be empty";
      if (!/^[a-z][a-z0-9_-]*$/.test(value))
        return "Project name must start with a lowercase letter and can only contain lowercase letters, digits, - and _";
    },
  });
  if (isCancel(projectName)) {
    cancel("Operation cancelled");
    process.exit(0);
  }

  const displayName = await text({
    message: "Display name",
    placeholder: "My Extension",
    defaultValue: "My Extension",
  });
  if (isCancel(displayName)) {
    cancel("Operation cancelled");
    process.exit(0);
  }

  const description = await text({
    message: "Extension description",
    placeholder: "A Project Graph extension",
    defaultValue: "A Project Graph extension",
  });
  if (isCancel(description)) {
    cancel("Operation cancelled");
    process.exit(0);
  }

  const author = await text({
    message: "Author",
    placeholder: defaultAuthor || "Your Name <you@example.com>",
    initialValue: defaultAuthor,
  });
  if (isCancel(author)) {
    cancel("Operation cancelled");
    process.exit(0);
  }

  const packageManager = await select({
    message: "Package manager",
    options: [
      { value: "pnpm", label: "pnpm", hint: "recommended" },
      { value: "bun", label: "bun" },
      { value: "yarn", label: "yarn" },
      { value: "npm", label: "npm" },
    ],
  });
  if (isCancel(packageManager)) {
    cancel("Operation cancelled");
    process.exit(0);
  }

  return {
    projectName: projectName as string,
    displayName: displayName as string,
    description: description as string,
    author: author as string,
    packageManager: packageManager as "pnpm" | "npm" | "yarn" | "bun",
  };
}

async function main() {
  const cli = cac("create-extprg");

  cli
    .command("[projectDir]", "Create a new Project Graph extension project")
    .option("--yes, -y", "Use default options (non-interactive)")
    .option("--template-dir <dir>", "Custom template directory")
    .action(async (projectDir: string | undefined, options: { yes?: boolean; y?: boolean; templateDir?: string }) => {
      const nonInteractive = !!(options.yes ?? options.y ?? false);
      const templateDir = options.templateDir ?? getDefaultTemplateDir();

      // Get git author info for defaults
      const git = getGitAuthor();
      const defaultAuthor = formatAuthor(git.name, git.email);

      let userOptions: UserOptions;

      if (nonInteractive) {
        userOptions = {
          projectName: "my-ext",
          displayName: "My Extension",
          description: "A Project Graph extension",
          author: defaultAuthor,
          packageManager: "pnpm",
          projectDir: projectDir ?? "my-ext",
          install: false,
        };
      } else {
        intro("create-extprg - Create a Project Graph extension project");

        const answers = await promptUser(defaultAuthor);
        userOptions = {
          ...answers,
          projectDir: projectDir ?? answers.projectName,
          install: false,
        };

        const doInstall = await confirm({
          message: "Install dependencies?",
          initialValue: true,
        });
        if (isCancel(doInstall)) {
          cancel("Operation cancelled");
          process.exit(0);
        }
        userOptions.install = doInstall as boolean;
      }

      const targetDir = resolve(process.cwd(), userOptions.projectDir);

      // Check if target directory exists and is not empty
      try {
        await access(targetDir);
        const entries = await readdir(targetDir);
        if (entries.length > 0) {
          if (nonInteractive) {
            console.error(`Error: target directory "${userOptions.projectDir}" already exists and is not empty`);
            process.exit(1);
          }
          const overwrite = await confirm({
            message: `Target directory "${userOptions.projectDir}" already exists. Continue?`,
            initialValue: false,
          });
          if (isCancel(overwrite) || !overwrite) {
            cancel("Operation cancelled");
            process.exit(0);
          }
        }
      } catch {
        // Directory doesn't exist, ok
      }

      // Create target directory
      await mkdir(targetDir, { recursive: true });

      const s = spinner();
      s.start("Generating project files...");

      const files: TemplateFile[] = [
        { src: "package.json.ejs", dest: "package.json", render: true },
        { src: "tsconfig.json.ejs", dest: "tsconfig.json", render: true },
        {
          src: "tsdown.config.ts.ejs",
          dest: "tsdown.config.ts",
          render: true,
        },
        {
          src: "src/extension.ts.ejs",
          dest: "src/extension.ts",
          render: true,
        },
        { src: "README.md.ejs", dest: "README.md", render: true },
        { src: ".gitignore.ejs", dest: ".gitignore", render: false },
        { src: "icon.svg.ejs", dest: "icon.svg", render: false },
      ];

      const templateData = {
        name: userOptions.projectName,
        displayName: userOptions.displayName,
        description: userOptions.description,
        author: userOptions.author,
        packageManager: userOptions.packageManager,
      };

      for (const file of files) {
        const srcPath = resolve(templateDir, file.src);
        const destPath = resolve(targetDir, file.dest);

        try {
          let content = await readFile(srcPath, "utf-8");
          if (file.render) {
            content = render(content, templateData);
          }
          await mkdir(dirname(destPath), { recursive: true });
          await writeFile(destPath, content, "utf-8");
        } catch (err) {
          s.stop(`Error generating file: ${file.src}`);
          console.error(err);
          process.exit(1);
        }
      }

      s.stop("Project files generated");

      // Install dependencies
      if (userOptions.install) {
        const installSpinner = spinner();
        installSpinner.start(`Installing dependencies with ${userOptions.packageManager}...`);
        try {
          execSync(`${userOptions.packageManager} install`, {
            cwd: targetDir,
            stdio: "pipe",
          });
          installSpinner.stop("Dependencies installed");
        } catch {
          installSpinner.stop("Dependency installation failed");
          console.log("Please run the install command manually:");
          console.log(`  cd ${userOptions.projectDir}`);
          console.log(`  ${userOptions.packageManager} install`);
        }
      }

      outro(`
Project "${userOptions.displayName}" created successfully!

  Enter project directory:
    cd ${userOptions.projectDir}

  Start development:
    ${userOptions.packageManager} run dev

  Build extension:
    ${userOptions.packageManager} run build

  Install extension:
    ${userOptions.packageManager} run install:ext
`);
    });

  cli.help();
  cli.parse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
