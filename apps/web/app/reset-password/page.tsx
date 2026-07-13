import Link from "next/link";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Set a new password</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This link is missing its token.{" "}
          <Link href="/forgot-password" className="underline">
            Request a new one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
