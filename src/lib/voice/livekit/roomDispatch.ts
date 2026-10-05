/**
 * LiveKit server-side room operations: create a room with metadata, delete a
 * room, and dispatch a named agent to a room.
 *
 * Wraps `livekit-server-sdk` (an optional dependency, imported dynamically) so
 * consumers route all LiveKit *server* calls through `@juspay/neurolink/livekit`
 * — they never depend on the SDK directly. Mirrors `mintJoinToken`.
 */

import type {
  LiveKitDeleteRoomRequest,
  LiveKitServerCredentials,
} from "../../types/index.js";

const toHttpUrl = (url: string): string => url.replace(/^ws/, "http");

export async function createVoiceRoom(
  req: LiveKitServerCredentials & {
    room: string;
    metadata?: string;
    emptyTimeoutSeconds?: number;
    departureTimeoutSeconds?: number;
  },
): Promise<void> {
  const { RoomServiceClient } = await import("livekit-server-sdk");
  const client = new RoomServiceClient(
    toHttpUrl(req.url),
    req.apiKey,
    req.apiSecret,
  );
  await client.createRoom({
    name: req.room,
    metadata: req.metadata ?? "",
    emptyTimeout: req.emptyTimeoutSeconds ?? 300,
    departureTimeout: req.departureTimeoutSeconds ?? 20,
  });
}

/**
 * Delete a room by name, disconnecting anyone still in it. The room is an input,
 * so the host decides when cleanup is warranted (a start request that aborted
 * after `createVoiceRoom`, a dispatch that failed). It rejects when the server
 * refuses or the room does not exist, so the caller records the real outcome.
 */
export async function deleteVoiceRoom(
  req: LiveKitDeleteRoomRequest,
): Promise<void> {
  const { RoomServiceClient } = await import("livekit-server-sdk");
  const client = new RoomServiceClient(
    toHttpUrl(req.url),
    req.apiKey,
    req.apiSecret,
  );
  await client.deleteRoom(req.room);
}

/**
 * Explicitly dispatch a named agent to a room. The long-lived worker registered
 * under `agentName` receives the job and forks a child to run the call.
 */
export async function dispatchVoiceAgent(
  req: LiveKitServerCredentials & {
    room: string;
    agentName: string;
    metadata?: string;
  },
): Promise<void> {
  const { AgentDispatchClient } = await import("livekit-server-sdk");
  const client = new AgentDispatchClient(
    toHttpUrl(req.url),
    req.apiKey,
    req.apiSecret,
  );
  await client.createDispatch(req.room, req.agentName, {
    metadata: req.metadata ?? "",
  });
}
