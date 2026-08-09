import { runProjectGraphCli } from "./ProjectGraphCli";

const args = process.argv.slice(2);
process.exitCode = runProjectGraphCli(args[0] === "--" ? args.slice(1) : args);
