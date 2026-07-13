import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Reset your password</h1>
      <ForgotPasswordForm />
    </div>
  );
}
