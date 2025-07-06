import { cliContext } from "../context.ts";
import E2EEParticipantOnetimePreKeyRepository, {
  type CreateOnetimePreKeyDTO,
} from "../repository/e2ee-participant-onetime-prekeys.repository.ts";
import { PreKeyBundleFactory, XEdDSA } from "@scope/primitives/x3dh";
import LocalEncryptionService from "./local-encryption.service.ts";

export const ONETIME_PREKEYS_UPLOAD_BATCH_SIZE = 100;

export const ONETIME_PREKEYS_STOCK_COUNT_THRESHOLD = 10;

const xEdDSA = new XEdDSA();
const prekeyBundleFactory = new PreKeyBundleFactory(xEdDSA);

const localEnryptionService = new LocalEncryptionService();

export default class OnetimePreKeyService {
  replenishOnetimePreKeysIfBelowThreshold() {
    if (!cliContext.isAuthenticated) {
      throw new Error(
        "The user must be authenticated before replenishing the one-time prekeys",
      );
    }
    const onetimePreKeysCount = E2EEParticipantOnetimePreKeyRepository
      .countForUserId(
        cliContext.user.id,
      );
    if (onetimePreKeysCount > ONETIME_PREKEYS_STOCK_COUNT_THRESHOLD) return;
    const onetimePreKeys = prekeyBundleFactory.createManyOneTimePreKeys(
      ONETIME_PREKEYS_UPLOAD_BATCH_SIZE,
    );
    const onetimePreKeysDTO = onetimePreKeys.map<CreateOnetimePreKeyDTO>(
      (opk) => {
        if (!cliContext.isAuthenticated || !cliContext.e2eeParticipant) {
          throw new Error(
            "The user must be authenticated and the e2ee participant must be set before replenishing the one-time prekeys",
          );
        }
        return {
          id: opk.id,
          userId: cliContext.user?.id,
          participantId: cliContext.e2eeParticipant.id,
          privKey: localEnryptionService.encrypt(opk.keyPair[0]), // only the private key is encrypted
          pubKey: opk.keyPair[1],
        };
      },
    );
    E2EEParticipantOnetimePreKeyRepository.createMany(onetimePreKeysDTO);
  }
}
