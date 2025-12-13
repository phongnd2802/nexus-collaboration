import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectFormData {
  name: string;
  description: string;
  dueDate: string;
  dueTime: string;
  files: any[];
}

export function useCreateProject() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    dueDate: "",
    dueTime: "",
    files: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          dueDate: formData.dueDate || null,
          dueTime: formData.dueTime || null,
          files: formData.files,
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        if (data.error === "SUBSCRIPTION_LIMIT_EXCEEDED") {
          setError(
            "You have reached your project limit. Please contact support to upgrade your plan."
          );
          return;
        }

        throw new Error(data.message || "Failed to create project");
      }

      router.push("/projects");
    } catch (err) {
      console.error("Error creating project:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create project"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    updateField,
    handleSubmit,
    isSubmitting,
    error,
    setError,
  };
}
