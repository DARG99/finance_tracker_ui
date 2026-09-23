import { api } from "../api/client";
import { loginResponseSchema } from "../schemas/authSchema";
import { loginSchema, type LoginFormData } from "../schemas/loginSchema";
import { signupSchema, type SignupFormData } from "../schemas/signupSchema";

import { hasSession, setToken } from "../auth/session";

export const authService = {
  async login(data: LoginFormData): Promise<void> {
    const response = await api.post<unknown>("/auth/login", loginSchema.parse(data));
    const { token } = loginResponseSchema.parse(response.data);
    setToken(token);
  },
  async signup(data: SignupFormData): Promise<void> {
    await api.post("/auth/signup", signupSchema.parse(data));
  },
  isAuthenticated(): boolean {
    return hasSession();
  },
  logout(): void {
    setToken(null);
  },
};
