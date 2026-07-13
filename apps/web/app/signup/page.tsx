import { SignupForm } from "@/components/SignupForm";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "That confirmation link is missing its token.",
  invalid_token: "That confirmation link is invalid or has expired — sign up again.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Create an account</h1>
      {error && ERROR_MESSAGES[error] && (
        <p className="text-sm text-red-600">{ERROR_MESSAGES[error]}</p>
      )}
      <SignupForm />
    </div>
  );
}
