import { NextResponse } from "next/server";
import { getPublicSessionData } from "@/lib/public-session";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicSessionData(slug);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (result.status === "not_published") {
    return NextResponse.json({ error: "not_published" }, { status: 404 });
  }

  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
