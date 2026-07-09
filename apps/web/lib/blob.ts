import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

// Stores the raw uploaded file before any parsing is attempted, per the
// project's "store before parse" rule — the original file is always
// durably saved even if parsing subsequently fails.
export async function storeRawUpload(
  sessionId: string,
  file: File
): Promise<{ url: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const path = `raw-uploads/${sessionId}/${nanoid(12)}-${file.name}`;
  const blob = await put(path, file, {
    access: "public",
    token,
  });

  return { url: blob.url };
}
