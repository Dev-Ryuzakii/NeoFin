import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type AccountSummaryProps = {
  user: User;
};

export default function AccountSummary({ user }: AccountSummaryProps) {
  const { toast } = useToast();

  const copyId = () => {
    navigator.clipboard.writeText(user.id.toString());
    toast({
      title: "ID Copied",
      description: "Your user ID has been copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Account Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-bold">
               ₦{parseFloat(user.balance).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Available Balance</p>
          </div>
          <div className="text-right">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your ID:</span>
              <code className="rounded bg-muted px-2 py-1">{user.id}</code>
              <Button variant="ghost" size="icon" onClick={copyId}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Share this ID to receive money</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}