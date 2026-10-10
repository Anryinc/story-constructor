import type { CampaignPack } from "@/lib/campaign/rails";
import type { LocationDef, NpcDef, RosterCharacter } from "@/lib/campaign/types";
import type { GraphDocument } from "@/lib/graph/types";

export type ProjectStatus = "draft" | "playable";

export type ProjectManifest = {
  id: string;
  title: string;
  subtitle?: string;
  blurb: string;
  description: string;
  coverImage: string;
  tags: string[];
  playersMin: number;
  playersMax: number;
  estimatedMinutes?: number;
  status: ProjectStatus;
  version: string;
};

export type PlayRules = {
  actionPointsPerRound: 1;
  allowWait: true;
  shareCostsAction: true;
  abilityCostsAction: true;
  shareClueScope: "same_location";
  shareDisplayOnHub: true;
  resolutionOrder: "simultaneous_moves_first";
  timerSeconds: null;
  visibilityDefault: "private";
};

export const DEFAULT_PLAY_RULES: PlayRules = {
  actionPointsPerRound: 1,
  allowWait: true,
  shareCostsAction: true,
  abilityCostsAction: true,
  shareClueScope: "same_location",
  shareDisplayOnHub: true,
  resolutionOrder: "simultaneous_moves_first",
  timerSeconds: null,
  visibilityDefault: "private",
};

export type ProjectDefinition = {
  manifest: ProjectManifest;
  rules: PlayRules;
  /** Spatial + dialogue graph (P2+) */
  graph: GraphDocument;
  /** Legacy rails pack — optional until fully migrated */
  campaign?: CampaignPack;
  roster?: RosterCharacter[];
  locations?: LocationDef[];
  npcs?: NpcDef[];
};

export type ProjectSummary = ProjectManifest;
