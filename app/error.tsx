"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-lg space-y-4 text-center">
      <h2 className="font-serif text-xl font-semibold text-care-forest">Something went wrong</h2>
      <p className="text-sm text-care-stone">
        The page hit an unexpected error. You can try again, or refresh the browser.
      </p>
      <button type="button" onClick={() => reset()} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
