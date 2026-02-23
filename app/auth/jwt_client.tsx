"use client";

import { Provider } from "jotai";
import { store } from "./jwt";

export function JwtProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
