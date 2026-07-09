import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Sign in</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter your email and we&apos;ll send you a sign-in link.
      </p>
      <LoginForm />
    </div>
  );
}
