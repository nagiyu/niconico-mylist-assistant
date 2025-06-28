import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState, useEffect } from "react";

interface AutoDialogProps {
    open: boolean;
    onClose: () => void;
    onAuto: (params: { email: string; password: string; mylistTitle: string; count: number }) => void;
    rowsCount: number; // Number of rows for default count
}

interface ValidationErrors {
    email: string;
    password: string;
    mylistTitle: string;
    count: string;
}

export default function AutoDialog({
    open,
    onClose,
    onAuto,
    rowsCount,
}: AutoDialogProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const defaultTitle = `CustomMylist_${y}${m}${d}_${hh}${mm}${ss}`;
    const [mylistTitle, setMylistTitle] = useState(defaultTitle);
    
    // Use rowsCount as default, but max 100
    const defaultCount = Math.min(rowsCount, 100);
    const [count, setCount] = useState(defaultCount);

    const [errors, setErrors] = useState<ValidationErrors>({
        email: "",
        password: "",
        mylistTitle: "",
        count: "",
    });

    // Validation function
    const validateField = (field: string, value: string | number): string => {
        switch (field) {
            case "email":
                if (!value || String(value).trim() === "") {
                    return "メールアドレスは必須です";
                }
                // Basic email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(String(value))) {
                    return "有効なメールアドレスを入力してください";
                }
                break;
            case "password":
                if (!value || String(value).trim() === "") {
                    return "パスワードは必須です";
                }
                break;
            case "mylistTitle":
                if (!value || String(value).trim() === "") {
                    return "マイリスト名は必須です";
                }
                break;
            case "count":
                const num = Number(value);
                if (!value || isNaN(num)) {
                    return "カウントは必須です";
                }
                if (num < 1 || num > 100) {
                    return "カウントは1〜100の範囲で入力してください";
                }
                break;
        }
        return "";
    };

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {
            email: validateField("email", email),
            password: validateField("password", password),
            mylistTitle: validateField("mylistTitle", mylistTitle),
            count: validateField("count", count),
        };
        setErrors(newErrors);
        return !newErrors.email && !newErrors.password && !newErrors.mylistTitle && !newErrors.count;
    };

    // Real-time validation on field change
    const handleFieldChange = (field: keyof ValidationErrors, value: string | number) => {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setErrors({ email: "", password: "", mylistTitle: "", count: "" });
            setCount(Math.min(rowsCount, 100));
        }
    }, [open, rowsCount]);

    const handleAuto = () => {
        if (validateForm()) {
            onAuto({ email, password, mylistTitle, count });
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>自動処理</DialogTitle>
            <DialogContent>
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
                    inputProps={{ min: 1, max: 100 }}
                    error={!!errors.count}
                    helperText={errors.count}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>キャンセル</Button>
                <Button 
                    variant="contained" 
                    color="secondary" 
                    onClick={handleAuto}
                    disabled={
                        !!errors.email || !!errors.password || !!errors.mylistTitle || !!errors.count ||
                        !email.trim() || !password.trim() || !mylistTitle.trim() || count < 1 || count > 100
                    }
                >
                    実行
                </Button>
            </DialogActions>
        </Dialog>
    );
}
