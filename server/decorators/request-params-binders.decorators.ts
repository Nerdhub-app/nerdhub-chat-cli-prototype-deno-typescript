import { bindRequestParameter } from "@scope/core/router";
import NotFoundException from "../exceptions/not-found.exception.ts";
import { injectUserRepository } from "../repository/user.repository.ts";
import { injectE2EEParticipantRepository } from "../repository/e2ee-participant.repository.ts";

/**
 * Wrapper decorator for {@link bindRequestParameter} that binds user id to request parameter
 *
 * @param paramName - name of the user id request parameter
 */
export function bindUserIdRequestParameter<
  TParamName extends string = "userId",
>(paramName: TParamName = "userId" as TParamName) {
  const userRepository = injectUserRepository();
  return bindRequestParameter(paramName, async (userId) => {
    const user = await userRepository.findById(Number(userId));
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return ["userId" as const, user];
  });
}

/**
 * Wrapper decorator for {@link bindRequestParameter} that binds e2ee participant to request parameter
 *
 * @param paramName - name of the e2ee participant id request parameter
 */
export function bindE2eeParticipantIdRequestParameter<
  TParamName extends string = "e2eeParticipantId",
>(paramName: TParamName = "e2eeParticipantId" as TParamName) {
  const e2eeParticipantRepository = injectE2EEParticipantRepository();
  return bindRequestParameter(paramName, async (e2eeParticipantId) => {
    const e2eeParticipant = await e2eeParticipantRepository.findById(
      Number(e2eeParticipantId),
    );
    if (!e2eeParticipant) {
      throw new NotFoundException("E2EE participant not found");
    }
    return ["e2eeParticipant" as const, e2eeParticipant];
  });
}
