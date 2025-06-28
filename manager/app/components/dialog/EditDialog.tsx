import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import { useState, useEffect } from "react";

import { EditData } from "@/app/types/EditData";

interface EditDialogProps {
    open: boolean;
    editData: EditData;
    setEditData: React.Dispatch<React.SetStateAction<EditData>>;
    onClose: () => void;
    onSave: () => void;
}

interface ValidationErrors {
    music_id: string;
    title: string;
}

export default function EditDialog({
    open,
    editData,
    setEditData,
    onClose,
    onSave,
}: EditDialogProps) {
    const [errors, setErrors] = useState<ValidationErrors>({
        music_id: "",
        title: "",
    });

    // Validation function
    const validateField = (field: string, value: string): string => {
        if (field === "music_id" || field === "title") {
            if (!value || value.trim() === "") {
                return `${field === "music_id" ? "ID" : "タイトル"}は必須です`;
            }
        }
        return "";
    };

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {
            music_id: validateField("music_id", editData?.music_id ?? ""),
            title: validateField("title", editData?.title ?? ""),
        };
        setErrors(newErrors);
        return !newErrors.music_id && !newErrors.title;
    };

    // Real-time validation on field change
    const handleFieldChange = (field: keyof ValidationErrors, value: string) => {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    // Reset errors when dialog opens/closes
    useEffect(() => {
        if (open) {
            setErrors({ music_id: "", title: "" });
        }
    }, [open]);

    const handleSave = () => {
        if (validateForm()) {
            onSave();
        }
    };
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{!!editData?.user_music_setting_id ? "編集" : "追加"}</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    label="ID"
                    fullWidth
                    required
                    value={editData?.music_id ?? ""}
                    onChange={e => {
                        const value = e.target.value;
                        setEditData(data => data ? { ...data, music_id: value } : data);
                        handleFieldChange("music_id", value);
                    }}
                    disabled={!!editData?.user_music_setting_id}
                    error={!!errors.music_id}
                    helperText={errors.music_id}
                />
                <TextField
                    margin="dense"
                    label="タイトル"
                    fullWidth
                    required
                    value={editData?.title ?? ""}
                    onChange={e => {
                        const value = e.target.value;
                        setEditData(data => data ? { ...data, title: value } : data);
                        handleFieldChange("title", value);
                    }}
                    error={!!errors.title}
                    helperText={errors.title}
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
                <Button 
                    variant="contained" 
                    onClick={handleSave}
                    disabled={!!errors.music_id || !!errors.title || !editData?.music_id?.trim() || !editData?.title?.trim()}
                >
                    保存
                </Button>
            </DialogActions>
        </Dialog>
    );
}
