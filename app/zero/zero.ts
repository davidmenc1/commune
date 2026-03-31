import { Zero } from "@rocicorp/zero";
import { schema } from "./schema";
import { atom } from "jotai";

export const zeroAtom = atom<null | Zero<typeof schema>>(null);
