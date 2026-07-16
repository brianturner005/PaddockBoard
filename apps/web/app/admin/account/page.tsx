import { redirect } from "next/navigation";
import { getCurrentUser, findUserById } from "@/lib/auth";
import { SectionCard } from "@/components/SectionCard";
import { UpdateNameForm } from "@/components/UpdateNameForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function AccountPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const user = await findUserById(sessionUser.id);
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Your account</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
      </div>

      <SectionCard title="Name">
        <UpdateNameForm initialName={user.name} />
      </SectionCard>

      <SectionCard title="Password">
        <ChangePasswordForm hasPassword={Boolean(user.passwordHash)} />
      </SectionCard>
    </div>
  );
}
