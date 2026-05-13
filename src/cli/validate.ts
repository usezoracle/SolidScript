import pc from "picocolors";
import { parseContractFiles } from "../parser/parse";
import { validateProgram } from "../validator/rules";
import { formatDiagnostic } from "../validator/diagnostics";
import { collectTsFiles } from "./parse";

export interface ValidateCmdOptions {
  secure?: boolean;
}

export async function validateCommand(input: string, opts: ValidateCmdOptions = {}): Promise<void> {
  const files = collectTsFiles(input);
  if (files.length === 0) {
    console.error(`No .ts files found at ${input}`);
    process.exit(1);
  }
  const { program } = parseContractFiles(files);
  const diagnostics = validateProgram(program, { secure: opts.secure });
  if (diagnostics.length === 0) {
    console.log(pc.green("✓ no diagnostics"));
    return;
  }
  let errors = 0;
  for (const d of diagnostics) {
    const line = formatDiagnostic(d);
    if (d.severity === "error") {
      errors++;
      console.error(pc.red(line));
    } else if (d.severity === "warning") {
      console.warn(pc.yellow(line));
    } else {
      console.log(pc.dim(line));
    }
  }
  console.log("");
  console.log(`${diagnostics.length} diagnostic(s), ${errors} error(s)`);
  if (errors > 0) process.exit(1);
}
