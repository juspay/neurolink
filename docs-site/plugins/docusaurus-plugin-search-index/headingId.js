/**
 * Reads the explicit id off a Markdown heading, the way Docusaurus does.
 *
 * A heading may end in `{#custom-id}`; Docusaurus then anchors it at that id
 * instead of slugging its text. This is Docusaurus's own pattern
 * (`parseMarkdownHeadingId` in @docusaurus/utils): the id is any run of
 * characters that contains neither `{#` nor `}`, and the heading must end at the
 * closing brace. So `{#api.v2}` and non-ASCII ids count, not only letters,
 * digits, `_` and `-`, and a heading with anything after the brace has no id.
 *
 * Kept free of dependencies so a test can load it without the docs site's
 * packages.
 *
 * @param {string} heading the heading text without its leading `#` marks
 * @returns {{ text: string, id: string | undefined }}
 */
const EXPLICIT_HEADING_ID = /\s*\{#(?<id>(?:.(?!\{#|\}))*.)\}$/;

function parseHeadingId(heading) {
  const match = EXPLICIT_HEADING_ID.exec(heading);
  if (!match) {
    return { text: heading, id: undefined };
  }
  return { text: heading.replace(match[0], ""), id: match.groups.id };
}

module.exports = { parseHeadingId, EXPLICIT_HEADING_ID };
