import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { DeleteTarget } from "@/app/types/DeleteTarget";

interface DeleteDialogProps {
    open: boolean;
    target: DeleteTarget;
    onClose: () => void;
    onDelete: () => void;
}

export default function DeleteDialog({
    open,
    target,
    onClose,
    onDelete,
}: DeleteDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>削除の確認</DialogTitle>
            <DialogContent>
                {target ? (
                    <div>
                        <div>ID: {target.id}</div>
                        <div>タイトル: {target.title}</div>
                        <div>本当に削除しますか？</div>
                    </div>
                ) : (
                    <div>本当に削除しますか？</div>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>キャンセル</Button>
                <Button variant="contained" color="error" onClick={onDelete}>削除</Button>
            </DialogActions>
        </Dialog>
    );
}
