import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from "@mui/material";
import { useNotificationManager } from "@/hooks/notification-manager";

interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
    const {
        isSupported,
        subscription,
        error,
        subscribeToPush,
        unsubscribeFromPush,
    } = useNotificationManager();

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>設定</DialogTitle>
            <DialogContent>
                <Typography variant="subtitle1" gutterBottom>
                    プッシュ通知
                </Typography>
                {!isSupported && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        このブラウザはプッシュ通知に対応していません
                    </Alert>
                )}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                    状態:{" "}
                    {subscription
                        ? "購読中"
                        : isSupported
                            ? "未購読"
                            : "未対応"}
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    sx={{ mr: 1, mt: 1 }}
                    disabled={!isSupported || !!subscription}
                    onClick={subscribeToPush}
                >
                    プッシュ通知を有効化
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    sx={{ mt: 1 }}
                    disabled={!isSupported || !subscription}
                    onClick={unsubscribeFromPush}
                >
                    プッシュ通知を解除
                </Button>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>閉じる</Button>
            </DialogActions>
        </Dialog>
    );
}
