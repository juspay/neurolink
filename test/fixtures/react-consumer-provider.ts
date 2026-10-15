/**
 * Compile-only: what a React consumer can do with `NeuroLinkProvider`.
 *
 * Not a suite and never run. `pnpm run check:tools-tests` type-checks it (CI's
 * `types` shard, after the build) against the built `./client` entry in `dist/`
 * and the repo's own `@types/react` (a devDependency).
 *
 * Where each type is read from: `ClientReactElement`, `ClientReactProviderDescriptor`
 * and `NeuroLinkProviderProps` come from `dist/types/client.d.ts`. TypeScript resolves the entry's
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
 * `ClientReactElement.type` is `string | ClientReactProviderDescriptor`, not a
 * bare `string`: the provider's element carries the context provider's
 * descriptor there at runtime, so a string method called on it must not compile.
 * The descriptor has a `never`-returning call signature and a `$$typeof` tag.
 * `(props: never) => never` is not assignable from React's `any` props, which
 * breaks the JSX direction, and `src` may not name `any`.
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
  JSX,
  JSXElementConstructor,
  ReactElement,
  ReactNode,
} from "react";
import type { NeuroLinkProvider } from "../../dist/client/index.js";
import type { ClientReactProviderDescriptor } from "../../dist/types/index.js";

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

// What JSX yields (`JSX.Element`) is accepted where a `ClientReactElement` is expected,
// which is the direction the build checks inside `reactHooks.tsx`.
declare const fromJsx: JSX.Element;
export const jsxIsAnElement: ProviderReturn = fromJsx;

// `type` is the host tag or the named descriptor, and exactly that.
type ProviderElementType = ProviderReturn["type"];
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const typeIsTagOrDescriptor: Mutual<
  ProviderElementType,
  string | ClientReactProviderDescriptor
> = true;
export const descriptorIsNotAny: IsAny<ClientReactProviderDescriptor> extends false
  ? true
  : never = true;

declare const descriptor: ClientReactProviderDescriptor;
export const descriptorIsAComponentType: JSXElementConstructor<ProviderProps> =
  descriptor;

// Narrowing is the supported way to read `type`.
export const tagName: string | undefined =
  typeof rendered.type === "string" ? rendered.type.toUpperCase() : undefined;
export const descriptorTag: symbol | undefined =
  typeof rendered.type === "string" ? undefined : rendered.type.$$typeof;

// @ts-expect-error control: a string method on `type` is rejected until it is narrowed
export const controlStringMethod = rendered.type.toUpperCase();

// @ts-expect-error control: the descriptor's tag is not on the string half of the union
export const controlDescriptorTag = rendered.type.$$typeof;

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
