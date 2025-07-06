import AppException from "../helpers/app-exception.helper.ts";
import {
  HttpReponseStatus,
  type MiddlewareNextFn,
  type MiddlewareRequest,
} from "../router.ts";
import type { RequestE2EEParticipantContext } from "@scope/server/types";

export default function e2eeParticipantIdParamMatchesAuthE2EEParticipant(
  req: MiddlewareRequest,
  next: MiddlewareNextFn,
) {
  const params = req.params as { e2eeParticipantId: string };
  const context = req.context as RequestE2EEParticipantContext;

  if (params.e2eeParticipantId !== context.e2eeParticipant.id) {
    next(
      new AppException({
        status: HttpReponseStatus.FORBIDDEN,
        message:
          "The request parameter `e2eeParticipantId` does not matches the `e2eeParticipantId` claim from your access token",
      }),
    );
    return;
  }

  next();
}
