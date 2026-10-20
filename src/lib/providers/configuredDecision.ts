import type { AIProviderName } from "../constants/enums.js";
import type {
  DecideCatalogJson,
  DecisionDialect,
  DecisionError,
  DecisionPreparedMedia,
  DecisionRequest,
  DecisionState,
  UnknownRecord,
} from "../types/index.js";
import { decisionQuestionTypeOf } from "../utils/decisionLimits.js";
import { logger } from "../utils/logger.js";
import { redactUrlForError } from "../utils/logSanitize.js";
import { getProviderModel } from "../utils/providerConfig.js";
import { catalogCredentialsKey, catalogEnvVar } from "./catalog/loader.js";
import { baseURLShapeProblem, normalizeBaseURL } from "./decide/baseUrl.js";
import { getDecisionDialect } from "./decide/dialects/index.js";
import { classifyDecisionError } from "./decide/errors.js";
import { isRecord } from "./decide/guards.js";
import { readPath } from "./decide/paths.js";
import { fillEndpointTemplate } from "./decide/template.js";
import { SystemOneDecisionProvider } from "./systemOneDecision.js";

const readText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

// JSON.stringify answers undefined for a value JSON cannot hold, such as a
// state a JavaScript caller left out, although its own return type says string.
const stateText = (state: DecisionState): string | undefined =>
  typeof state === "string" ? state : JSON.stringify(state);

/** A `decide` provider described entirely by its catalog entry. */
export class ConfiguredDecisionProvider extends SystemOneDecisionProvider {
  private readonly entry: DecideCatalogJson;
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly endpoint: string;

  constructor(
    entry: DecideCatalogJson,
    modelName?: string,
    sdk?: unknown,
    credentials?: UnknownRecord,
  ) {
    // BaseProvider's constructor calls getDefaultModel() for a falsy name,
    // before this.entry is assigned, so the name is settled here.
    super(
      modelName ||
        getProviderModel(catalogEnvVar(entry, "model"), entry.models.default),
      entry.id as AIProviderName,
      sdk,
    );
    this.entry = entry;
    this.apiKey =
      readText(credentials?.apiKey) ||
      readText(process.env[catalogEnvVar(entry, "apiKey")]);
    // `||`, not `??`, so a blank value counts as unset.
    this.baseURL = normalizeBaseURL(
      readText(credentials?.baseURL) ||
        readText(process.env[catalogEnvVar(entry, "baseURL")]) ||
        readText(entry.wire.baseURL),
      entry.decide.baseURLNormalize ?? [],
    );
    this.endpoint = fillEndpointTemplate(entry.decide.endpoint, {
      baseURL: this.baseURL,
    });
    // A self-hosted base URL can carry `user:pass@` or a `?token=`.
    logger.debug(`${entry.displayName} Provider initialized (decide only)`, {
      modelName: this.modelName,
      baseURL: this.baseURL ? redactUrlForError(this.baseURL) : "(not set)",
    });
  }

  protected getDefaultModel(): string {
    return getProviderModel(
      catalogEnvVar(this.entry, "model"),
      this.entry.models.default,
    );
  }

  protected vendorLabel(): string {
    return this.entry.displayName;
  }

  protected vendorDisplayName(): string {
    return this.entry.displayName;
  }

  protected decisionApiKey(): string {
    return this.apiKey;
  }

  protected missingKeyMessage(): string {
    return `${this.entry.displayName} requires an API key. Set ${catalogEnvVar(this.entry, "apiKey")} or pass credentials.${catalogCredentialsKey(this.entry)}.apiKey.`;
  }

  protected override missingConfigMessage(): string | undefined {
    const { baseURLRequired, baseURLShape } = this.entry.decide;
    if (!this.baseURL) {
      return baseURLRequired
        ? `${this.entry.displayName} requires a base URL. Set ${catalogEnvVar(this.entry, "baseURL")} or pass credentials.${catalogCredentialsKey(this.entry)}.baseURL.`
        : undefined;
    }
    return baseURLShape
      ? baseURLShapeProblem(
          baseURLShape,
          this.baseURL,
          this.entry.displayName,
          `Set ${catalogEnvVar(this.entry, "baseURL")} or pass credentials.${catalogCredentialsKey(this.entry)}.baseURL to the origin, and give the key through ${catalogEnvVar(this.entry, "apiKey")} or credentials.${catalogCredentialsKey(this.entry)}.apiKey.`,
        )
      : undefined;
  }

