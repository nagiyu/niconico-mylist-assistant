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
  disabled?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showCancel?: boolean;
  cancelText?: string;
}

export default function DialogBase({
  open,
  title,
  onClose,
  onConfirm,
  confirmText = "OK",
  confirmColor = "primary",
  disabled = false,
  children,
  actions,
  showCancel = true,
  cancelText = "キャンセル",
}: DialogBaseProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        {actions !== undefined ? (
          actions
        ) : (
          <>
            {showCancel && <Button onClick={onClose}>{cancelText}</Button>}
            {onConfirm && (
              <Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={disabled}>
                {confirmText}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
