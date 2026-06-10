import { Boxes, FolderOpen, Plus, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SessionSidebar() {
  return (
    <div className="flex h-full w-[260px] flex-col max-[640px]:w-[min(280px,85vw)]">
      <div className="flex items-center gap-1.5 px-2.5 pt-3 pb-2.5">
        <div className="min-w-0 flex-1 overflow-hidden font-ui-mono text-[13px] font-semibold whitespace-nowrap text-primary">
          Pi Agent Web
        </div>
        <Button
          className="w-[65px]"
          disabled
          size="sm"
          type="button"
        >
          <Plus />
          New
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Refresh sessions"
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <RefreshCw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh sessions</TooltipContent>
        </Tooltip>
      </div>

      <Button
        className="mx-2.5 mb-2 justify-start font-ui-mono text-[11px]"
        size="sm"
        type="button"
        variant="outline"
      >
        <FolderOpen />
        <span>Select project...</span>
      </Button>

      <Separator />
      <ScrollArea className="min-h-20 flex-[1_1_50%]">
        <div className="space-y-2 px-3 py-3.5" aria-label="Loading sessions">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-[88%]" />
          <Skeleton className="h-8 w-[72%]" />
        </div>
      </ScrollArea>

      <div className="flex gap-1.5 p-2">
        <Button
          className="flex-1"
          size="sm"
          type="button"
          variant="ghost"
        >
          <Boxes />
          Models
        </Button>
        <Button
          className="flex-1"
          disabled
          size="sm"
          type="button"
          variant="ghost"
        >
          <Sparkles />
          Skills
        </Button>
      </div>
    </div>
  );
}
