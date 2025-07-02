import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useState, useEffect } from "react";
import { validateField } from "@/app/utils/validation";

interface BulkImportRow {
    id: number;
    music_id: string;
    title: string;
    music_id_error?: string;
    title_error?: string;
    isLoadingTitle?: boolean;
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

    // Fetch title info from Niconico API
    const fetchTitleInfo = async (rowId: number, musicId: string) => {
        if (!musicId.trim()) return;

        // Set loading state for this row
        setRows(prev => prev.map(row => 
            row.id === rowId ? { ...row, isLoadingTitle: true } : row
        ));

        try {
            const response = await fetch(`/api/music/info?video_id=${encodeURIComponent(musicId)}`);
            const data = await response.json();

            if (response.ok && data.status === "success" && data.title) {
                // Update title and clear any title error
                setRows(prev => prev.map(row => {
                    if (row.id === rowId) {
                        const updatedRow = { ...row, title: data.title, isLoadingTitle: false };
                        delete updatedRow.title_error;
                        return updatedRow;
                    }
                    return row;
                }));
            } else {
                // Failed to fetch, just clear loading state
                setRows(prev => prev.map(row => 
                    row.id === rowId ? { ...row, isLoadingTitle: false } : row
                ));
            }
        } catch (error) {
            console.error("Error fetching video info:", error);
            // Clear loading state on error
            setRows(prev => prev.map(row => 
                row.id === rowId ? { ...row, isLoadingTitle: false } : row
            ));
        }
    };

    const updateRow = (id: number, field: keyof Omit<BulkImportRow, 'id' | 'music_id_error' | 'title_error' | 'isLoadingTitle'>, value: string) => {
        setRows(prev => prev.map(row => {
            if (row.id === id) {
                const updatedRow = { ...row, [field]: value };
                
                // Validate the fields
                if (field === 'music_id') {
                    const error = validateField("music_id", value);
                    if (error && row.title.trim() !== '') {
                        updatedRow.music_id_error = error;
                    } else {
                        delete updatedRow.music_id_error;
                    }
                    
                    // Auto-fetch title when music_id is entered and title is empty (but not loading)
                    if (value.trim() !== '' && row.title.trim() === '' && !row.isLoadingTitle) {
                        // Use setTimeout to ensure state update happens first
                        setTimeout(() => {
                            fetchTitleInfo(id, value.trim());
                        }, 100);
                    }
                } else if (field === 'title') {
                    const error = validateField("title", value); 
                    if (error && row.music_id.trim() !== '') {
                        updatedRow.title_error = error;
                    } else {
                        delete updatedRow.title_error;
                    }
                    
                    // Cancel loading if user manually enters title
                    if (value.trim() !== '' && row.isLoadingTitle) {
                        updatedRow.isLoadingTitle = false;
                    }
                }
                
                // Re-validate the other field when one changes
                if (field === 'music_id' && value.trim() !== '' && row.title.trim() === '') {
                    // Don't set title error if we're about to auto-fetch
                    if (!row.isLoadingTitle) {
                        updatedRow.title_error = validateField("title", "");
                    }
                } else if (field === 'title' && value.trim() !== '' && row.music_id.trim() === '') {
                    updatedRow.music_id_error = validateField("music_id", "");
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
            const musicIdError = validateField("music_id", row.music_id);
            const titleError = validateField("title", row.title);
            
            if (musicIdError) {
                updatedRow.music_id_error = musicIdError;
                hasErrors = true;
            } else {
                delete updatedRow.music_id_error;
            }
            
            if (titleError) {
                updatedRow.title_error = titleError;
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
                        IDを入力すると自動でタイトルが取得されます。IDとタイトルを入力してください。空の行は自動的に削除されますが、新規入力用に最低1行は残します。
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
                                                disabled={importing || row.isLoadingTitle}
                                                variant="outlined"
                                                error={!!row.title_error}
                                                helperText={row.title_error}
                                                InputProps={{
                                                    endAdornment: row.isLoadingTitle ? (
                                                        <CircularProgress size={16} />
                                                    ) : null,
                                                }}
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
