import { useState } from "react";
import { ArrowLeft, FileSpreadsheet, Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import SingleLookup from "@/components/SingleLookup";
import BulkUpload from "@/components/BulkUpload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Mode = "single" | "bulk" | null;

export default function Dashboard() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8 animate-fade-in">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              DNS A Record Fetcher
            </h1>
            <p className="text-muted-foreground">
              {mode === null
                ? "Choose how you'd like to look up Cloudflare A records."
                : mode === "single"
                  ? "Look up A records for a single Cloudflare zone."
                  : "Upload a spreadsheet to process many zones at once."}
            </p>
          </div>
          {mode !== null && (
            <Button variant="ghost" onClick={() => setMode(null)}>
              <ArrowLeft className="h-4 w-4" />
              Back to options
            </Button>
          )}
        </div>

        {mode === null && (
          <div className="grid gap-5 sm:grid-cols-2 animate-fade-in">
            <ModeCard
              title="Single Import"
              description="Fetch A records for one Cloudflare zone using your credentials."
              icon={<Search className="h-6 w-6" />}
              onClick={() => setMode("single")}
            />
            <ModeCard
              title="Bulk Import"
              description="Upload an .xlsx file and fetch A records for many zones at once."
              icon={<FileSpreadsheet className="h-6 w-6" />}
              onClick={() => setMode("bulk")}
            />
          </div>
        )}

        {mode === "single" && (
          <div className="animate-fade-in">
            <SingleLookup />
          </div>
        )}
        {mode === "bulk" && (
          <div className="animate-fade-in">
            <BulkUpload />
          </div>
        )}
      </div>
    </Layout>
  );
}

function ModeCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left group">
      <Card
        className={cn(
          "h-full p-6 shadow-card transition-all",
          "hover:border-primary hover:shadow-elegant hover:-translate-y-0.5",
        )}
      >
        <div className="flex items-start gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
          </div>
        </div>
      </Card>
    </button>
  );
}
