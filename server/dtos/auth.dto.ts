import z from "zod";
import type {
  E2EEParticipant,
  Nullable,
  UserWithoutPassword,
} from "../database/db.d.ts";

export const userSignupRequestSchema = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  username: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
  passwordConfirmation: z.string(),
}).refine(
  ({ password, passwordConfirmation }) => password === passwordConfirmation,
  {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  },
);
export type UserRegistrationRequestDTO = z.infer<
  typeof userSignupRequestSchema
>;
export type UserRegistrationResponseDTO = {
  user: UserWithoutPassword;
  access_token: string;
  refresh_token: string;
};

export const userSigninRequestSchema = z.strictObject({
  email: z.string().min(1),
  password: z.string().min(1),
});
export type UserSigninRequestDTO = z.infer<
  typeof userSigninRequestSchema
>;
export type UserSigninResponseDTO = UserRegistrationResponseDTO & {
  e2eeParticipant: Nullable<E2EEParticipant>;
};

export type RefreshTokenResponseDTO = {
  access_token: string;
  refresh_token: string;
};

export type GetAuthUserResponseDTO = {
  user: UserWithoutPassword;
  e2eeParticipant: Nullable<E2EEParticipant>;
};
