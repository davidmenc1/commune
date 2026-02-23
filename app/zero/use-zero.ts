import { createUseZero } from "@rocicorp/zero/react";
import type { Schema } from "./schema";
import type { createMutators } from "./mutators";

type AppMutators = ReturnType<typeof createMutators>;

export const useAppZero = createUseZero<Schema, AppMutators>();
