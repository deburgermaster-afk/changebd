import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Shield, Upload, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertCaseSchema, caseCategories, type InsertCase } from "@shared/schema";

interface CaseFormProps {
  onSubmit: (data: InsertCase) => Promise<void>;
  isSubmitting?: boolean;
}

const categoryLabels: Record<typeof caseCategories[number], { label: string; description: string }> = {
  political: { label: "Political", description: "Government policies, elections, corruption" },
  social: { label: "Social", description: "Community issues, rights, discrimination" },
  "scam-alert": { label: "Scam Alert", description: "Frauds, scams, suspicious activities" },
  environment: { label: "Environment", description: "Pollution, climate, nature" },
  education: { label: "Education", description: "Schools, universities, learning" },
  healthcare: { label: "Healthcare", description: "Hospitals, medicine, health services" },
  infrastructure: { label: "Infrastructure", description: "Roads, utilities, public works" },
};

export function CaseForm({ onSubmit, isSubmitting }: CaseFormProps) {
  const form = useForm<InsertCase>({
    resolver: zodResolver(insertCaseSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "social",
      evidence: [],
    },
  });

  const handleSubmit = async (data: InsertCase) => {
    await onSubmit(data);
  };

  return (
    <Card className="max-w-2xl mx-auto" data-testid="card-case-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Raise a Case
        </CardTitle>
        <CardDescription>
          Share your concern with the community. Your identity remains completely anonymous.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-case-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {caseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          <div>
                            <div className="font-medium">{categoryLabels[cat].label}</div>
                            <div className="text-xs text-muted-foreground">
                              {categoryLabels[cat].description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="A clear, descriptive title for your case..."
                      {...field}
                      data-testid="input-case-title"
                    />
                  </FormControl>
                  <FormDescription>
                    Make it specific and attention-grabbing (10-200 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the issue in detail. Include facts, context, and what you want to achieve..."
                      className="min-h-[160px] resize-y"
                      {...field}
                      data-testid="input-case-description"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide detailed information (50-5000 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-md border border-dashed p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Evidence upload coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                You'll be able to attach images, documents, and links
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Your privacy is protected</p>
                <p className="text-muted-foreground">
                  Your submission is fully anonymous. No personal data is stored or linked to this case. 
                  All data is encrypted end-to-end.
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full gap-2" 
              size="lg"
              disabled={isSubmitting}
              data-testid="button-submit-case"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit Case Anonymously"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
