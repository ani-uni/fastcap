// 曰
import { Temporal } from "@js-temporal/polyfill";

import { z } from "zod";
import { zFastCapConfPT, zPart } from "./types.ts";
import { zFastCapConf } from "./types-with-mods.ts";

const RELATIVE_TO = Temporal.PlainDate.from("1970-01-01");

const zProgressTimestampCodec = z.codec(z.string(), z.int().nonnegative(), {
  decode: (pt) => {
    const [h, m, sec = "0"] = pt.split(":");
    const duration = Temporal.Duration.from(`PT${h}H${m}M${sec}S`);
    return duration.total({
      unit: "milliseconds",
      relativeTo: RELATIVE_TO,
    });
  },
  encode: (ms) => {
    const duration = Temporal.Duration.from({
      milliseconds: ms,
    }).round({
      largestUnit: "hours",
      smallestUnit: "milliseconds",
      relativeTo: RELATIVE_TO,
    });
    return (
      [
        String(duration.hours).padStart(2, "0"),
        String(duration.minutes).padStart(2, "0"),
        String(duration.seconds).padStart(2, "0"),
      ].join(":") +
      "." +
      String(duration.milliseconds).padStart(3, "0")
    );
  },
});

const reProgressTimestampSource = String.raw`\d+:\d{2}:\d{2}(?:\.\d{1,3})?`;
const rePart = new RegExp(
  String.raw`^片段\d+：` +
    String.raw`从(?<begin>${reProgressTimestampSource})` +
    String.raw`到(?<end>${reProgressTimestampSource})` +
    String.raw`，对应实际剧集(?<real>${reProgressTimestampSource})` +
    String.raw`，归属下方剧集(?<temp>\d+)$`,
);

const zFastCapUnitYueCodec = z.codec(z.string(), zFastCapConf.shape.f.element, {
  decode: (yue) => {
    const semiChunks = yue.split("；").map((s) => s.trim());
    const ci = semiChunks[0].split("，").map((s) => s.trim());
    const cp: z.infer<typeof zPart>[] = [],
      ct: z.infer<typeof zFastCapConfPT.shape.t> = {};
    for (const chunk of semiChunks.slice(1)) {
      if (chunk.startsWith("片段")) {
        const p = chunk.match(rePart)?.groups;
        if (p) {
          cp.push([
            zProgressTimestampCodec.decode(p.begin),
            zProgressTimestampCodec.decode(p.end),
            zProgressTimestampCodec.decode(p.real),
            Number.parseInt(p.temp, 10),
          ]);
        }
      } else if (chunk.startsWith("剧集")) {
        const t = chunk.match(/剧集(\d+)：(.+)/)?.slice(1);
        if (t) {
          const temp_ep_id = Number.parseInt(t[0]);
          const temp_3rd_ref: Record<string, string> = {};
          for (const pt of t[1].split("，")) {
            const [pt_key, pt_val] = pt.split("=").map((s) => s.trim());
            temp_3rd_ref[pt_key] = pt_val;
          }
          ct[temp_ep_id] = temp_3rd_ref;
        }
      }
    }
    return zFastCapConf.shape.f.element.parse({
      i: ci[0].replace(/^索引：/, ""),
      id: ci[1].replace(/^ID：/, ""),
      p: cp,
      t: ct,
    });
  },
  encode: (fc) => `索引：${fc.i}，ID：${fc.id}；
标记了${fc.p.length}个片段，共${Object.keys(fc.t).length}个剧集；
${fc.p.map((c, i) => `片段${i}：从${zProgressTimestampCodec.encode(c[0])}到${zProgressTimestampCodec.encode(c[1])}，对应实际剧集${zProgressTimestampCodec.encode(c[2])}，归属下方剧集${c[3]}；`).join("\n")}
${Object.entries(fc.t)
  .map(
    ([temp_ep_id, temp_3rd_ref]) =>
      `剧集${temp_ep_id}：${Object.entries(temp_3rd_ref)
        .map(([pt, ptid]) => `${pt}=${ptid}`)
        .join("，")}`,
  )
  .join("；\n")}`,
});

export const zFastCapYueCodec = z.codec(z.string(), zFastCapConf, {
  decode: (yue, ctx) => {
    try {
      const inner = yue.match(/本资源FastCap配置如下：([\s\S]*?)。$/)?.[1]?.trim();
      if (!inner) {
        ctx.issues.push({
          code: "invalid_format",
          format: "fastcap-yue",
          input: yue,
          message: "找不到有效的【FastCap 曰】配置内容",
        });
        return z.NEVER;
      }
      return {
        f: inner.split("。").map((s) => zFastCapUnitYueCodec.decode(s.trim())),
      };
    } catch (e: any) {
      ctx.issues.push({
        code: "invalid_format",
        format: "fastcap-yue",
        input: yue,
        message: e.message,
      });
      return z.NEVER;
    }
  },
  encode: (fc) =>
    `本资源FastCap配置如下：

${fc.f.map((f) => zFastCapUnitYueCodec.encode(f)).join("。\n\n")}。`,
});
