import { z } from "zod";
import { zFastCapConfPT } from "../types.ts";

export const zBiliCid = z.object({
  ...zFastCapConfPT.shape,
  i: z.literal("bili_cid"),
  id: z.string().regex(/^\d+$/),
});
