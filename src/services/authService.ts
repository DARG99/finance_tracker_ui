import { api } from "../api/client";
import { loginResponseSchema } from "../schemas/authSchema";
import { loginSchema, type LoginFormData } from "../schemas/loginSchema";
import { signupSchema, type SignupFormData } from "../schemas/signupSchema";

const TOKEN_KEY = "accessToken";

export const authService = {
  async login(data: LoginFormData): Promise<void> {
    const response = await api.post<unknown>("/auth/login", loginSchema.parse(data));
    const { token } = loginResponseSchema.parse(response.data);
    localStorage.setItem(TOKEN_KEY, token);
  },
  async signup(data: SignupFormData): Promise<void> {
    await api.post("/auth/signup", signupSchema.parse(data));
  },
  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(TOKEN_KEY)?.trim());
  },
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};
