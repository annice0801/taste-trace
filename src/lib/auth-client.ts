import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export function signInWithGoogle(callbackURL = window.location.pathname) {
  return authClient.signIn.social({ provider: "google", callbackURL });
}
