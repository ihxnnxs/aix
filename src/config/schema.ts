import { z } from "zod"

export const MCPServerEntrySchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
}).passthrough()

export const MCPServersMapSchema = z.record(MCPServerEntrySchema)

export const StandardConfigSchema = z.object({
  mcpServers: MCPServersMapSchema.optional(),
}).passthrough()

export const VSCodeConfigSchema = z.object({
  servers: MCPServersMapSchema.optional(),
}).passthrough()
