export function readPath(value: unknown, path: string): unknown {
  const segments = path.split(".");
  if (segments.some((segment) => segment === "")) {
    return undefined;
  }
  let current: unknown = value;
  for (const segment of segments) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current)
    ) {
      return undefined;
    }
    // Own data properties only: no prototype names, and no getter is run.
    const descriptor = Object.getOwnPropertyDescriptor(current, segment);
    if (descriptor === undefined || !("value" in descriptor)) {
      return undefined;
    }
    current = descriptor.value;
  }
  return current;
}
