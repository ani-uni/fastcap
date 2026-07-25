import { z } from "zod";
import { zBgmtvEpid } from "./info/bgmtv_epid.ts";
import { zTmdbUrlc } from "./info/tmdb_urlc.ts";

export const zPart = z.tuple([z.int(), z.int(), z.int(), z.int()]);

export const zTemp = z
  .object({
    bgmtv_epid: zBgmtvEpid.optional(),
    tmdb_urlc: zTmdbUrlc.optional(),
  })
  .refine((temp) => Object.keys(temp).length > 0, {
    error: "一个临时剧集至少需要提供一个第三方剧集信息平台ID",
  });

export const zFastCapConfPT = z.object({
  p: zPart.array(),
  t: z.record(z.coerce.number().int(), zTemp),
});
