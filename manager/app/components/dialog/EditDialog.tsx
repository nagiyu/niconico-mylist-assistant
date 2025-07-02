import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect } from "react";

import { EditData } from "@/app/types/EditData";
import { ValidationErrors, validateField, hasValidationErrors } from "@/app/utils/validation";
import { useVideoInfo } from "@/hooks/useVideoInfo";

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
    const [errors, setErrors] = useState<ValidationErrors>({
        music_id: "",
        title: "",
    });
    const { isLoading: isLoadingInfo, error: infoError, fetchVideoInfo } = useVideoInfo();

    // Real-time validation on field change
    const handleFieldChange = (field: keyof ValidationErrors, value: string) => {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {
            music_id: validateField("music_id", editData?.music_id ?? ""),
            title: validateField("title", editData?.title ?? ""),
        };
        setErrors(newErrors);
        return !hasValidationErrors(newErrors);
    };

    // Reset errors when dialog opens/closes
    useEffect(() => {
        if (open) {
            setErrors({ music_id: "", title: "" });
        }
    }, [open]);

    // Fetch video info from Niconico API
    const handleGetInfo = async () => {
        const musicId = editData?.music_id?.trim();
        if (!musicId) return;

        const title = await fetchVideoInfo(musicId);
        if (title) {
            setEditData(prev => prev ? { ...prev, title } : prev);
            // Clear title validation error if title was successfully fetched
            setErrors(prev => ({ ...prev, title: "" }));
        }
    };

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
                {infoError && (
                    <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '4px' }}>
                        {infoError}
                    </div>
                )}
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
                    onClick={handleGetInfo}
                    disabled={isLoadingInfo || !editData?.music_id?.trim()}
                    startIcon={isLoadingInfo ? <CircularProgress size={16} /> : null}
                >
                    {isLoadingInfo ? "取得中..." : "Info"}
                </Button>
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
