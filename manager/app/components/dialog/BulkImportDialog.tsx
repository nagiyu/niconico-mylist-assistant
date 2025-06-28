import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

interface BulkImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImport: (items: { music_id: string; title: string }[]) => Promise<void>;
}

export default function BulkImportDialog({
    open,
    onClose,
    onImport,
}: BulkImportDialogProps) {
    const [inputText, setInputText] = useState("");
    const [importing, setImporting] = useState(false);

    const handleImport = async () => {
        if (importing) return;

        // Parse input text - expecting format "ID,Title" per line or "ID:Title" per line
        const lines = inputText.trim().split('\n').filter(line => line.trim());
        const items: { music_id: string; title: string }[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Support both comma and colon separators
            let separator = ',';
            if (trimmedLine.includes(':') && !trimmedLine.includes(',')) {
                separator = ':';
            }

            const parts = trimmedLine.split(separator);
            if (parts.length >= 2) {
                const music_id = parts[0].trim();
                const title = parts.slice(1).join(separator).trim();
                if (music_id && title) {
                    items.push({ music_id, title });
                }
            }
        }

        if (items.length === 0) {
            alert("有効なデータが見つかりません。フォーマット: \"ID,タイトル\" または \"ID:タイトル\" (1行に1件)");
            return;
        }

        setImporting(true);
        try {
            await onImport(items);
            setInputText("");
            onClose();
        } catch (error) {
            console.error("Bulk import failed:", error);
            alert("一括インポートに失敗しました。");
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        if (importing) return;
        setInputText("");
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>一括インポート</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    IDとタイトルのリストを入力してください。<br />
                    フォーマット: &quot;ID,タイトル&quot; または &quot;ID:タイトル&quot; (1行に1件)<br />
                    例: sm12345678,楽曲タイトル
                </Typography>
                <TextField
                    margin="dense"
                    label="IDとタイトルのリスト"
                    fullWidth
                    multiline
                    rows={10}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`sm12345678,楽曲タイトル1
sm23456789:楽曲タイトル2
sm34567890,楽曲タイトル3`}
                    disabled={importing}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={importing}>
                    キャンセル
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleImport} 
                    disabled={importing || !inputText.trim()}
                >
                    {importing ? "インポート中..." : "インポート"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}