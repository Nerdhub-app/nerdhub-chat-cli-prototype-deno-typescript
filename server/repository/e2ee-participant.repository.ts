import { ulid } from "@std/ulid";
import type {
  E2EEParticipant,
  E2EEParticipantCreationDTO,
} from "../server.d.ts";
import { kv } from "../database/kv.connection.ts";

export async function getByDeviceId(userId: string, deviceId: string) {
  const { value: participantId } = await kv.get<string>([
    "e2eeParticipantIdsByDeviceId",
    userId,
    deviceId,
  ]);
  if (!participantId) return null;

  const entry = await kv.get<E2EEParticipant>([
    "e2eeParticipants",
    userId,
    participantId,
  ]);
  return entry?.value;
}

export async function create(dto: E2EEParticipantCreationDTO) {
  const id = ulid();
  const currentTimestamp = Date.now();
  const participant: E2EEParticipant = {
    ...dto,
    id,
    createdAt: currentTimestamp,
    updatedAt: currentTimestamp,
  };

  await kv.set(["e2eeParticipants", dto.userId, id], participant);
  await kv.set(["e2eeParticipantIdsByDeviceId", dto.userId, dto.deviceId], id);

  return participant;
}
