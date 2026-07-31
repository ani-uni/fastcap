import type { z } from "zod";
import type { zFastCapConf } from "./types-with-mods.ts";

type FastCapResources = z.infer<typeof zFastCapConf.shape.f>;
type EpisodeRefs = FastCapResources[number]["t"][number];
type RefKey = keyof EpisodeRefs;

type EpisodeNode = {
  index: number;
  resourceIndex: number;
  tempId: number;
  refs: EpisodeRefs;
};

type EpisodeGroup = {
  nodes: EpisodeNode[];
  bridge: EpisodeNode;
  refs: EpisodeRefs;
  tempId?: number;
};

const REF_KEYS = ["bgmtv_epid", "tmdb_urlc"] as const satisfies readonly RefKey[];

class DisjointSet {
  readonly #parents: number[];

  constructor(size: number) {
    this.#parents = Array.from({ length: size }, (_, index) => index);
  }

  find(index: number): number {
    const parent = this.#parents[index];
    if (parent === index) return index;
    return (this.#parents[index] = this.find(parent));
  }

  union(left: number, right: number) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.#parents[rightRoot] = leftRoot;
  }
}

function compareNodes(left: EpisodeNode, right: EpisodeNode) {
  return left.resourceIndex - right.resourceIndex || left.tempId - right.tempId;
}

function refCount(node: EpisodeNode) {
  return REF_KEYS.filter((key) => node.refs[key] !== undefined).length;
}

function buildNodes(resources: FastCapResources) {
  const nodes: EpisodeNode[] = [];
  const nodesByResource = new Map<number, Map<number, EpisodeNode>>();

  resources.forEach((resource, resourceIndex) => {
    const resourceNodes = new Map<number, EpisodeNode>();
    nodesByResource.set(resourceIndex, resourceNodes);
    for (const [tempIdSource, refs] of Object.entries(resource.t).sort(
      ([left], [right]) => Number(left) - Number(right),
    )) {
      const tempId = Number(tempIdSource);
      const node = { index: nodes.length, resourceIndex, tempId, refs };
      nodes.push(node);
      resourceNodes.set(tempId, node);
    }
  });

  return { nodes, nodesByResource };
}

function buildGroups(nodes: EpisodeNode[]) {
  const groups = new Map<number, EpisodeNode[]>();
  const identifiers = new Map<string, number>();
  const disjointSet = new DisjointSet(nodes.length);

  for (const node of nodes) {
    for (const key of REF_KEYS) {
      const value = node.refs[key];
      if (value === undefined) continue;
      const identifier = `${key}:${value}`;
      const match = identifiers.get(identifier);
      if (match === undefined) identifiers.set(identifier, node.index);
      else disjointSet.union(match, node.index);
    }
  }

  for (const node of nodes) {
    const root = disjointSet.find(node.index);
    const group = groups.get(root) ?? [];
    group.push(node);
    groups.set(root, group);
  }

  return [...groups.values()]
    .map((groupNodes): EpisodeGroup => {
      groupNodes.sort(compareNodes);
      const bridge = groupNodes.reduce((current, node) =>
        refCount(node) > refCount(current) ? node : current,
      );
      const refs: EpisodeRefs = {};

      for (const key of REF_KEYS) {
        const values = [
          ...new Set(
            groupNodes.flatMap((node) => {
              const value = node.refs[key];
              return value === undefined ? [] : [value];
            }),
          ),
        ];
        if (values.length > 1) {
          throw new Error(
            `同一剧集包含冲突的 ${key}: ${values.map((value) => JSON.stringify(value)).join(" 与 ")}`,
          );
        }
        if (values[0] !== undefined) {
          if (key === "bgmtv_epid") refs.bgmtv_epid = values[0];
          else refs.tmdb_urlc = values[0] as EpisodeRefs["tmdb_urlc"];
        }
      }

      return { nodes: groupNodes, bridge, refs };
    })
    .sort((left, right) => compareNodes(left.bridge, right.bridge));
}

function assignTempIds(
  groups: EpisodeGroup[],
  nodesByResource: Map<number, Map<number, EpisodeNode>>,
) {
  const groupByNode = new Map<number, EpisodeGroup>();
  const reservedByResource = new Map<number, Map<number, EpisodeGroup>>();
  for (const group of groups) {
    for (const node of group.nodes) groupByNode.set(node.index, group);
  }

  for (const group of groups) {
    const resourceIndexes = new Set(group.nodes.map((node) => node.resourceIndex));
    const candidateIds = [group.bridge.tempId, ...group.nodes.map((node) => node.tempId)].filter(
      (tempId, index, ids) => tempId > 0 && ids.indexOf(tempId) === index,
    );

    const isAvailable = (tempId: number) =>
      [...resourceIndexes].every((resourceIndex) => {
        const occupant = nodesByResource.get(resourceIndex)?.get(tempId);
        const occupantGroup = occupant && groupByNode.get(occupant.index);
        const reservedGroup = reservedByResource.get(resourceIndex)?.get(tempId);
        return (
          (!occupantGroup || occupantGroup === group) && (!reservedGroup || reservedGroup === group)
        );
      });

    let tempId = candidateIds.find(isAvailable);
    if (tempId === undefined) {
      tempId = 1;
      while (!isAvailable(tempId)) tempId += 1;
    }
    group.tempId = tempId;

    for (const resourceIndex of resourceIndexes) {
      const reservations = reservedByResource.get(resourceIndex) ?? new Map<number, EpisodeGroup>();
      reservations.set(tempId, group);
      reservedByResource.set(resourceIndex, reservations);
    }
  }

  return groupByNode;
}

export function formatFastCapResources(input: FastCapResources): FastCapResources {
  const resources = input
    .filter((resource) => resource.p.length > 0 || Object.keys(resource.t).length > 0)
    .map((resource) => ({
      ...resource,
      p: resource.p.map((part) => [...part]),
      t: Object.fromEntries(
        Object.entries(resource.t).map(([tempId, refs]) => [tempId, { ...refs }]),
      ),
    })) as FastCapResources;
  const { nodes, nodesByResource } = buildNodes(resources);
  const groups = buildGroups(nodes);
  const groupByNode = assignTempIds(groups, nodesByResource);

  resources.forEach((resource, resourceIndex) => {
    const formattedTemp: typeof resource.t = {};
    const resourceNodes = nodesByResource.get(resourceIndex);

    for (const node of resourceNodes?.values() ?? []) {
      const group = groupByNode.get(node.index);
      if (!group?.tempId) throw new Error("无法为剧集分配有效的临时剧集ID");
      formattedTemp[group.tempId] = { ...group.refs };
    }

    resource.t = formattedTemp;
    resource.p = resource.p.map((part) => {
      const node = resourceNodes?.get(part[3]);
      const group = node && groupByNode.get(node.index);
      if (!group?.tempId) throw new Error(`找不到临时剧集ID ${part[3]} 对应的剧集`);
      return [part[0], part[1], part[2], group.tempId];
    });
  });

  return resources;
}
