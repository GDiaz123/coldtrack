import { useEffect, useState, useCallback } from "react";
import type { CompanyDashboard, Sensor } from "@/lib/domain/coldtrack";

export function useCompanyDashboard(companyId: string) {
  const [data, setData] = useState<CompanyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/company/${companyId}/dashboard`);
      if (!res.ok) {
        throw new Error("Failed to fetch company dashboard");
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setLoading(true);
    fetchDashboard();

    const eventSource = new EventSource(`/api/company/${companyId}/stream`);

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
      console.error("SSE connection error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [companyId, fetchDashboard]);

  const registerSensor = async (input: Omit<Sensor, "id" | "companyId" | "registeredAt" | "active">) => {
    const res = await fetch(`/api/company/${companyId}/sensors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al registrar el sensor");
    }
    const newSensor = await res.json();
    fetchDashboard();
    return newSensor;
  };

  const deleteSensor = async (sensorId: string) => {
    const res = await fetch(`/api/company/${companyId}/sensors/${sensorId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al eliminar el sensor");
    }
    fetchDashboard();
  };

  const updateSensor = async (
    sensorId: string,
    patch: Partial<Omit<Sensor, "id" | "companyId" | "registeredAt">>
  ) => {
    const res = await fetch(`/api/company/${companyId}/sensors/${sensorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Error al actualizar el sensor");
    }
    const updated = await res.json();
    fetchDashboard();
    return updated;
  };

  return {
    data,
    loading,
    error,
    registerSensor,
    deleteSensor,
    updateSensor,
    refetch: fetchDashboard,
  };
}
