import crypto, { type KeyObject } from "node:crypto";
import { Buffer } from "node:buffer";
import { Select } from "@cliffy/prompt";
import { colors } from "@cliffy/ansi/colors";
import { PreKeyBundleFactory, XEdDSA } from "@scope/primitives";
import { cliContext, type CLIContextPreKeyBundle } from "../../context.ts";
import E2EEParticipantOnetimePreKeyRepository, {
  type CreateOnetimePreKeyDTO,
} from "../../repository/e2ee-participant-onetime-prekeys.repository.ts";
import E2EEParticipantPrekeyBundleRepository from "../../repository/e2ee-participant-prekey-bundles.repository.ts";
import E2EEParticipantAPI from "../../api/e2ee-participant.api.ts";
import {
  ONETIME_PREKEYS_STOCK_COUNT_THRESHOLD,
  ONETIME_PREKEYS_UPLOAD_BATCH_SIZE,
} from "../../constants/prekey-bundle.constants.ts";
import LocalEncryptionService from "../../services/local-encryption.service.ts";
import E2EEParticipantOnetimePreKeyAPI from "../../api/e2ee-participant-onetime-prekey.api.ts";
import AuthAPI from "../../api/auth.api.ts";
import { navigate, type RouteRenderer } from "../../router/index.ts";
import type { E2EEParticipantPrekeyBundle } from "../../cli.d.ts";
import type { CreateManyOnetimePreKeysRequestPayload } from "@scope/server/payload";

const localEncryptionService = new LocalEncryptionService();

const xEdDSA = new XEdDSA();
const prekeyBundleFactory = new PreKeyBundleFactory(xEdDSA);

export type PreKeyBundleSetupRouteParams = {
  from: `Chats${string}` | "Auth";
};

