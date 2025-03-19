import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function KycVerificationForm() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertKycDocumentSchema),
    defaultValues: {
      documentType: "",
      documentNumber: "",
      documentImage: "",
    },
  });

  const kycMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
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

  const handleSubmit = (data: any) => {
    const formData = new FormData();
    formData.append("documentType", data.documentType);
    formData.append("documentNumber", data.documentNumber);
    formData.append("documentImage", data.documentImage[0]);
    kycMutation.mutate(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Document Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onChange(e.target.files)}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Upload a clear photo or scan of your document
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
