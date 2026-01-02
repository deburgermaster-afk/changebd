import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Shield, Upload, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { insertScammerSchema, scammerTypes, type InsertScammer } from "@shared/schema";

interface ScammerFormProps {
  onSubmit: (data: InsertScammer) => Promise<void>;
  isSubmitting?: boolean;
}

const typeDescriptions: Record<typeof scammerTypes[number], string> = {
  individual: "A single person conducting scams",
  business: "A company or business entity",
  organization: "A group, NGO, or collective",
};

export function ScammerForm({ onSubmit, isSubmitting }: ScammerFormProps) {
  const form = useForm<InsertScammer>({
    resolver: zodResolver(insertScammerSchema),
    defaultValues: {
      name: "",
      type: "individual",
      description: "",
      evidence: [],
    },
  });

  const handleSubmit = async (data: InsertScammer) => {
    await onSubmit(data);
  };

  return (
    <Card className="max-w-2xl mx-auto" data-testid="card-scammer-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Report a Scammer
        </CardTitle>
        <CardDescription>
          Help protect the community by reporting fraudulent individuals or entities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-scammer-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {scammerTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div>
                            <div className="font-medium capitalize">{type}</div>
                            <div className="text-xs text-muted-foreground">
                              {typeDescriptions[type]}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name / Entity</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Name of the scammer or business..."
                      {...field}
                      data-testid="input-scammer-name"
                    />
                  </FormControl>
                  <FormDescription>
                    The name of the person, business, or organization
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
                  <FormLabel>Description of Scam</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the scam in detail. How did it happen? What did they do? How can others identify this scam?..."
                      className="min-h-[160px] resize-y"
                      {...field}
                      data-testid="input-scammer-description"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide detailed information to help others identify this scam
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
                Screenshots, documents, chat logs, transaction records
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Anonymous & Protected</p>
                <p className="text-muted-foreground">
                  Your report is completely anonymous. We verify reports before publishing 
                  to prevent misuse while protecting your identity.
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="destructive"
              className="w-full gap-2" 
              size="lg"
              disabled={isSubmitting}
              data-testid="button-submit-scammer"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit Report Anonymously"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
