import type { z } from "zod";
import { formatFastCapResources } from "./fmt.ts";
import { reProgressTimestampSource, zFastCapYueCodec, zProgressTimestampCodec } from "./yue.ts";
import { zFastCapTOMLWrappedCodec } from "./toml.ts";
import { zFastCapConf } from "./types-with-mods.ts";

export class FastCap {
  #f: z.infer<typeof zFastCapConf.shape.f> = [];
  constructor(input?: string | object) {
    if (!input) return;
    if (typeof input === "object") {
      this.#f = zFastCapConf.parse(input).f;
      return;
    }
    if (input.includes("本资源FastCap配置如下")) this.#f = zFastCapYueCodec.decode(input).f;
    else if (input.includes("fastcap")) this.#f = zFastCapTOMLWrappedCodec.decode(input).f;
    else throw new Error("无效的FastCap配置");
  }
  fmt(): this {
    this.#f = formatFastCapResources(this.#f);
    return this;
  }
  toJSON() {
    return { f: this.#f };
  }
  toString(fmt: "toml" | "yue") {
    if (fmt === "toml") return zFastCapTOMLWrappedCodec.encode(this.toJSON());
    else if (fmt === "yue") return zFastCapYueCodec.encode(this.toJSON());
    else throw new Error("无效的格式");
  }
}

export default FastCap;
export const FastCapUtils = { zProgressTimestampCodec, reProgressTimestampSource };
