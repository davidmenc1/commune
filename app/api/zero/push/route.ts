import {
  PushProcessor,
  ZQLDatabase,
  PostgresJSConnection,
} from "@rocicorp/zero/pg";
import postgres from "postgres";
import { NextResponse } from "next/server";
import { schema } from "@/app/zero/schema";
import { createMutators } from "@/app/zero/mutators";
import { JwksData } from "@/app/auth/jwt";
import { createLocalJWKSet, decodeJwt, jwtVerify } from "jose";
import { createServerMutators } from "@/app/zero/server_mutators";

const processor = new PushProcessor(
  new ZQLDatabase(
    new PostgresJSConnection(postgres(process.env.ZERO_UPSTREAM_DB! as string)),
    schema
  )
);

let jwksData: JwksData | null = null;

export async function POST(request: Request) {
  if (jwksData === null) {
    const res = await fetch("http://localhost:3000/api/auth/jwks");
    jwksData = await res.json();
  }

  if (jwksData === null) {
    return NextResponse.json({ error: "JWKS data not found" }, { status: 500 });
  }

  const jwt = request.headers.get("Authorization")?.split(" ")[1] ?? "";

  await jwtVerify(jwt, createLocalJWKSet(jwksData), {
    audience: "http://localhost:3000",
    issuer: "http://localhost:3000",
  });

  const { exp } = decodeJwt(jwt);

  if (exp && exp < Date.now() / 1000) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  console.log(exp);

  const result = await processor.process(
    createServerMutators({ jwt }, createMutators({ jwt })),
    request
  );
  return NextResponse.json(result);
}
