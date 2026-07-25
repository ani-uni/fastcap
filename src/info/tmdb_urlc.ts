import { z } from "zod";

const TMDBUrlCRawSchema = {
  movie: z.templateLiteral([z.literal("movie/"), z.string()]),
  tv: {
    episode: z.templateLiteral([
      z.literal("tv/"),
      z.int32(),
      z.literal("/season/"),
      z.int32(),
      z.literal("/episode/"),
      z.int32(),
    ]),
    season: z.templateLiteral([z.literal("tv/"), z.int32(), z.literal("/season/"), z.int32()]),
    series: z.templateLiteral([z.literal("tv/"), z.int32()]),
  },
};

export const zTmdbUrlc = z.union([TMDBUrlCRawSchema.movie, TMDBUrlCRawSchema.tv.episode]);
