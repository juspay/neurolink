import { cfg, nlBase } from "./config";
import {
  checkBackend,
  checkGateway,
  checkIndic,
  whistleStart,
} from "./engines";
import { setMode, setRoute } from "./live";
import { checkNeurolink } from "./neurolink";
import { getState, setConn, setState, useServer } from "./store";
import { loadVoices } from "./tts";

let booted = false;
export function boot() {
  if (booted) return;
  booted = true;
  setConn(
    "scribe",
    cfg.elevenlabsKey ? "ok" : "bad",
    cfg.elevenlabsKey ? "key set" : "no key",
  );
  setRoute(getState().route);
  setMode(getState().mode);
  void loadVoices();
  void checkIndic();
  void checkGateway();
  void checkBackend().then((ok) => {
    setState({ backendOk: ok });
    void checkNeurolink();
    if (getState().engine === "whistle" && !useServer()) whistleStart();
  });
  // While the speech service is unreachable, keep checking so the page recovers on its own.
  if (nlBase)
    window.setInterval(() => {
      if (!getState().nlOk) void checkNeurolink();
    }, 15000);
}
