import { z } from "zod";

export const NetworkConfigSchema = z.object({
  rpcUrl: z.string().url(),
  chainId: z.number().int().positive(),
  privateKeyEnv: z.string().optional(),
});

export const CompilerConfigSchema = z.object({
  version: z.string().default("0.8.20"),
  optimizer: z
    .object({
      enabled: z.boolean().default(true),
      runs: z.number().int().positive().default(200),
    })
    .default({ enabled: true, runs: 200 }),
});

export const ConfigSchema = z.object({
  compiler: CompilerConfigSchema.default({
    version: "0.8.20",
    optimizer: { enabled: true, runs: 200 },
  }),
  networks: z.record(z.string(), NetworkConfigSchema).default({}),
  outDir: z.string().default("out"),
  plugins: z.array(z.string()).default([]),
});

export type Config = z.infer<typeof ConfigSchema>;
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;
