import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type TransactionListProps = {
  userId?: number;
  isAdmin?: boolean;
};

export default function TransactionList({ userId, isAdmin }: TransactionListProps) {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          {isAdmin && <TableHead>Users</TableHead>}
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              {format(new Date(transaction.createdAt), "MMM d, yyyy HH:mm")}
            </TableCell>
            <TableCell className="capitalize">{transaction.type}</TableCell>
            <TableCell
              className={
                transaction.fromUserId === userId ? "text-red-500" : "text-green-500"
              }
            >
              {transaction.fromUserId === userId ? "-" : "+"}$
              {parseFloat(transaction.amount.toString()).toFixed(2)}
            </TableCell>
            {isAdmin && (
              <TableCell>
                {transaction.fromUserId} → {transaction.toUserId}
              </TableCell>
            )}
            <TableCell>
              <Badge
                variant={
                  transaction.status === "completed"
                    ? "default"
                    : transaction.status === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {transaction.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
