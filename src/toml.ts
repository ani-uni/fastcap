import { z } from "zod";
import TOML from "smol-toml";
import { zFastCapConf } from "./types-with-mods.ts";

const zFastCapTOMLCodec = z.codec(z.string(), zFastCapConf, {
  decode: (toml) => zFastCapConf.parse(TOML.parse(toml)),
  encode: (fc) => TOML.stringify(fc).trim(),
});
export const zFastCapTOMLWrappedCodec = z.codec(z.string(), zFastCapConf, {
  decode: (w, ctx) => {
    try {
      const inner = w.match(/```fastcap([\s\S]*?)```/i)?.[1]?.trim();
      return zFastCapTOMLCodec.decode(inner ?? w);
    } catch (e: any) {
      ctx.issues.push({
        code: "invalid_format",
        format: "fastcap-toml",
        input: w,
        message: e.message,
      });
      return z.NEVER;
    }
  },
  encode: (fc) => {
    const inner = zFastCapTOMLCodec.encode(fc);
    return `\`\`\`fastcap\n${inner}\n\`\`\``;
  },
});
