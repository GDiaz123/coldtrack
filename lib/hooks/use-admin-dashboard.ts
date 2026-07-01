import { useEffect, useState, useCallback } from "react";
import type { AdminOverview, Company, AppUser } from "@/lib/domain/coldtrack";

export function useAdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/overview`);
      if (!res.ok) {
        throw new Error("Failed to fetch admin overview");
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchOverview();
    });

    const eventSource = new EventSource(`/api/admin/stream`);

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "snapshot" || message.type === "update") {
          setData(message.payload);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("SSE parsing error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE admin stream error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [fetchOverview]);

  // Companies CRUD
  const createCompany = async (input: Omit<Company, "id" | "createdAt">) => {
    const res = await fetch(`/api/admin/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al crear la empresa");
    }
    const newCompany = await res.json();
    fetchOverview();
    return newCompany;
  };

  const updateCompany = async (
    companyId: string,
    patch: Partial<Omit<Company, "id" | "createdAt">>
  ) => {
    const res = await fetch(`/api/admin/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al actualizar la empresa");
    }
    const updated = await res.json();
    fetchOverview();
    return updated;
  };

  const deleteCompany = async (companyId: string) => {
    const res = await fetch(`/api/admin/companies/${companyId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al eliminar la empresa");
    }
    fetchOverview();
  };

  // Users CRUD
  const createUser = async (input: Omit<AppUser, "id">) => {
    const res = await fetch(`/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al crear el usuario");
    }
    const newUser = await res.json();
    fetchOverview();
    return newUser;
  };

  const updateUser = async (
    userId: string,
    patch: Partial<Omit<AppUser, "id">>
  ) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al actualizar el usuario");
    }
    const updated = await res.json();
    fetchOverview();
    return updated;
  };

  const deleteUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al eliminar el usuario");
    }
    fetchOverview();
  };

  return {
    data,
    loading,
    error,
    createCompany,
    updateCompany,
    deleteCompany,
    createUser,
    updateUser,
    deleteUser,
    refetch: fetchOverview,
  };
}
