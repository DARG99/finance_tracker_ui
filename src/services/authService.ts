import { api } from "../api/client";
import { loginSchema, type LoginFormData } from "../schemas/loginSchema";
import { signupSchema, type SignupFormData } from "../schemas/signupSchema";

import { hasSession } from "../auth/session";
import { authApi, logoutSession, saveSession, withSessionLock } from "../auth/renewal";

export const authService = {
  async login(data: LoginFormData): Promise<void> {
    await withSessionLock(async () => {
      const response = await authApi.post<unknown>("/auth/login", loginSchema.parse(data));
      saveSession(response.data);
    });
  },
  async signup(data: SignupFormData): Promise<void> {
    await api.post("/auth/signup", signupSchema.parse(data));
  },
  isAuthenticated(): boolean {
    return hasSession();
  },
  logout(): Promise<void> {
    return logoutSession();
  },
};
