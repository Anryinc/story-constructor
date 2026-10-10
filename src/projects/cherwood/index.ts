import { defaultPack } from "@/lib/campaign/rails";
import { DEFAULT_PLAY_RULES, type ProjectDefinition } from "../types";
import { cherwoodGraph } from "./graph";
import { cherwoodManifest } from "./manifest";

export const cherwoodProject: ProjectDefinition = {
  manifest: { ...cherwoodManifest, version: "0.3.0-p2" },
  rules: DEFAULT_PLAY_RULES,
  graph: cherwoodGraph,
  campaign: defaultPack(),
};

export { cherwoodManifest, cherwoodGraph };
