import { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

type AccountSummaryProps = {
  user: User;
};

export default function AccountSummary({ user }: AccountSummaryProps) {
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
          <div>
            <p className="text-3xl font-bold">
              ${parseFloat(user.balance).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Available Balance</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
