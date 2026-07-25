import { expect, test } from "vite-plus/test";
import { FastCap } from "../src/index.ts";

const toml = `
\`\`\`fastcap
[[f]]
i = "bili_cid"
id = "37322032240"
p = [ [ 0, 1371_000, 0, 1 ] ]
[f.t.1]
bgmtv_epid = "1670640"

[[f]]
i = "bili_cid"
id = "37157930397"
p = [ [ 354_000, 1670_000, 0, 1 ] ]
[f.t.1]
bgmtv_epid = "1654608"
\`\`\``;

const yue = `本资源FastCap配置如下：

索引：bili_cid，ID：37322032240；
标记了1个片段，共1个剧集；
片段0：从00:00:00.000到00:22:51.000，对应实际剧集00:00:00.000，归属下方剧集1；
剧集1：bgmtv_epid=1670640。

索引：bili_cid，ID：37157930397；
标记了1个片段，共1个剧集；
片段0：从00:05:54.000到00:27:50.000，对应实际剧集00:00:00.000，归属下方剧集1；
剧集1：bgmtv_epid=1654608。`;

const yue2 = `本资源FastCap配置如下：索引：bili_cid，ID：37322032240；标记了1个片段，共1个剧集；片段0：从00:00:00.000到00:22:51.000，对应实际剧集00:00:00.000，归属下方剧集1；剧集1：bgmtv_epid=1670640。索引：bili_cid，ID：37157930397；标记了1个片段，共1个剧集；片段0：从00:05:54.000到00:27:50.000，对应实际剧集00:00:00.000，归属下方剧集1；剧集1：bgmtv_epid=1654608。`;

test("fn", () => {
  expect(new FastCap(toml).toJSON()).toEqual(new FastCap(yue).toJSON());
  expect(new FastCap(yue).toJSON()).toEqual(new FastCap(yue2).toJSON());
  // console.info(new FastCap(toml).toString("yue"));
});
