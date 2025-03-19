import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertKycDocumentSchema } from "@shared/schema";
import { z } from "zod";

// Extend the schema to handle file upload
const kycFormSchema = insertKycDocumentSchema.omit({ documentImage: true }).extend({
  documentImage: z.instanceof(FileList).transform(files => files.item(0))
    .refine(file => file !== null, "Document image is required")
    .refine(
      file => file && ["image/jpeg", "image/png", "image/jpg"].includes(file.type),
      "Only JPEG and PNG files are allowed"
    )
    .refine(
      file => file && file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB"
    ),
});

type KycFormData = z.infer<typeof kycFormSchema>;

export default function KycVerificationForm() {
  const { toast } = useToast();
  const form = useForm<KycFormData>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      documentType: undefined,
      documentNumber: "",
      documentImage: undefined,
    },
  });

  const kycMutation = useMutation({
    mutationFn: async (data: KycFormData) => {
      const formData = new FormData();
      formData.append("documentType", data.documentType);
      formData.append("documentNumber", data.documentNumber);
      formData.append("documentImage", data.documentImage);

      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit KYC documents");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      form.reset();
      toast({
        title: "KYC submission successful",
        description: "Your documents have been submitted for verification",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => kycMutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="documentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a document type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="driver_license">Driver's License</SelectItem>
                  <SelectItem value="national_id">National ID</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose a valid government-issued ID
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="documentNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter the document number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="documentImage"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <FormLabel>Document Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) {
                      onChange(files);
                    }
                  }}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Upload a clear photo or scan of your document (JPEG or PNG, max 5MB)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={kycMutation.isPending}
        >
          {kycMutation.isPending ? "Submitting..." : "Submit for Verification"}
        </Button>
      </form>
    </Form>
  );
}