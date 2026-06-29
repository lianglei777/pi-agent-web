"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 共享确认弹窗:编辑 / 新会话等需二次确认的动作复用此组件。
export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
      open={open}
    >
      <DialogContent closeLabel={cancelLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDismiss} type="button" variant="outline">
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            type="button"
            variant={tone === "danger" ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
