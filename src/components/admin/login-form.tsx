"use client";
import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { loginAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {} as { error?: string; email?: string });
  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state?.email} key={state?.email} /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <LogIn />} Sign in</Button>
    </form>
  );
}
