import { z } from "zod";
import { zMods } from "./mods/index.ts";

export const zFastCapConf = z.object({
  f: zMods
    .refine(
      (fc) => {
        const tempEpIds = new Set(Object.keys(fc.t).map(Number.parseInt));
        return fc.p.every((c) => tempEpIds.has(c[3]));
      },
      { error: "所有片段的临时剧集ID必须在临时剧集表中存在" },
    )
    .array(),
});
