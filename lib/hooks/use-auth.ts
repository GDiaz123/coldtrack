import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/lib/domain/coldtrack";

export function useAuth(requiredRole?: string, requiredCompanyId?: string) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        const data = await res.json();
        
        if (!active) return;

        setUser(data.user);

        // Check required role
        if (requiredRole && data.user.role !== requiredRole) {
          router.replace("/");
          return;
        }

        // Check required company matching (unless the user is a super admin)
        if (requiredCompanyId && data.user.role !== "SUPER_ADMIN") {
          if (data.user.companyId !== requiredCompanyId) {
            router.replace("/");
            return;
          }
        }
      } catch {
        if (active) {
          setUser(null);
          router.replace("/");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [requiredRole, requiredCompanyId, router]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    router.replace("/");
  };

  return { user, loading, logout };
}
