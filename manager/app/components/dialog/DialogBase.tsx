import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import React from "react";

interface DialogBaseProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  confirmColor?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
  children: React.ReactNode;
}

export default function DialogBase({
  open,
  title,
  onClose,
  onConfirm,
  confirmText = "OK",
  confirmColor = "primary",
  children,
}: DialogBaseProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        {onConfirm && (
          <Button variant="contained" color={confirmColor} onClick={onConfirm}>
            {confirmText}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