export default function setupPreKeyBundle(
  uiRenderer: RouteRenderer<Record<string, unknown>>,
): RouteRenderer<Record<string, unknown>> {
  return async (params?: Record<string, unknown>) => {
    if (!(cliContext.isAuthenticated && cliContext.localEncryptionKey)) {
      navigate({ name: "Index" });
      return;
    }

    if (cliContext.prekeyBundle) {
      // Rendering the target UI
      uiRenderer(params);
      return;
    }

    let cliContextPreKeyBundle!: CLIContextPreKeyBundle;

    if (cliContext.e2eeParticipant) {
      console.log("Getting the prekey bundle from local store ...");
      let prekeyBundle = E2EEParticipantPrekeyBundleRepository.findByUserId(
        cliContext.user.id,
      );
      if (!prekeyBundle) {
        console.log("Generating the local prekey bundle ...");
        const generatedPreKeyBundle = prekeyBundleFactory.createPreKeyBundle();
        E2EEParticipantPrekeyBundleRepository.createByUserId(
          cliContext.user.id,
          {
            privIdentityKey: localEncryptionService.encrypt(
              generatedPreKeyBundle.identityKey[0],
            ),
            pubIdentityKey: generatedPreKeyBundle.identityKey[1],
            privSignedPreKey: localEncryptionService.encrypt(
              generatedPreKeyBundle.signedPreKey[0],
            ),
            pubSignedPreKey: generatedPreKeyBundle.signedPreKey[1],
            signedPreKeySignature: generatedPreKeyBundle.signedPreKeySignature,
          },
        );
        prekeyBundle = E2EEParticipantPrekeyBundleRepository.findByUserId(
          cliContext.user.id,
        ) as E2EEParticipantPrekeyBundle;
        console.log("Publishing the e2ee participant's prekey bundle ...");
        const updatedE2EEParticipantRes = await E2EEParticipantAPI
          .updatePreKeyBundle(
            cliContext.user.id,
            cliContext.e2eeParticipant.id,
            {
              pubIdentityKey: generatedPreKeyBundle.identityKey[1].toString(
                "base64",
              ),
              pubSignedPreKey: generatedPreKeyBundle.signedPreKey[1].toString(
                "base64",
              ),
              signedPreKeySignature: generatedPreKeyBundle.signedPreKeySignature
                .toString("base64"),
            },
          );
        cliContext.e2eeParticipant = updatedE2EEParticipantRes.bodyJSON;
        E2EEParticipantPrekeyBundleRepository.publishByUserId(
          cliContext.user.id,
          {
            participantId: cliContext.e2eeParticipant.id,
          },
        );
        // CLI context prekey bundle
        cliContextPreKeyBundle = {
          identityKey: generatedPreKeyBundle.identityKey,
          signedPreKey: generatedPreKeyBundle.signedPreKey,
          signedPreKeySignature: generatedPreKeyBundle.signedPreKeySignature,
        };
      } else {
        console.log("Decrypting the local prekey bundle's private keys ...");
        let privIdentityKey!: Buffer, privSignedPreKey!: Buffer;
        privIdentityKey = localEncryptionService.decrypt(
          prekeyBundle.priv_identity_key,
        );
        privSignedPreKey = localEncryptionService.decrypt(
          prekeyBundle.priv_signed_prekey,
        );
        let prekeyBundleDecryptionSuccess = true;
        try {
          verifyX25519KeyPair(
            privIdentityKey,
            prekeyBundle.pub_identity_key,
          );
          verifyX25519KeyPair(
            privSignedPreKey,
            prekeyBundle.pub_signed_prekey,
          );
        } catch (_) {
          prekeyBundleDecryptionSuccess = false;
        }
        if (!prekeyBundleDecryptionSuccess) {
          console.log();
          console.log(
            colors.red(
              `Decryption of the local prekey bundle failed.`,
            ),
          );
          const resetPreKeyBundleInput = await Select.prompt<"Reset" | "Exit">({
            message: "Do you want to reset your prekey bundle or exit?",
            options: [
              { name: "Reset the prekey bundle", value: "Reset" },
              { name: "Exit, then go back to main menu", value: "Exit" },
            ],
          }) as "Reset" | "Exit";
          if (resetPreKeyBundleInput === "Exit") {
            navigate({ name: "Index" });
            return;
          }
          console.log();
          console.log("Generating a new local prekey bundle ...");
          const generatedPreKeyBundle = prekeyBundleFactory
            .createPreKeyBundle();
          E2EEParticipantPrekeyBundleRepository.resetByUserId(
            cliContext.user.id,
            {
              privIdentityKey: localEncryptionService.encrypt(
                generatedPreKeyBundle.identityKey[0],
              ),
              pubIdentityKey: generatedPreKeyBundle.identityKey[1],
              privSignedPreKey: localEncryptionService.encrypt(
                generatedPreKeyBundle.signedPreKey[0],
              ),
              pubSignedPreKey: generatedPreKeyBundle.signedPreKey[1],
              signedPreKeySignature:
                generatedPreKeyBundle.signedPreKeySignature,
            },
          );
          prekeyBundle = E2EEParticipantPrekeyBundleRepository.findByUserId(
            cliContext.user.id,
          ) as E2EEParticipantPrekeyBundle;
          privIdentityKey = generatedPreKeyBundle.identityKey[0];
          privSignedPreKey = generatedPreKeyBundle.signedPreKey[0];
          console.log("Publishing the e2ee participant's prekey bundle ...");
          const updatedE2EEParticipantRes = await E2EEParticipantAPI
            .updatePreKeyBundle(
              cliContext.user.id,
              cliContext.e2eeParticipant.id,
              {
                pubIdentityKey: generatedPreKeyBundle.identityKey[1].toString(
                  "base64",
                ),
                pubSignedPreKey: generatedPreKeyBundle.signedPreKey[1].toString(
                  "base64",
                ),
                signedPreKeySignature: generatedPreKeyBundle
                  .signedPreKeySignature
                  .toString("base64"),
              },
            );
          cliContext.e2eeParticipant = updatedE2EEParticipantRes.bodyJSON;
          E2EEParticipantPrekeyBundleRepository.publishByUserId(
            cliContext.user.id,
            {
              participantId: cliContext.e2eeParticipant.id,
            },
          );
        }
        // CLI context prekey bundle
        cliContextPreKeyBundle = {
          identityKey: [privIdentityKey, prekeyBundle.pub_identity_key],
          signedPreKey: [privSignedPreKey, prekeyBundle.pub_signed_prekey],
          signedPreKeySignature: prekeyBundle.signed_prekey_signature,
        };
      }
      const serverPreKeyBundleMatches = prekeyBundle.pub_identity_key
        .equals(
          Buffer.from(cliContext.e2eeParticipant.pub_identity_key, "base64"),
        );
      if (!prekeyBundle.is_published || !serverPreKeyBundleMatches) {
        console.log("Publishing the e2ee participant's prekey bundle ...");
        const updatedE2EEParticipantRes = await E2EEParticipantAPI
          .updatePreKeyBundle(
            cliContext.user.id,
            cliContext.e2eeParticipant.id,
            {
              pubIdentityKey: prekeyBundle.pub_identity_key.toString(
                "base64",
              ),
              pubSignedPreKey: prekeyBundle.pub_signed_prekey.toString(
                "base64",
              ),
              signedPreKeySignature: prekeyBundle
                .signed_prekey_signature
                .toString("base64"),
            },
          );
        cliContext.e2eeParticipant = updatedE2EEParticipantRes.bodyJSON;
        E2EEParticipantPrekeyBundleRepository.publishByUserId(
          cliContext.user.id,
          {
            participantId: cliContext.e2eeParticipant.id,
          },
        );
      }
      const latestOPK = E2EEParticipantOnetimePreKeyRepository
        .findLatestByUserId(cliContext.user.id);
      if (latestOPK) {
        console.log("Decrypting the latest one-time prekey ...");
        const opkPrivKey = localEncryptionService.decrypt(latestOPK.priv_key);
        let opkDecryptionSucceeds = true;
        try {
          verifyX25519KeyPair(
            opkPrivKey,
            latestOPK.pub_key,
          );
        } catch (_) {
          opkDecryptionSucceeds = false;
        }
        if (!opkDecryptionSucceeds) {
          console.log(
            colors.red("Failed to decrypt the latest one-time prekey."),
          );
          console.log("Clearing the local one-time prekeys ...");
          E2EEParticipantOnetimePreKeyRepository.deleteByUserId(
            cliContext.user.id,
          );
          console.log("Generating the local one-time prekeys ...");
          const onetimePreKeys = prekeyBundleFactory.createManyOneTimePreKeys(
            ONETIME_PREKEYS_UPLOAD_BATCH_SIZE,
          );
          const onetimePreKeysDTO = onetimePreKeys.map<
            CreateOnetimePreKeyDTO
          >(
            (opk) => {
              if (
                !cliContext.isAuthenticated || !cliContext.e2eeParticipant
              ) {
                throw new Error(
                  "The user must be authenticated and the e2ee participant must be set before replenishing the one-time prekeys",
                );
              }
              return {
                id: opk.id,
                userId: cliContext.user?.id,
                participantId: cliContext.e2eeParticipant.id,
                privKey: localEncryptionService.encrypt(opk.keyPair[0]), // only the private key is encrypted
                pubKey: opk.keyPair[1],
              };
            },
          );
          E2EEParticipantOnetimePreKeyRepository.createMany(
            onetimePreKeysDTO,
          );
          console.log(
            "Publishing the local one-time prekeys to the server ...",
          );
          const serverOnetimePreKeysPayload = onetimePreKeys.map<
            CreateManyOnetimePreKeysRequestPayload[0]
          >((opk) => ({
            id: opk.id,
            pubKey: opk.keyPair[1].toString("base64"),
          }));
          await E2EEParticipantOnetimePreKeyAPI.createMany(
            cliContext.user.id,
            cliContext.e2eeParticipant.id,
            serverOnetimePreKeysPayload,
            { flush: true },
          );
          E2EEParticipantOnetimePreKeyRepository.publishByUserId(
            cliContext.user.id,
            { participantId: cliContext.e2eeParticipant.id },
          );
        } else if (!latestOPK.is_published) {
          console.log("Getting the local non-published one-time prekeys ...");
          const nonPublishedOPKs = E2EEParticipantOnetimePreKeyRepository
            .findManyNonPublishedByUserId(cliContext.user.id);
          console.log(
            "Publishing the local non-published one-time prekeys to the server ...",
          );
          const serverOnetimePreKeysPayload = nonPublishedOPKs.map<
            CreateManyOnetimePreKeysRequestPayload[0]
          >((opk) => ({
            id: opk.id,
            pubKey: opk.pub_key.toString("base64"),
          }));
          await E2EEParticipantOnetimePreKeyAPI.createMany(
            cliContext.user.id,
            cliContext.e2eeParticipant.id,
            serverOnetimePreKeysPayload,
            { flush: true },
          );
          E2EEParticipantOnetimePreKeyRepository.publishByUserId(
            cliContext.user.id,
            { participantId: cliContext.e2eeParticipant.id },
          );
        }
      }
      const onetimePreKeysCount = E2EEParticipantOnetimePreKeyRepository
        .countByUserId(cliContext.user.id);
      if (onetimePreKeysCount <= ONETIME_PREKEYS_STOCK_COUNT_THRESHOLD) {
        console.log("Replenishing the local one-time prekeys ...");
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
              userId: cliContext.user.id,
              participantId: cliContext.e2eeParticipant.id,
              privKey: localEncryptionService.encrypt(opk.keyPair[0]), // only the private key is encrypted
              pubKey: opk.keyPair[1],
            };
          },
        );
        E2EEParticipantOnetimePreKeyRepository.createMany(onetimePreKeysDTO);
        console.log(
          "Publishing the local one-time prekeys to the server ...",
        );
        const serverOnetimePreKeysPayload = onetimePreKeys.map<
          CreateManyOnetimePreKeysRequestPayload[0]
        >((opk) => ({
          id: opk.id,
          pubKey: opk.keyPair[1].toString("base64"),
        }));
        await E2EEParticipantOnetimePreKeyAPI.createMany(
          cliContext.user.id,
          cliContext.e2eeParticipant.id,
          serverOnetimePreKeysPayload,
        );
        E2EEParticipantOnetimePreKeyRepository.publishByUserId(
          cliContext.user.id,
          { participantId: cliContext.e2eeParticipant.id },
        );
      }
    } else {
      console.log("Clearing the local prekey bundle ...");
      E2EEParticipantPrekeyBundleRepository.deleteByUserId(cliContext.user.id);
      console.log("Generating the local prekey bundle ...");
      const generatedPreKeyBundle = prekeyBundleFactory.createPreKeyBundle();
      E2EEParticipantPrekeyBundleRepository.createByUserId(cliContext.user.id, {
        privIdentityKey: localEncryptionService.encrypt(
          generatedPreKeyBundle.identityKey[0],
        ),
        pubIdentityKey: generatedPreKeyBundle.identityKey[1],
        privSignedPreKey: localEncryptionService.encrypt(
          generatedPreKeyBundle.signedPreKey[0],
        ),
        pubSignedPreKey: generatedPreKeyBundle.signedPreKey[1],
        signedPreKeySignature: generatedPreKeyBundle.signedPreKeySignature,
      });
      console.log("Creating the e2ee participant ...");
      const res = await E2EEParticipantAPI.create(cliContext.user.id, {
        pubIdentityKey: generatedPreKeyBundle.identityKey[1].toString("base64"),
        pubSignedPreKey: generatedPreKeyBundle.signedPreKey[1].toString(
          "base64",
        ),
        signedPreKeySignature: generatedPreKeyBundle.signedPreKeySignature
          .toString("base64"),
      });
      const e2eeParticipant = res.bodyJSON;
      cliContext.e2eeParticipant = e2eeParticipant;
      E2EEParticipantPrekeyBundleRepository.publishByUserId(
        cliContext.user.id,
        {
          participantId: e2eeParticipant.id,
        },
      );
      console.log("Getting a new access token ...");
      const accessTokenRes = await AuthAPI.getAccessToken();
      cliContext.jwt = accessTokenRes.bodyJSON.access_token;
      console.log("Clearing the local one-time prekeys ...");
      E2EEParticipantOnetimePreKeyRepository.deleteByUserId(cliContext.user.id);
      console.log("Generating the local one-time prekeys ...");
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
            privKey: localEncryptionService.encrypt(opk.keyPair[0]), // only the private key is encrypted
            pubKey: opk.keyPair[1],
          };
        },
      );
      E2EEParticipantOnetimePreKeyRepository.createMany(onetimePreKeysDTO);
      console.log("Publishing the local one-time prekeys to the server ...");
      const serverOnetimePreKeysPayload = onetimePreKeys.map<
        CreateManyOnetimePreKeysRequestPayload[0]
      >((opk) => ({
        id: opk.id,
        pubKey: opk.keyPair[1].toString("base64"),
      }));
      await E2EEParticipantOnetimePreKeyAPI.createMany(
        cliContext.user.id,
        e2eeParticipant.id,
        serverOnetimePreKeysPayload,
      );
      E2EEParticipantOnetimePreKeyRepository.publishByUserId(
        cliContext.user.id,
        { participantId: e2eeParticipant.id },
      );
      // CLI context PreKey bundle data
      cliContextPreKeyBundle = {
        identityKey: generatedPreKeyBundle.identityKey,
        signedPreKey: generatedPreKeyBundle.signedPreKey,
        signedPreKeySignature: generatedPreKeyBundle.signedPreKeySignature,
      };
    }

    cliContext.prekeyBundle = cliContextPreKeyBundle;

    // Rendering the target UI
    console.clear();
    return uiRenderer(params);
  };
}

