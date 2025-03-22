import type { JWTPayload } from "jose";

export type Entity<T> = T & {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export type User = Entity<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}>;

export type UserWithoutPassword = Omit<User, "password">;

export type UserRegistrationDTO = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type UserRegistrationResponseDTO = {
  user: Omit<User, "password">;
  e2eeParticipant: E2EEParticipant;
  access_token: string;
};

export type UserLoginDTO = Record<"email" | "password", string>;

export type UserLoginResponseDTO = UserRegistrationResponseDTO;

export interface AccessTokenPayload extends JWTPayload {
  e2eeParticipantId: string;
}

export type E2EEParticipant = Entity<{
  userId: string;
  deviceId: string;
}>;

export type E2EEParticipantCreationDTO = {
  userId: string;
  deviceId: string;
};
