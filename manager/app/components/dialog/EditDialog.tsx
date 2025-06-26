import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";

import { EditData } from "@/app/types/EditData";

interface EditDialogProps {
    open: boolean;
    editData: EditData;
    setEditData: React.Dispatch<React.SetStateAction<EditData>>;
    onClose: () => void;
    onSave: () => void;
}

export default function EditDialog({
    open,
    editData,
    setEditData,
    onClose,
    onSave,
}: EditDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{editData && editData.id ? "編集" : "追加"}</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    label="ID"
                    fullWidth
                    value={editData?.id ?? ""}
                    onChange={e => setEditData(data => data ? { ...data, id: e.target.value } : data)}
                    disabled={!!(editData && editData.id)}
                />
                <TextField
                    margin="dense"
                    label="タイトル"
                    fullWidth
                    value={editData?.title ?? ""}
                    onChange={e => setEditData(data => data ? { ...data, title: e.target.value } : data)}
                />
                <FormGroup row>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!editData?.favorite}
                                onChange={e =>
                                    setEditData(data =>
                                        data ? { ...data, favorite: e.target.checked } : data
                                    )
                                }
                            />
                        }
                        label="Favorite"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!editData?.skip}
                                onChange={e =>
                                    setEditData(data =>
                                        data ? { ...data, skip: e.target.checked } : data
                                    )
                                }
                            />
                        }
                        label="Skip"
                    />
                </FormGroup>
                <TextField
                    margin="dense"
                    label="メモ"
                    fullWidth
                    value={editData?.memo ?? ""}
                    onChange={e => setEditData(data => data ? { ...data, memo: e.target.value } : data)}
                    multiline
                    minRows={2}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>キャンセル</Button>
                <Button variant="contained" onClick={onSave}>保存</Button>
            </DialogActions>
        </Dialog>
    );
}
