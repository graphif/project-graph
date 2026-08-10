import { runProjectGraphCli } from "./ProjectGraphCli";

const args = process.argv.slice(2);
const abortController = new AbortController();
const handleSignal = (signal: NodeJS.Signals) => abortController.abort(signal);
const handleSigint = () => handleSignal("SIGINT");
const handleSigterm = () => handleSignal("SIGTERM");
process.on("SIGINT", handleSigint);
process.on("SIGTERM", handleSigterm);
try {
  process.exitCode = await runProjectGraphCli(args[0] === "--" ? args.slice(1) : args, {
    abortSignal: abortController.signal,
  });
} finally {
  process.off("SIGINT", handleSigint);
  process.off("SIGTERM", handleSigterm);
}
