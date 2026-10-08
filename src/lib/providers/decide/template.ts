const PLACEHOLDER = /\{([^{}]*)\}/g;

export function fillEndpointTemplate(
  template: string,
  parts: { baseURL: string },
): string {
  if (/[{}]/.test(template.replace(PLACEHOLDER, ""))) {
    throw new Error(
      `Decide endpoint template "${template}" has an unmatched brace; write placeholders as {baseURL}.`,
    );
  }
  // A function replacer, so "$&" or "$1" inside a base URL is inserted as text.
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    if (name !== "baseURL") {
      throw new Error(
        `Decide endpoint template "${template}" uses an unknown placeholder {${name}}; the only one supported is {baseURL}.`,
      );
    }
    return parts.baseURL;
  });
}
