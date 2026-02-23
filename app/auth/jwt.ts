import { createStore, useAtomValue } from "jotai";
import { atomWithStorage, RESET } from "jotai/utils";
import { decodeJwt } from "jose";
import z from "zod";

// TODO PROPER ERROR HANDELING

export interface JwksData {
  keys: Key[];
}

export interface Key {
  alg: string;
  crv: string;
  x: string;
  kty: string;
  kid: string;
}

export const jwtAtom = atomWithStorage<string | null>("jwt", null);
export const store = createStore();

export async function getJwt(token: string) {
  const response = await fetch("/api/auth/token", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JWT: ${response.status}`);
  }

  const data: { token: string } = await response.json();
  if (!data.token) {
    throw new Error("Missing JWT in auth response");
  }
  store.set(jwtAtom, data.token);
}

export function clearJwt() {
  store.set(jwtAtom, RESET);
  // Also clear from localStorage directly in case atomWithStorage doesn't sync immediately
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("jwt");
  }
}

export const jwtSchema = z.object({
  name: z.string(),
  email: z.email(),
  id: z.string(),
});

/**
 * WARNING THIS DOES NOT VERIFY THE TOKEN
 * @param jwt
 * @returns object with user data
 */
export const getUserFromJwt = (jwt: string) => jwtSchema.parse(decodeJwt(jwt));

export function useJwt(): string | null {
  const jwt = useAtomValue(jwtAtom);

  if (jwt !== null) {
    return jwt;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const storedJwt = window.localStorage.getItem("jwt");
  return storedJwt ? storedJwt.replaceAll('"', "") : null;
}
