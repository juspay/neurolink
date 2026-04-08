import type { FrameBus } from "./frameBus.js";

export enum TurnState {
  IDLE,
  USER_SPEAKING,
  PROCESSING,
  ASSISTANT_SPEAKING,
}

export class TurnManager {
  state = TurnState.IDLE;

  constructor(bus: FrameBus) {
    bus.subscribe("vad_start", () => this.onVadStart());
    bus.subscribe("vad_stop", () => this.onVadStop());
  }

  private onVadStart() {
    // Only update state if TTS is NOT playing. During ASSISTANT_SPEAKING, the
    // barge-in interrupt is triggered by Soniox non-final tokens — which arrive
    // after a network round-trip. If we let VAD immediately flip state to
    // USER_SPEAKING, the state check in handleSonioxMessage fails and the
    // interrupt never fires.
    if (this.state !== TurnState.ASSISTANT_SPEAKING) {
      this.state = TurnState.USER_SPEAKING;
    }
  }

  private onVadStop() {
    if (this.state === TurnState.USER_SPEAKING) {
      this.state = TurnState.PROCESSING;
    }
  }

  assistantSpeaking() {
    this.state = TurnState.ASSISTANT_SPEAKING;
  }

  reset() {
    this.state = TurnState.IDLE;
  }
}
