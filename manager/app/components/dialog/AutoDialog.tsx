import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { useState, useEffect } from "react";
import { ExtendedValidationErrors, validateField, hasValidationErrors } from "@/app/utils/validation";
import { generateTimestampTitle } from "@/app/utils/date";

interface AutoDialogProps {
    open: boolean;
    onClose: () => void;
    onAuto: (params: { email: string; password: string; mylistTitle: string; count: number }) => void;
    rowsCount: number; // Number of rows for default count
}

export default function AutoDialog({
    open,
    onClose,
    onAuto,
    rowsCount,
}: AutoDialogProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mylistTitle, setMylistTitle] = useState(generateTimestampTitle());
    
    // Use rowsCount as default, but max 100
    const defaultCount = Math.min(rowsCount, 100);
    const maxCount = Math.min(rowsCount, 100);
    const [count, setCount] = useState(defaultCount);

    const [errors, setErrors] = useState<ExtendedValidationErrors>({
        music_id: "",
        title: "",
        email: "",
        password: "",
        mylistTitle: "",
        count: "",
    });

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: ExtendedValidationErrors = {
            music_id: "",
            title: "",
            email: validateField("email", email),
            password: validateField("password", password),
            mylistTitle: validateField("mylistTitle", mylistTitle),
            count: validateField("count", count),
        };
        
        // Additional max count validation
        if (count > maxCount) {
            newErrors.count = `カウントは1〜${maxCount}の範囲で入力してください`;
        }
        
        setErrors(newErrors);
        return !hasValidationErrors(newErrors);
    };

    // Real-time validation on field change
    const handleFieldChange = (field: keyof ExtendedValidationErrors, value: string | number) => {
        let error = validateField(field, value);
        
        // Additional max count validation for count field
        if (field === "count" && !error && Number(value) > maxCount) {
            error = `カウントは1〜${maxCount}の範囲で入力してください`;
        }
        
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setErrors({ music_id: "", title: "", email: "", password: "", mylistTitle: "", count: "" });
            setCount(Math.min(rowsCount, 100));
            setMylistTitle(generateTimestampTitle());
        }
    }, [open, rowsCount]);

    const handleAuto = () => {
        if (validateForm()) {
            onAuto({ email, password, mylistTitle, count });
        }
    };

    return (
        <DialogBase
            open={open}
            title="自動処理"
            onClose={onClose}
            onConfirm={handleAuto}
            confirmText="自動処理"
            confirmColor="secondary"
            disabled={
                hasValidationErrors(errors) ||
                !email.trim() || !password.trim() || !mylistTitle.trim() || count < 1 || count > maxCount
            }
        >
            <TextField
                margin="dense"
                label="Email"
                type="email"
                fullWidth
                required
                value={email}
                onChange={e => {
                    const value = e.target.value;
                    setEmail(value);
                    handleFieldChange("email", value);
                }}
                error={!!errors.email}
                helperText={errors.email}
            />
            <TextField
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                required
                value={password}
                onChange={e => {
                    const value = e.target.value;
                    setPassword(value);
                    handleFieldChange("password", value);
                }}
                error={!!errors.password}
                helperText={errors.password}
            />
            <TextField
                margin="dense"
                label="Mylist Title"
                fullWidth
                required
                value={mylistTitle}
                onChange={e => {
                    const value = e.target.value;
                    setMylistTitle(value);
                    handleFieldChange("mylistTitle", value);
                }}
                error={!!errors.mylistTitle}
                helperText={errors.mylistTitle}
            />
            <TextField
                margin="dense"
                label="Count"
                type="number"
                fullWidth
                required
                value={count}
                onChange={e => {
                    const value = Number(e.target.value);
                    setCount(value);
                    handleFieldChange("count", value);
                }}
                inputProps={{ min: 1, max: maxCount }}
                error={!!errors.count}
                helperText={errors.count}
            />
        </DialogBase>
    );

}
