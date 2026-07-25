import { z } from "zod";

export const zBgmtvEpid = z
  .string()
  .regex(z.regexes.integer)
  .refine((n) => Number.parseInt(n) > 0);
