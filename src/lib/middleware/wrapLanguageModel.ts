/**
 * Local `wrapLanguageModel`.
 *
 * Upstream is a reduce over the middleware array that returns a model whose
 * `doGenerate` / `doStream` route through `transformParams` and the optional
 * `wrapGenerate` / `wrapStream` hooks. Reproduced here so the middleware
 * factory no longer needs the ai package.
 *
 * Worth recording: `wrapStream` does not currently run in this codebase. Every
 * streaming path is native and bypasses the wrapped model entirely, so only
 * `wrapGenerate` is reachable. That is a pre-existing gap, not one this
 * introduced.
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3Middleware,
  LanguageModelV3StreamResult,
} from "../types/index.js";

const doWrap = (
  model: LanguageModelV3,
  middleware: LanguageModelV3Middleware,
): LanguageModelV3 => {
  const transform = async (
    params: LanguageModelV3CallOptions,
    type: "generate" | "stream",
  ): Promise<LanguageModelV3CallOptions> =>
    middleware.transformParams
      ? await middleware.transformParams({ type, params, model })
      : params;

  return {
    specificationVersion: "v3",
    provider: middleware.overrideProvider?.({ model }) ?? model.provider,
    modelId: middleware.overrideModelId?.({ model }) ?? model.modelId,
    supportedUrls:
      middleware.overrideSupportedUrls?.({ model }) ?? model.supportedUrls,
    async doGenerate(
      params: LanguageModelV3CallOptions,
    ): Promise<LanguageModelV3GenerateResult> {
      const transformed = await transform(params, "generate");
      const doGenerate = () => model.doGenerate(transformed);
      const doStream = () => model.doStream(transformed);
      return middleware.wrapGenerate
        ? await middleware.wrapGenerate({
            doGenerate,
            doStream,
            params: transformed,
            model,
          })
        : await doGenerate();
    },
    async doStream(
      params: LanguageModelV3CallOptions,
    ): Promise<LanguageModelV3StreamResult> {
      const transformed = await transform(params, "stream");
      const doGenerate = () => model.doGenerate(transformed);
      const doStream = () => model.doStream(transformed);
      return middleware.wrapStream
        ? await middleware.wrapStream({
            doGenerate,
            doStream,
            params: transformed,
            model,
          })
        : await doStream();
    },
  };
};

export const wrapLanguageModel = ({
  model,
  middleware,
}: {
  model: LanguageModelV3;
  middleware: LanguageModelV3Middleware | LanguageModelV3Middleware[];
}): LanguageModelV3 =>
  (Array.isArray(middleware) ? [...middleware] : [middleware])
    .reverse()
    .reduce<LanguageModelV3>((wrapped, m) => doWrap(wrapped, m), model);
