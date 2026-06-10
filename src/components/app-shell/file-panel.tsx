import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FilePanel() {
  return (
    <div className="flex h-full w-[42vw] min-w-[300px] flex-col max-[640px]:w-screen max-[640px]:min-w-0">
      <div className="flex h-9 flex-none items-center border-b border-line bg-panel px-3 text-[11px] text-muted">
        Files
      </div>
      <div className="grid flex-1 place-items-center p-6">
        <Card className="border-0 bg-transparent text-center shadow-none">
          <CardContent className="px-6 py-8">
            <div className="mx-auto mb-3 grid size-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
              <FileText className="size-5" />
            </div>
            <p className="m-0 text-xs text-muted-foreground">No file open</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
