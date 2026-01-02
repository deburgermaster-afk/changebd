import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ScammerForm } from "@/components/scammer-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertScammer } from "@shared/schema";

export default function ReportScammerPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const submitReport = useMutation({
    mutationFn: async (data: InsertScammer) => {
      return apiRequest("POST", "/api/scammers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scammers"] });
      toast({ 
        title: "Report submitted!", 
        description: "Your report has been submitted for verification." 
      });
      navigate("/scammers");
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
      <ScammerForm 
        onSubmit={async (data) => {
          await submitReport.mutateAsync(data);
        }}
        isSubmitting={submitReport.isPending}
      />
    </div>
  );
}
