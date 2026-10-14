import type {
  DecideDialectName,
  DecisionDialect,
} from "../../../types/index.js";
import { openaiDecisionsDialect } from "./openaiDecisions.js";
import { systemOneDialect } from "./systemOne.js";

const DIALECTS: Readonly<Record<DecideDialectName, DecisionDialect>> = {
  "system-one": systemOneDialect,
  "openai-decisions": openaiDecisionsDialect,
};

export const getDecisionDialect = (name: DecideDialectName): DecisionDialect =>
  DIALECTS[name];