/**
 * Checks whether the private key and the public key of a x25519 key pair mathematically verify each other.
 */
function verifyX25519KeyPair(privateKey: Buffer, publicKey: Buffer) {
  const { privateKey: _privateKey, publicKey: _publicKey } = crypto
    .generateKeyPairSync("x25519", {
      publicKeyEncoding: {
        type: "spki",
        format: "der",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "der",
      },
    });
  const dh1 = crypto.diffieHellman({
    privateKey: wrapKeyBufferInsideKeyObject(privateKey, "private"),
    publicKey: wrapKeyBufferInsideKeyObject(_publicKey, "public"),
  });
  const dh2 = crypto.diffieHellman({
    privateKey: wrapKeyBufferInsideKeyObject(_privateKey, "private"),
    publicKey: wrapKeyBufferInsideKeyObject(publicKey, "public"),
  });
  return dh1.equals(dh2);
}

/**
 * Wraps a key buffer inside a key object
 *
 * @param keyBuffer The key buffer
 * @param keyType The type of the key
 * @returns The key object wrapper
 */
function wrapKeyBufferInsideKeyObject(
  keyBuffer: Buffer,
  keyType: "public" | "private",
): KeyObject {
  if (keyType === "private") {
    return crypto.createPrivateKey({
      key: keyBuffer,
      format: "der",
      type: "pkcs8",
    });
  } else {
    return crypto.createPublicKey({
      key: keyBuffer,
      format: "der",
      type: "spki",
    });
  }
}
