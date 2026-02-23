import { handleGetQueriesRequest } from "@rocicorp/zero/server";
import { withValidation } from "@rocicorp/zero";
import { schema } from "@/app/zero/schema";
import { ReadonlyJSONValue } from "@rocicorp/zero";
import { isUserInZero, hasAnyUsers } from "@/app/chat/(zero-boundary)/traffic/query";
import {
  getChannels,
  getChannelById,
  getChannelMessages,
  getUserGroups,
  getAllUsers,
  getAllChannels,
} from "@/app/chat/(zero-boundary)/channels/query";
import { NextResponse } from "next/server";
import { createLocalJWKSet, jwtVerify } from "jose";
import { JwksData } from "@/app/auth/jwt";

export type AuthContext = { jwt: string };

const validated = Object.fromEntries(
  [
    isUserInZero,
    hasAnyUsers,
    getChannels,
    getChannelById,
    getChannelMessages,
    getUserGroups,
    getAllUsers,
    getAllChannels,
  ].map((q) => [q.queryName, withValidation(q)])
);

let jwksData: JwksData | null = null;

export async function POST(request: Request) {
  const jwt = request.headers.get("Authorization")?.split(" ")[1];

  if (!jwt) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (jwksData === null) {
    const res = await fetch("http://localhost:3000/api/auth/jwks");
    jwksData = await res.json();
  }

  if (jwksData === null) {
    return new Response("JWKS data not found", { status: 500 });
  }

  console.log(jwt, jwksData);
  await jwtVerify(jwt, createLocalJWKSet(jwksData), {
    audience: "http://localhost:3000",
    issuer: "http://localhost:3000",
  });

  const res = await handleGetQueriesRequest(
    (name, args) => getQuery({ jwt }, name, args),
    schema,
    request
  );

  return NextResponse.json(res);
}

function getQuery(
  authData: AuthContext,
  name: string,
  args: readonly ReadonlyJSONValue[]
) {
  const q = validated[name];
  if (!q) {
    throw new Error(`No such query: ${name}`);
  }
  return {
    // Pass authData to both auth'd and unauth'd queries
    query: q(authData, ...args),
  };
}
