"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          next: nextPath,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        redirectTo?: string;
      };
      if (!response.ok) {
        throw new Error(result.message || "Unable to sign in.");
      }
      window.location.assign(result.redirectTo || "/admin");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
      setBusy(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        <span>Owner email</span>
        <input
          autoComplete="username"
          defaultValue="shoedoctorhtd@gmail.com"
          name="email"
          required
          type="email"
        />
      </label>
      <label>
        <span>Password</span>
        <input
          autoComplete="current-password"
          minLength={12}
          name="password"
          placeholder="Your private admin password"
          required
          type="password"
        />
      </label>
      {message && (
        <p className="admin-login-error" role="alert">
          {message}
        </p>
      )}
      <button disabled={busy} type="submit">
        {busy ? "Signing in…" : "Open owner dashboard"}
      </button>
    </form>
  );
}