  protected decisionEndpoint(): string {
    return this.endpoint;
  }

  /**
   * `decide.capableModel` in place of the default, for a request that carries
   * media or one of its question types, when nobody chose a model: the call
   * names none, the model variable is unset, and the instance is on the
   * default. A model somebody chose is always the one sent.
   */
  protected override resolveRequestModel(request: DecisionRequest): string {
    const chosen = super.resolveRequestModel(request);
    const capable = this.entry.decide.capableModel;
    if (
      capable === undefined ||
      request.model !== undefined ||
      chosen !== this.entry.models.default ||
      readText(process.env[catalogEnvVar(this.entry, "model")]) !== ""
    ) {
      return chosen;
    }
    const carriesMedia =
      (request.images?.length ?? 0) > 0 ||
      request.video !== undefined ||
      request.audio !== undefined;
    const asksFor = Object.values(request.questions).some((question) =>
      capable.questionTypes.includes(decisionQuestionTypeOf(question)),
    );
    return carriesMedia || asksFor ? capable.model : chosen;
  }

  protected decisionHeaders(): Record<string, string> {
    const credential: Record<string, string> =
      this.entry.decide.authHeader === "x-api-key"
        ? { "x-api-key": this.apiKey }
        : { Authorization: `Bearer ${this.apiKey}` };
    return { ...credential, "Content-Type": "application/json" };
  }

  /**
   * The state the dialect is given. Only an entry that sets `stateEncoding`
   * changes it, so every other entry sends exactly what the caller passed.
   */
  private encodeState(state: DecisionState): DecisionState {
    if (this.entry.decide.stateEncoding !== "text") {
      return state;
    }
    const text = stateText(state);
    if (text === undefined || text.trim() === "") {
      throw this.decisionError({
        kind: "invalid_request",
        // Never the state itself, which can hold anything the caller was sent.
        message: `${this.vendorLabel()} needs non-blank state text; the state was empty or only whitespace.`,
        retryable: false,
      });
    }
    return text;
  }

  protected buildDecisionBody(
    state: DecisionState,
    questions: Record<string, Record<string, unknown>>,
    model: string,
    media?: DecisionPreparedMedia,
  ): Record<string, unknown> {
    const { placement, alias } = this.entry.decide.model;
    return this.dialect().buildBody({
      state: this.encodeState(state),
      questions,
      model:
        placement === "body-unless-alias" && model === alias
          ? undefined
          : model,
      media,
      mediaKeys: this.entry.decide.media,
    });
  }

  protected parseDecisionError(
    status: number,
    payload: unknown,
    requestId: string | undefined,
  ): DecisionError {
    return classifyDecisionError(this.entry.decide.errors, {
      status,
      payload,
      requestId,
      label: this.entry.displayName,
      apiKey: this.apiKey,
      apiKeyEnvVar: catalogEnvVar(this.entry, "apiKey"),
    });
  }

  protected readRequestId(headers: Headers): string | undefined {
    for (const name of this.entry.decide.requestIdHeaders ?? []) {
      const value = headers.get(name);
      if (value !== null) {
        return value;
      }
    }
    return undefined;
  }

  protected override resolveResponseModel(
    payload: Record<string, unknown>,
    requestedModel: string,
  ): string {
    // Defensive: the base class passes a record today. A direct call with
    // null or undefined must not throw here, where the base lookup would.
    if (!isRecord(payload)) {
      return requestedModel;
    }
    for (const path of this.entry.decide.response?.modelPaths ?? []) {
      const value = readPath(payload, path);
      if (typeof value === "string") {
        return value;
      }
    }
    return super.resolveResponseModel(payload, requestedModel);
  }

  protected override dialect(): DecisionDialect {
    return getDecisionDialect(this.entry.decide.dialect);
  }
}
