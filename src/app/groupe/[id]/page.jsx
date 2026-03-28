"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyGroupRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/groups/${params.id}`);
    }
  }, [params, router]);

  return (
    <div className="py-12 text-center text-slate-500">
      Redirection...
    </div>
  );
}
