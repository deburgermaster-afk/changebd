import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Shield, Upload, Send, Link, Plus, X, FileText } from "lucide-react";
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
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const form = useForm<InsertScammer>({
    resolver: zodResolver(insertScammerSchema),
    defaultValues: {
      name: "",
      type: "individual",
      description: "",
      evidenceLinks: [],
      evidenceFiles: [],
    },
  });

  const addLink = () => {
    setLinkError("");
    if (!newLink.trim()) return;
    try {
      new URL(newLink);
      setEvidenceLinks([...evidenceLinks, newLink.trim()]);
      form.setValue("evidenceLinks", [...evidenceLinks, newLink.trim()]);
      setNewLink("");
    } catch {
      setLinkError("Please enter a valid URL");
    }
  };

  const removeLink = (index: number) => {
    const updated = evidenceLinks.filter((_, i) => i !== index);
    setEvidenceLinks(updated);
    form.setValue("evidenceLinks", updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const MAX_FILES = 5;
    
    if (uploadedFiles.length >= MAX_FILES) {
      return;
    }
    
    Array.from(files).slice(0, MAX_FILES - uploadedFiles.length).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedFiles(prev => {
          const updated = [...prev, base64];
          form.setValue("evidenceFiles", updated);
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    form.setValue("evidenceFiles", updated);
  };

  const handleSubmit = async (data: InsertScammer) => {
    await onSubmit({
      ...data,
      evidenceLinks,
      evidenceFiles: uploadedFiles,
    });
    setEvidenceLinks([]);
    setUploadedFiles([]);
    setNewLink("");
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

            <div className="space-y-4">
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Evidence Links
                </FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/evidence"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
                    data-testid="input-evidence-link"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addLink} data-testid="button-add-link">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {linkError && <p className="text-xs text-destructive">{linkError}</p>}
                {evidenceLinks.length > 0 && (
                  <div className="space-y-1">
                    {evidenceLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                        <Link className="h-3 w-3 flex-shrink-0" />
                        <span className="flex-1 truncate">{link}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLink(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <FormDescription>Add links to screenshots, social media posts, or other evidence</FormDescription>
              </div>

              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Evidence Files
                </FormLabel>
                <div className="rounded-md border border-dashed p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="evidence-upload"
                    data-testid="input-evidence-files"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload files</p>
                    <p className="text-xs text-muted-foreground">Images, PDFs, Documents</p>
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                        <FileText className="h-3 w-3 flex-shrink-0" />
                        <span className="flex-1">File {i + 1}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
