import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { useState, useEffect } from "react";

interface BulkImportRow {
    id: number;
    music_id: string;
    title: string;
    music_id_error?: string;
    title_error?: string;
}

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
    const [rows, setRows] = useState<BulkImportRow[]>([{ id: 1, music_id: "", title: "" }]);
    const [importing, setImporting] = useState(false);
    const [showImportAlert, setShowImportAlert] = useState(false);
    const [nextId, setNextId] = useState(2);

    // Ensure there's always one empty row at the bottom for new input
    useEffect(() => {
        const hasEmptyRow = rows.some(row => row.music_id === "" && row.title === "");
        if (!hasEmptyRow) {
            setRows(prev => [...prev, { id: nextId, music_id: "", title: "" }]);
            setNextId(prev => prev + 1);
        }
    }, [rows, nextId]);

    const updateRow = (id: number, field: keyof Omit<BulkImportRow, 'id' | 'music_id_error' | 'title_error'>, value: string) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };
                
                // Validate the fields
                if (field === 'music_id') {
                    if (value.trim() === '' && row.title.trim() !== '') {
                        updatedRow.music_id_error = 'IDは必須です';
                    } else {
                        delete updatedRow.music_id_error;
                    }
                } else if (field === 'title') {
                    if (value.trim() === '' && row.music_id.trim() !== '') {
                        updatedRow.title_error = 'タイトルは必須です';
                    } else {
                        delete updatedRow.title_error;
                    }
                }
                
                // Re-validate the other field when one changes
                if (field === 'music_id' && value.trim() !== '' && row.title.trim() === '') {
                    updatedRow.title_error = 'タイトルは必須です';
                } else if (field === 'title' && value.trim() !== '' && row.music_id.trim() === '') {
                    updatedRow.music_id_error = 'IDは必須です';
                }
                
                // Clear errors if both fields are empty (valid empty row)
                if (updatedRow.music_id.trim() === '' && updatedRow.title.trim() === '') {
                    delete updatedRow.music_id_error;
                    delete updatedRow.title_error;
                }
                
                return updatedRow;
            }
            return row;
        }));
    };

    const deleteRow = (id: number) => {
        setRows(prev => {
            const filtered = prev.filter(row => row.id !== id);
            // Ensure at least one row remains
            return filtered.length === 0 ? [{ id: nextId, music_id: "", title: "" }] : filtered;
        });
        if (rows.length === 1) {
            setNextId(prev => prev + 1);
        }
    };

    // Clean up empty rows (except keep one empty row)
    const cleanupRows = () => {
        setRows(prev => {
            const nonEmptyRows = prev.filter(row => row.music_id.trim() !== "" || row.title.trim() !== "");
            const emptyRows = prev.filter(row => row.music_id.trim() === "" && row.title.trim() === "");
            
            // Keep one empty row for new input
            if (emptyRows.length === 0) {
                return [...nonEmptyRows, { id: nextId, music_id: "", title: "" }];
            } else {
                return [...nonEmptyRows, emptyRows[0]];
            }
        });
    };

    const handleImport = async () => {
        if (importing) return;

        // Get valid items (non-empty rows) and check for validation errors
        const validItems: { music_id: string; title: string }[] = [];
        let hasErrors = false;

        const updatedRows = rows.map(row => {
            const updatedRow = { ...row };
            
            // Skip completely empty rows
            if (row.music_id.trim() === '' && row.title.trim() === '') {
                delete updatedRow.music_id_error;
                delete updatedRow.title_error;
                return updatedRow;
            }
            
            // Validate non-empty rows
            if (row.music_id.trim() === '') {
                updatedRow.music_id_error = 'IDは必須です';
                hasErrors = true;
            } else {
                delete updatedRow.music_id_error;
            }
            
            if (row.title.trim() === '') {
                updatedRow.title_error = 'タイトルは必須です';
                hasErrors = true;
            } else {
                delete updatedRow.title_error;
            }
            
            // Add to valid items if no errors
            if (!updatedRow.music_id_error && !updatedRow.title_error) {
                validItems.push({ 
                    music_id: row.music_id.trim(), 
                    title: row.title.trim() 
                });
            }
            
            return updatedRow;
        });

        // Update rows with validation errors
        setRows(updatedRows);

        if (hasErrors) {
            alert("入力エラーがあります。IDとタイトルの両方を入力してください。");
            return;
        }

        if (validItems.length === 0) {
            alert("有効なデータが見つかりません。IDとタイトルを入力してください。");
            return;
        }

        setImporting(true);
        setShowImportAlert(true);
        try {
            await onImport(validItems);
            // Reset to initial state
            setRows([{ id: 1, music_id: "", title: "" }]);
            setNextId(2);
            onClose();
        } catch (error) {
            console.error("Bulk import failed:", error);
            alert("一括インポートに失敗しました。");
        } finally {
            setImporting(false);
            setShowImportAlert(false);
        }
    };

    const handleClose = () => {
        if (importing) return;
        // Reset to initial state
        setRows([{ id: 1, music_id: "", title: "" }]);
        setNextId(2);
        setShowImportAlert(false);
        onClose();
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>一括インポート</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        IDとタイトルを入力してください。空の行は自動的に削除されますが、新規入力用に最低1行は残します。
                    </Typography>
                    <TableContainer 
                        component={Paper} 
                        variant="outlined"
                        sx={{
                            maxHeight: { xs: '60vh', sm: '70vh' },
                            overflowX: 'auto',
                            overflowY: 'auto',
                            '& .MuiTable-root': {
                                minWidth: { xs: 500, sm: 600 }
                            }
                        }}
                    >
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center" sx={{ width: { xs: 60, sm: 80 }, minWidth: 60 }}>行番号</TableCell>
                                    <TableCell sx={{ width: { xs: 180, sm: 200 }, minWidth: 180 }}>ID</TableCell>
                                    <TableCell sx={{ minWidth: 200 }}>タイトル</TableCell>
                                    <TableCell align="center" sx={{ width: { xs: 60, sm: 80 }, minWidth: 60 }}>削除</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell align="center">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={row.music_id}
                                                onChange={(e) => updateRow(row.id, 'music_id', e.target.value)}
                                                onBlur={cleanupRows}
                                                placeholder="sm12345678"
                                                disabled={importing}
                                                variant="outlined"
                                                error={!!row.music_id_error}
                                                helperText={row.music_id_error}
                                                sx={{
                                                    '& .MuiFormHelperText-root': {
                                                        fontSize: '0.75rem'
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={row.title}
                                                onChange={(e) => updateRow(row.id, 'title', e.target.value)}
                                                onBlur={cleanupRows}
                                                placeholder="楽曲タイトル"
                                                disabled={importing}
                                                variant="outlined"
                                                error={!!row.title_error}
                                                helperText={row.title_error}
                                                sx={{
                                                    '& .MuiFormHelperText-root': {
                                                        fontSize: '0.75rem'
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Button
                                                size="small"
                                                onClick={() => deleteRow(row.id)}
                                                disabled={importing || rows.length === 1}
                                                color="error"
                                                variant="outlined"
                                            >
                                                削除
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={importing}>
                        キャンセル
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleImport} 
                        disabled={importing || rows.every(row => row.music_id.trim() === "" && row.title.trim() === "")}
                    >
                        {importing ? "インポート中..." : "インポート"}
                    </Button>
                </DialogActions>
            </Dialog>
            
            <Snackbar
                open={showImportAlert}
                autoHideDuration={null}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="info" sx={{ width: '100%' }}>
                    インポート中です...
                </Alert>
            </Snackbar>
        </>
    );
}