import type {
  DecideDialectName,
  DecisionDialect,
} from "../../../types/index.js";
import { systemOneDialect } from "./systemOne.js";

const DIALECTS: Readonly<Record<DecideDialectName, DecisionDialect>> = {
  "system-one": systemOneDialect,
};

export const getDecisionDialect = (name: DecideDialectName): DecisionDialect =>
  DIALECTS[name];
