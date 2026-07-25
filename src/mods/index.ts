import { z } from "zod";
import { zBiliCid } from "./bili_cid.ts";

export const zMods = z.discriminatedUnion("i", [zBiliCid]);
