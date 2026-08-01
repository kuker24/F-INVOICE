"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineError } from "@/components/ui/inline-error";
import { setUserPasswordAction } from "@/server/actions/users";

export function SetPasswordButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit() {
    setError(null);
    setOk(false);
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    start(async () => {
      const res = await setUserPasswordAction({ id, password });
      if (!res.success) {
        setError(res.error.message);
        return;
      }
      setOk(true);
      setPassword("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setOpen(true);
          setOk(false);
          setError(null);
        }}
      >
        Set password
      </Button>
    );
  }

  return (
    <div className="flex min-w-[12rem] flex-col gap-1">
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password baru"
        minLength={8}
        disabled={pending}
        autoComplete="new-password"
        className="h-8 text-xs"
      />
      <div className="flex gap-1">
        <Button size="sm" disabled={pending} onClick={submit}>
          {pending ? "…" : "Simpan"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError(null);
          }}
        >
          Batal
        </Button>
      </div>
      <InlineError message={error} />
      {ok ? <p className="text-xs text-mid-gray">Password disimpan.</p> : null}
    </div>
  );
}
