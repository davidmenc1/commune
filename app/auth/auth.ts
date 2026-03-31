import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { bearer, jwt } from "better-auth/plugins";

export const auth = betterAuth({
  database: new Database(process.env.BETTER_AUTH_DB),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [jwt(), bearer()],
});
