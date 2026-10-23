"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/* Smart back link — returns to the in-app page the user came from,
   falling back to `fallback` when arriving via deep link / fresh load. */
export default function BackLink({
  fallback,
  label = "← Back",
  className = "",
}: {
  fallback: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const last = sessionStorage.getItem("sd:cur");
    if (last && last !== pathname) sessionStorage.setItem("sd:prev", last);
    sessionStorage.setItem("sd:cur", pathname);
  }, [pathname]);

  return (
    <Link
      href={fallback}
      className={className}
      onClick={(e) => {
        const prev = sessionStorage.getItem("sd:prev");
        if (prev && prev !== pathname) {
          e.preventDefault();
          router.push(prev);
        }
      }}
    >
      {label}
    </Link>
  );
}
