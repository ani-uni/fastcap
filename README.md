# fastcap

这是一个快速配置视频与真实剧集进度映射的工具。

“大航海”时代，面临许多平台的番剧资源与它们实际上的进度不一致的问题，为了便于弹幕的进度偏移、标记不同资源之间的细节差异，`fastcap`提供了一套结构化语言规范来描述这一差异。

## 配置语言载体

[了解TOML](https://toml.io/cn/) | [TOML转JSON](https://it-tools.tech/toml-to-json)

我们使用`TOML`作为基础配置语言载体，TOML代码块外侧包裹markdown标准的代码块标识如下，作为去除无关内容的分割符。

以下这个`TOML`示例保存了2个B站视频的配置及其对应关系。

````toml
# 代码块外部可以随意添加内容
```fastcap
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
```
# 只要不在里面加东西就行
````

但同时额外提供了一种中文格式化自然语言的配置载体`fastcap-yue`(曰)，便于人类阅读，并防止被评论区审核误判/TOML依赖的标记字符被错误转化。  
_例如: B站的评论区会将半角中括号变成中文全角中括号_  
同时，`fastcap-yue`支持压缩至一行(不依赖缩进/换行)，其分割依赖其中的标点符号。  
生成器输出的每一个字和标点都是有实际意义并影响解析的。

```fastcap-yue
+ 当然，你可以在这里添加任意你想说的话。
本资源FastCap配置如下：

索引：bili_cid，ID：37322032240；
标记了1个片段，共1个剧集；
片段0：从00:00:00.000到00:22:51.000，对应实际剧集00:00:00.000，归属下方剧集1；
剧集1：bgmtv_epid=1670640。

索引：bili_cid，ID：37157930397；
标记了1个片段，共1个剧集；
片段0：从00:05:54.000到00:27:50.000，对应实际剧集00:00:00.000，归属下方剧集1；
剧集1：bgmtv_epid=1654608。
+ 在配置的前后可以任意添加其它内容
```

`fastcap-toml`与`fastcap-yue`是等价的，且可以互相转换。  
需要**注意**的是，你可以在上述例子所给的配置外添加任意其它内容而不影响解析，但**不允许**在代码块/文本内部添加其它内容，否则会导致解析失败。

## 主体结构

```toml
# f - fastcap: (list)
# 用于声明下方到另一个`[[f]]`或到底为止 作为一个fastcap配置的主体
# 即一个fastcap代码块内可以存放多份配置
[[f]]

# i - index: (str)
# 用于标识该fastcap配置应使用的索引解析方式
# 即 该配置应当被用于描述哪一类视频平台/资源
i = ""

# id: (str)
# 在该i(索引)模式下指向的唯一资源的标识符
id = ""

# p: (list)
# 为一个含多组<clip>的列表
p = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  # ...
  # clip: tuple<int, int, int, int>
  # [video_begin, video_end, offset, temp_ep_id]
  # clip[0:2]的单位均为毫秒(ms)
  # clip[0:1]描述该视频的某一片段
  # clip[2]表示该片段的偏移量: 该clip的video_begin进度在实际剧集进度的位置
  # clip[3]表示该片段对应的临时剧集id
]

# t - temp: (record)
# 这里维护一个临时剧集表，用于将上面的片段解析到实际的剧集
# 这里的id需要来自可靠第三方剧集信息平台
# [t.<temp_ep_id>] 表示临时剧集<temp_ep_id>的剧集信息

[t.1] # epid = 1
# <platform_id_type> = <platform_id>(str)
# 键名(key)一个唯一的剧集信息平台的id类型，值(value)为该剧集在该平台上的id
# 以下所有 平台+id 需保证能仅靠该单一信息就能定位到某一特定剧集上，以确定到该剧集的实际信息(含进度)
# 允许存在多条目保证解析方更有可能成功匹配到该条目
# 但实际上仅需存在至少1条即可
bgmtv_epid = "544109"
tmdb_urlc = "tv/285933/season/1/episode/1"
# 以上内容表示:
# p中temp_ep_id=1的clip对应到番剧《午夜的倾心旋律》的[offset, offset+video_end-video_begin]的进度
```

## 格式转换

安装npm包:

```sh
vp add @ani-uni/fastcap
#[pnpm | bun | npm | yarn] install @ani-uni/fastcap
```

调用方法:

```ts
import FastCap from "@ani-uni/fastcap";

// 创建空的FastCap实例
const fc = new FastCap();

// 解析fastcap-toml
const fc = new FastCap(toml);
// 解析fastcap-yue
const fc = new FastCap(yue);
// 传入fastcap-json
const fc = new FastCap(json);

// 导出
const toml = fc.toString("toml");
const yue = fc.toString("yue");
const json = fc.toJSON();
```
