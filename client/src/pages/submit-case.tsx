import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CaseForm } from "@/components/case-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertCase } from "@shared/schema";

export default function SubmitCasePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const submitCase = useMutation({
    mutationFn: async (data: InsertCase) => {
      return apiRequest("POST", "/api/cases", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ 
        title: "Case submitted!", 
        description: "Your case has been submitted anonymously." 
      });
      navigate("/cases");
    },
    onError: (error) => {
      toast({ 
        title: "Submission failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <CaseForm 
        onSubmit={async (data) => {
          await submitCase.mutateAsync(data);
        }}
        isSubmitting={submitCase.isPending}
      />
    </div>
  );
}
