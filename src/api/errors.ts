import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    for (const message of [data?.detail, data?.message, data?.reason]) {
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return fallback;
}
