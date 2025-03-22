import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  path: string;
}

const tabs: Tab[] = [
  {
    id: "internal",
    label: "Send",
    path: "/dashboard/transfer/internal",
  },
  {
    id: "external",
    label: "Bank",
    path: "/dashboard/transfer/external",
  },
  {
    id: "bills",
    label: "Bills",
    path: "/dashboard/transfer/bills",
  },
  {
    id: "airtime",
    label: "Airtime",
    path: "/dashboard/transfer/airtime",
  },
  {
    id: "history",
    label: "History",
    path: "/dashboard/transfer/history",
  },
];

export function TransferTabs() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="relative w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="hide-scrollbar flex w-full overflow-x-auto">
        <div className="flex w-full gap-1 px-1.5 py-1.5 mx-auto max-w-screen-lg">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path;
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.path)}
                className={cn(
                  "relative flex-1 px-2 py-1.5 text-xs md:text-sm font-medium transition-colors",
                  "min-w-[3.5rem] md:min-w-[4.5rem]",
                  "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  isActive ? "text-white" : "text-muted-foreground"
                )}
                style={{
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary"
                    style={{
                      borderRadius: "0.5rem",
                    }}
                    transition={{
                      type: "spring",
                      bounce: 0.15,
                      duration: 0.5,
                    }}
                  />
                )}
                <span className="relative z-10 block text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-border" />
    </div>
  );
} 