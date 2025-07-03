import DialogBase from "./DialogBase";
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
        <DialogBase
            open={open}
            title="削除の確認"
            onClose={onClose}
            onConfirm={onDelete}
            confirmText="削除"
            confirmColor="error"
        >
            {target ? (
                <div>
                    <div>ID: {target.music_id}</div>
                    <div>タイトル: {target.title}</div>
                    <div>本当に削除しますか？</div>
                </div>
            ) : (
                <div>本当に削除しますか？</div>
            )}
        </DialogBase>
    );
}
    </Dialog>
    );
}
