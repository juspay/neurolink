/**
 * Compile-only: what a React consumer can do with `NeuroLinkProvider`.
 *
 * Not a suite and never run. `pnpm run check:tools-tests` type-checks it (CI's
 * `types` shard, after the build) against the built `./client` entry in `dist/`
 * and the repo's own `@types/react` (a devDependency).
 *
 * Where each type is read from: `ClientReactElement` and `NeuroLinkProviderProps`
 * come from `dist/types/client.d.ts`. TypeScript resolves the entry's
 * `./reactHooks.js` to the `dist/client/reactHooks.tsx` that the build leaves
 * beside the `.d.ts` (it is not packed), so the function's signature is read from
 * that file, not from `reactHooks.d.ts`. Both are emitted from the same source.
 *
 * Why it exists: the declaration cannot name a React type (`react` is an
 * optional peer, so a consumer without it fails TS2307), so `NeuroLinkProvider`
 * returns the structural `ClientReactElement` instead. The build only checks one
 * direction: the JSX in `reactHooks.tsx` is assignable TO `ClientReactElement`.
 * A consumer needs the other direction: a `ClientReactElement` is a `ReactElement`
 * and a `ReactNode`, and the function is a valid JSX component. Dropping `key`
 * from `ClientReactElement` keeps the build and the packed-declaration scan
 * green and breaks `<NeuroLinkProvider>` for every consumer with TS2786. The
 * assignments below are what notice.
 *
 * The `@ts-expect-error` lines are the negative controls: each wrong shape must
 * be rejected, so the assignments next to them are known to be able to fail. If
 * @types/react ever stopped constraining these types, the directive would turn
 * into an "unused" error rather than a silent pass.
 *
 * Imports are type-only and name the shipped `./client` entry, not `src/lib/`.
 */
import type {
  FunctionComponent,
  JSXElementConstructor,
  ReactElement,
  ReactNode,
} from "react";
import type { NeuroLinkProvider } from "../../dist/client/index.js";

type Provider = typeof NeuroLinkProvider;
type ProviderProps = Parameters<Provider>[0];
type ProviderReturn = ReturnType<Provider>;

type IsAny<T> = 0 extends 1 & T ? true : false;

declare const provider: Provider;
declare const rendered: ProviderReturn;
declare const props: ProviderProps;

// A resolved-but-`any` declaration would satisfy every assignment below.
export const returnIsNotAny: IsAny<ProviderReturn> extends false
  ? true
  : never = true;
export const propsAreNotAny: IsAny<ProviderProps> extends false ? true : never =
  true;

export const asReactElement: ReactElement = rendered;
export const asReactNode: ReactNode = rendered;
export const asChildOfAnElement: ReactNode[] = [rendered, "text", null];

// The check TypeScript runs on `<NeuroLinkProvider ... />` (TS2786 when it fails).
export const asJsxComponent: JSXElementConstructor<ProviderProps> = provider;
export const asFunctionComponent: FunctionComponent<ProviderProps> = provider;

// The props a caller writes still type-check, and `children` takes any child.
export const textChild: ProviderProps = { config: props.config, children: "x" };
export const elementChild: ProviderProps = {
  config: props.config,
  children: rendered,
};
export const noChild: ProviderProps = { config: props.config, children: null };

declare const withoutKey: { type: string; props: unknown };
// @ts-expect-error control: an element shape without `key` is not a ReactElement
export const controlWithoutKey: ReactElement = withoutKey;

declare const notRenderable: (p: ProviderProps) => { notAnElement: true };
// @ts-expect-error control: a function returning a plain object is not a JSX component
export const controlNotAComponent: JSXElementConstructor<ProviderProps> =
  notRenderable;

declare const wrongType: { type: number; props: unknown; key: string | null };
// @ts-expect-error control: an element whose `type` is a number is not a ReactElement
export const controlWrongType: ReactElement = wrongType;
