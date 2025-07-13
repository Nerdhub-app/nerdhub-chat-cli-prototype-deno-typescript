import z from "zod";

export const userRegistrationPayloadSchema = z.object({
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

export const userLoginPayloadSchema = z.strictObject({
  email: z.string().min(1),
  password: z.string().min(1),
});
