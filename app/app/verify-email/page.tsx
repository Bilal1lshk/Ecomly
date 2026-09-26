import { Suspense } from "react";
import VerifyEmailForm from "./verify-email-form";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
