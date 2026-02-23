import z from "zod";
import { syncedQueryWithContext } from "@rocicorp/zero";
import { builder } from "@/app/zero/schema";
import { AuthContext } from "@/app/api/zero/get-queries/route";
import { getUserFromJwt } from "@/app/auth/jwt";

export const isUserInZero = syncedQueryWithContext(
  "isUserInZero",
  z.tuple([]),
  (ctx: AuthContext) => {
    const user = getUserFromJwt(ctx.jwt);

    return builder.usersTable.where("id", user.id).one();
  }
);

export const hasAnyUsers = syncedQueryWithContext(
  "hasAnyUsers",
  z.tuple([]),
  () => {
    return builder.usersTable.orderBy("created_at", "asc").limit(1);
  }
);
