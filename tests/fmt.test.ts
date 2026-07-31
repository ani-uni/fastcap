import { describe, expect, it } from "vite-plus/test";
import { FastCap } from "../src/index.ts";

const clip = (tempId: number): [number, number, number, number] => [0, 1_000, 0, tempId];
const tmdb = (episode: number) => `tv/1/season/1/episode/${episode}`;

describe("FastCap#fmt", () => {
  it("removes empty resources, mutates chainably, and is idempotent", () => {
    const fastCap = new FastCap({
      f: [
        { i: "bili_cid", id: "100", p: [], t: {} },
        {
          i: "bili_cid",
          id: "200",
          p: [clip(1)],
          t: { 1: { bgmtv_epid: "7" } },
        },
      ],
    });

    expect(fastCap.fmt()).toBe(fastCap);
    expect(fastCap.toJSON().f).toHaveLength(1);
    const formatted = structuredClone(fastCap.toJSON());
    expect(fastCap.fmt().toJSON()).toEqual(formatted);
    expect(new FastCap(fastCap.toString("toml")).toJSON()).toEqual(formatted);
  });

  it("fills transitive third-party references and includes unreferenced temp entries", () => {
    const fastCap = new FastCap({
      f: [
        {
          i: "bili_cid",
          id: "100",
          p: [clip(1)],
          t: { 1: { bgmtv_epid: "7" } },
        },
        {
          i: "bili_cid",
          id: "200",
          p: [clip(2)],
          t: { 2: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) } },
        },
        {
          i: "bili_cid",
          id: "300",
          p: [],
          t: { 3: { tmdb_urlc: tmdb(1) } },
        },
      ],
    }).fmt();

    for (const resource of fastCap.toJSON().f) {
      expect(resource.t).toEqual({
        2: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) },
      });
    }
    expect(fastCap.toJSON().f.map((resource) => resource.p[0]?.[3])).toEqual([2, 2, undefined]);
  });

  it("throws on conflicting references without changing the instance", () => {
    const fastCap = new FastCap({
      f: [
        {
          i: "bili_cid",
          id: "100",
          p: [clip(1)],
          t: { 1: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) } },
        },
        {
          i: "bili_cid",
          id: "200",
          p: [clip(2)],
          t: { 2: { bgmtv_epid: "7", tmdb_urlc: tmdb(2) } },
        },
      ],
    });
    const original = structuredClone(fastCap.toJSON());

    expect(() => fastCap.fmt()).toThrow(
      `同一剧集包含冲突的 tmdb_urlc: ${JSON.stringify(tmdb(1))} 与 ${JSON.stringify(tmdb(2))}`,
    );
    expect(fastCap.toJSON()).toEqual(original);
  });

  it("also rejects conflicting Bangumi IDs connected by TMDB", () => {
    const fastCap = new FastCap({
      f: [
        {
          i: "bili_cid",
          id: "100",
          p: [clip(1)],
          t: { 1: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) } },
        },
        {
          i: "bili_cid",
          id: "200",
          p: [clip(2)],
          t: { 2: { bgmtv_epid: "8", tmdb_urlc: tmdb(1) } },
        },
      ],
    });

    expect(() => fastCap.fmt()).toThrow('同一剧集包含冲突的 bgmtv_epid: "7" 与 "8"');
  });

  it("merges duplicate episodes within one resource and updates every clip", () => {
    const fastCap = new FastCap({
      f: [
        {
          i: "bili_cid",
          id: "100",
          p: [clip(1), clip(2)],
          t: {
            1: { bgmtv_epid: "7" },
            2: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) },
          },
        },
      ],
    }).fmt();

    expect(fastCap.toJSON().f[0]).toEqual({
      i: "bili_cid",
      id: "100",
      p: [clip(2), clip(2)],
      t: { 2: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) } },
    });
  });

  it("uses another group ID when the bridge ID is occupied", () => {
    const fastCap = new FastCap({
      f: [
        {
          i: "bili_cid",
          id: "100",
          p: [clip(1)],
          t: { 1: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) } },
        },
        {
          i: "bili_cid",
          id: "200",
          p: [clip(1), clip(2)],
          t: {
            1: { bgmtv_epid: "8" },
            2: { bgmtv_epid: "7" },
          },
        },
      ],
    }).fmt();

    expect(fastCap.toJSON().f[0]?.p[0]?.[3]).toBe(2);
    expect(fastCap.toJSON().f[1]?.p[1]?.[3]).toBe(2);
  });

  it("uses the first item as bridge when reference counts are tied", () => {
    const refs = { bgmtv_epid: "7", tmdb_urlc: tmdb(1) };
    const fastCap = new FastCap({
      f: [
        { i: "bili_cid", id: "100", p: [clip(5)], t: { 5: refs } },
        { i: "bili_cid", id: "200", p: [clip(2)], t: { 2: refs } },
      ],
    }).fmt();

    expect(fastCap.toJSON().f.map((resource) => resource.p[0]?.[3])).toEqual([5, 5]);
  });

  it("reserves fallback IDs for groups with crossed original IDs", () => {
    const fastCap = new FastCap({
      f: [
        {
          i: "bili_cid",
          id: "100",
          p: [clip(1), clip(2)],
          t: {
            1: { bgmtv_epid: "7", tmdb_urlc: tmdb(1) },
            2: { bgmtv_epid: "8", tmdb_urlc: tmdb(2) },
          },
        },
        {
          i: "bili_cid",
          id: "200",
          p: [clip(1), clip(2)],
          t: {
            1: { bgmtv_epid: "8" },
            2: { bgmtv_epid: "7" },
          },
        },
      ],
    }).fmt();

    expect(fastCap.toJSON().f.map((resource) => Object.keys(resource.t))).toEqual([
      ["3", "4"],
      ["3", "4"],
    ]);
    expect(fastCap.toJSON().f[0]?.p.map((part) => part[3])).toEqual([3, 4]);
    expect(fastCap.toJSON().f[1]?.p.map((part) => part[3])).toEqual([4, 3]);
  });

  it("does not merge unrelated episodes that happen to share a temp ID", () => {
    const fastCap = new FastCap({
      f: [
        { i: "bili_cid", id: "100", p: [clip(1)], t: { 1: { bgmtv_epid: "7" } } },
        { i: "bili_cid", id: "200", p: [clip(1)], t: { 1: { bgmtv_epid: "8" } } },
      ],
    }).fmt();

    expect(fastCap.toJSON().f.map((resource) => resource.t)).toEqual([
      { 1: { bgmtv_epid: "7" } },
      { 1: { bgmtv_epid: "8" } },
    ]);
  });
});
