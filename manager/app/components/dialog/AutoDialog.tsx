import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";

interface AutoDialogProps {
    open: boolean;
    onClose: () => void;
    onAuto: (params: { email: string; password: string; mylistTitle: string; count: number }) => void;
}

export default function AutoDialog({
    open,
    onClose,
    onAuto,
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
    const [count, setCount] = useState(100);

    const handleAuto = () => {
        onAuto({ email, password, mylistTitle, count });
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
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="Password"
                    type="password"
                    fullWidth
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="Mylist Title"
                    fullWidth
                    value={mylistTitle}
                    onChange={e => setMylistTitle(e.target.value)}
                />
                <TextField
                    margin="dense"
                    label="Count"
                    type="number"
                    fullWidth
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    inputProps={{ min: 1 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>キャンセル</Button>
                <Button variant="contained" color="secondary" onClick={handleAuto}>実行</Button>
            </DialogActions>
        </Dialog>
    );
}
