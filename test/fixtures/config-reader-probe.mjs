// Reader half of the atomic-write race test. Runs as a separate process so it
// genuinely races the writer: writeFileSync blocks the writer's event loop, so
// an in-process reader never gets scheduled during the window it is meant to
// observe.
import { readFileSync } from "node:fs";

const [, , target, untilMs] = process.argv;
const deadline = Number(untilMs);
let total = 0;
let torn = 0;
let unreadable = 0;
while (Date.now() < deadline) {
  total += 1;
  let text;
  try {
    text = readFileSync(target, "utf8");
  } catch {
    // A failed READ is not a torn read, and conflating the two would make this
    // probe report tearing for a cause that is not tearing. It happens on
    // Windows, where a reader can hit EPERM/EBUSY against a file being
    // replaced: the rename never exposes partial content, it just makes the
    // open fail. Counted separately so the assertion can tell "the writer is
    // not atomic" from "this platform blocks readers mid-replace".
    unreadable += 1;
    continue;
  }
  try {
    JSON.parse(text);
  } catch {
    // Read succeeded but the bytes are not valid JSON — that is tearing, and
    // it is the only thing that indicts the writer.
    torn += 1;
  }
}
process.stdout.write(JSON.stringify({ total, torn, unreadable }));
