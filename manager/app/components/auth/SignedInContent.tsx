"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
  TextField,
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  IconButton,
} from "@mui/material";
import ClearIcon from '@mui/icons-material/Clear';
import styles from "../../page.module.css";
import EditDialog from "@/app/components/dialog/EditDialog";
import DeleteDialog from "@/app/components/dialog/DeleteDialog";
import AutoDialog from "@/app/components/dialog/AutoDialog";
import BulkImportDialog from "@/app/components/dialog/BulkImportDialog";
import SettingsDialog from "@/app/components/dialog/SettingsDialog";
import SearchDialog from "@/app/components/dialog/SearchDialog";

import { Session } from "next-auth";
import { IMusic } from "@/app/interface/IMusic";
import { DeleteTarget } from "@/app/types/DeleteTarget";
import { useEffect } from "react";
import { IRegisterRequest } from "@/app/interface/IRegisterRequest";
import { useNotificationManager } from "@/hooks/notification-manager";

interface BulkImportResponse {
    success: number;
    failure: number;
    skip: number;
    details: {
        success: string[];
        failure: string[];
        skip: string[];
    };
    successfulItems?: {
        music_id: string;
        music_common_id: string;
        title: string;
    }[];
}

export default function SignedInContent({ session }: { session: Session }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editData, setEditData] = useState<IMusic | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

    const [autoDialogOpen, setAutoDialogOpen] = useState(false);
    const [autoDialogLoading, setAutoDialogLoading] = useState(false);
    const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);

    const [rows, setRows] = useState<IMusic[]>([]);
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Search state
    const [searchTerm, setSearchTerm] = useState("");
    const [searchFavorite, setSearchFavorite] = useState<string>("");
    const [searchSkip, setSearchSkip] = useState<string>("");

    // Pagination state
    const [page, setPage] = useState(1);
    const rowsPerPage = 20;

    // Notification manager hook
    const { subscription } = useNotificationManager();

    // APIからデータ取得する関数
    const registeredMusicIds = rows.map(row => row.music_id);

    const fetchMusic = async () => {
        const res = await fetch("/api/music");
        if (res.status === 401) {
            // 認証エラー時は強制ログアウト
            signOut();
            return;
        }
        const data = await res.json();
        setRows(data);
    };

    // 同期ボタン用の関数
    const syncMusic = async () => {
        setIsSyncing(true);
        try {
            await fetchMusic();
        } finally {
            setIsSyncing(false);
        }
    };

    // ローカルキャッシュ更新用のヘルパー関数
    const updateLocalCache = (updatedItem: IMusic, operation: 'create' | 'update' | 'delete') => {
        setRows(prevRows => {
            switch (operation) {
                case 'create':
                    return [...prevRows, updatedItem];
                case 'update':
                    return prevRows.map(row =>
                        row.music_common_id === updatedItem.music_common_id ? updatedItem : row
                    );
                case 'delete':
                    return prevRows.filter(row =>
                        row.music_common_id !== updatedItem.music_common_id
                    );
                default:
                    return prevRows;
            }
        });
    };

    // 初回マウント時に API から取得
    useEffect(() => {
        if (!isSyncing) {
            syncMusic();
        }
    }, [session.tokens]);

    const handleAdd = () => {
        setEditData({
            music_common_id: "",
            user_music_setting_id: "",
            music_id: "",
            title: "",
            favorite: false,
            skip: false,
            memo: ""
        });
        setDialogOpen(true);
    };

    const handleEdit = (row: IMusic) => {
        setEditData({
            music_common_id: row.music_common_id,
            user_music_setting_id: row.user_music_setting_id,
            music_id: row.music_id,
            title: row.title,
            favorite: row.favorite ?? false,
            skip: row.skip ?? false,
            memo: row.memo ?? "",
        });
        setDialogOpen(true);
    };

    const handleEditDialogClose = () => {
        setDialogOpen(false);
        setEditData(null);
    };

    const handleEditDialogSave = async () => {
        if (!editData) return;
        // music_common_id が空なら新規作成、あれば更新
        const method = editData.music_common_id ? "PUT" : "POST";
        const res = await fetch("/api/music", {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(editData),
        });
        if (res.status === 401) {
            signOut();
            return;
        }
        if (!res.ok) {
            // エラーレスポンスを処理
            const errorData = await res.json();
            alert(errorData.error || "エラーが発生しました");
            return;
        }

        // レスポンスデータを取得
        const responseData = await res.json();

        // ローカルキャッシュを更新（DynamoDBを再取得しない）
        if (method === "POST") {
            // 新規作成の場合、サーバーから返された ID を使用
            const newItem: IMusic = {
                ...editData,
                music_common_id: responseData.music_common_id,
                user_music_setting_id: responseData.user_music_setting_id,
            };
            updateLocalCache(newItem, 'create');
        } else {
            // 更新の場合、既存のeditDataを使用
            updateLocalCache(editData, 'update');
        }

        setDialogOpen(false);
        setEditData(null);
    };

    const handleDeleteDialogClose = () => {
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleDeleteDialogDelete = async () => {
        if (deleteTarget) {
            // rowsから該当データを取得
            const row = rows.find(r => r.music_common_id === deleteTarget.music_common_id);
            const res = await fetch("/api/music", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    music_common_id: row?.music_common_id ?? "",
                    user_music_setting_id: row?.user_music_setting_id ?? ""
                }),
            });
            if (res.status === 401) {
                signOut();
                return;
            }

            // 削除成功時、ローカルキャッシュから削除（DynamoDBを再取得しない）
            if (res.ok && row) {
                updateLocalCache(row, 'delete');
            }
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleBulkImport = async (items: { music_id: string; title: string }[]) => {
        const res = await fetch("/api/music/bulk-import", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ items }),
        });

        if (res.status === 401) {
            signOut();
            return;
        }

        const result: BulkImportResponse = await res.json();

        // Show results to user
        const message = `インポート完了:
成功: ${result.success}件
スキップ: ${result.skip}件
失敗: ${result.failure}件`;

        alert(message);

        // インポートが成功した場合、ローカルキャッシュに成功したアイテムを追加
        // 今度はサーバーから返された実際のIDを使用
        if (result.success > 0 && result.successfulItems) {
            result.successfulItems.forEach(item => {
                // 新しいアイテムをローカルキャッシュに追加
                const newItem: IMusic = {
                    music_common_id: item.music_common_id,
                    user_music_setting_id: "", // bulk-importでは個人設定は未作成
                    music_id: item.music_id,
                    title: item.title,
                    favorite: false,
                    skip: false,
                    memo: "",
                };
                updateLocalCache(newItem, 'create');
            });
        }
    };

    // Filter rows based on search criteria
    const filteredRows = rows.filter(row => {
        // MusicID prefix match
        const musicIdMatch = !searchTerm || row.music_id.toLowerCase().startsWith(searchTerm.toLowerCase());

        // Title partial match
        const titleMatch = !searchTerm || row.title.toLowerCase().includes(searchTerm.toLowerCase());

        // Favorite filter
        const favoriteMatch = !searchFavorite ||
            (searchFavorite === "true" && row.favorite) ||
            (searchFavorite === "false" && !row.favorite);

        // Skip filter
        const skipMatch = !searchSkip ||
            (searchSkip === "true" && row.skip) ||
            (searchSkip === "false" && !row.skip);

        // Match if MusicID OR Title matches, AND favorite AND skip match
        return (musicIdMatch || titleMatch) && favoriteMatch && skipMatch;
    });

    // Pagination logic
    const pageCount = Math.ceil(filteredRows.length / rowsPerPage);
    const paginatedRows = filteredRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    return (
        <>
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Typography variant="h6" component="div">
                        ようこそ、{session.user?.name}さん！
                    </Typography>
                    <Button color="inherit" onClick={() => signOut()}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <main className={styles.main}>
                <>
                    <div className={styles.buttonContainer}>
                        <Button variant="contained" color="primary" sx={{ minWidth: 80 }} onClick={handleAdd}>Add</Button>
                        <Button variant="contained" color="info" sx={{ minWidth: 80 }} onClick={() => setBulkImportDialogOpen(true)}>Bulk Import</Button>
                        <Button variant="contained" color="secondary" sx={{ minWidth: 80 }} onClick={() => setAutoDialogOpen(true)}>Auto</Button>
                        <Button variant="contained" color="success" sx={{ minWidth: 80 }} onClick={() => setSearchDialogOpen(true)}>Search</Button>
                        <Button variant="outlined" color="primary" sx={{ minWidth: 80 }} onClick={syncMusic} disabled={isSyncing} startIcon={isSyncing ? <CircularProgress size={16} /> : null}>
                            {isSyncing ? "同期中..." : "Sync"}
                        </Button>
                        <Button variant="outlined" color="inherit" sx={{ minWidth: 80 }} onClick={() => setSettingsDialogOpen(true)}>設定</Button>
                    </div>

                    {/* Search filters */}
                    <Box sx={{
                        maxWidth: { xs: 'none', sm: 600 },
                        margin: { xs: '16px 0', sm: '16px auto' },
                        padding: { xs: '16px', sm: '24px' },
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        backgroundColor: '#fafafa'
                    }}>
                        <Stack spacing={2}>
                            {/* Search term */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'flex-start', sm: 'center' },
                                gap: { xs: 1, sm: 2 }
                            }}>
                                <Typography variant="body2" sx={{ 
                                    fontWeight: 500, 
                                    minWidth: { xs: 'auto', sm: '140px' },
                                    textAlign: { xs: 'left', sm: 'left' }
                                }}>
                                    検索 (ID/タイトル):
                                </Typography>
                                <TextField
                                    size="small"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="ID または タイトルで検索"
                                    fullWidth
                                    variant="outlined"
                                    sx={{ backgroundColor: "#fff" }}
                                    InputProps={{
                                        endAdornment: searchTerm ? (
                                            <IconButton
                                                aria-label="clear search"
                                                onClick={() => setSearchTerm('')}
                                                edge="end"
                                                size="small"
                                            >
                                                <ClearIcon />
                                            </IconButton>
                                        ) : null,
                                    }}
                                />
                            </Box>
                            
                            {/* Favorite filter */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'flex-start', sm: 'center' },
                                gap: { xs: 1, sm: 2 }
                            }}>
                                <Typography variant="body2" sx={{ 
                                    fontWeight: 500, 
                                    minWidth: { xs: 'auto', sm: '140px' },
                                    textAlign: { xs: 'left', sm: 'left' }
                                }}>
                                    お気に入り:
                                </Typography>
                                <FormControl size="small" fullWidth>
                                    <Select
                                        value={searchFavorite}
                                        onChange={(e) => setSearchFavorite(e.target.value)}
                                        displayEmpty
                                        sx={{ backgroundColor: "#fff" }}
                                    >
                                        <MenuItem value="">すべて</MenuItem>
                                        <MenuItem value="true">○</MenuItem>
                                        <MenuItem value="false">×</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                            
                            {/* Skip filter */}
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'flex-start', sm: 'center' },
                                gap: { xs: 1, sm: 2 }
                            }}>
                                <Typography variant="body2" sx={{ 
                                    fontWeight: 500, 
                                    minWidth: { xs: 'auto', sm: '140px' },
                                    textAlign: { xs: 'left', sm: 'left' }
                                }}>
                                    スキップ:
                                </Typography>
                                <FormControl size="small" fullWidth>
                                    <Select
                                        value={searchSkip}
                                        onChange={(e) => setSearchSkip(e.target.value)}
                                        displayEmpty
                                        sx={{ backgroundColor: "#fff" }}
                                    >
                                        <MenuItem value="">すべて</MenuItem>
                                        <MenuItem value="true">○</MenuItem>
                                        <MenuItem value="false">×</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </Stack>
                    </Box>

                    <div className={styles.tableWrapper}>
                        <TableContainer component={Paper} sx={{
                            maxWidth: { xs: 'none', sm: 600 },
                            margin: { xs: '24px 0', sm: '24px auto' }
                        }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>タイトル</TableCell>
                                        <TableCell align="center">お気に入り</TableCell>
                                        <TableCell align="center">スキップ</TableCell>
                                        <TableCell align="center">オプション</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedRows.map((row) =>
                                        <TableRow key={row.music_id}>
                                            <TableCell>{row.music_id}</TableCell>
                                            <TableCell>{row.title}</TableCell>
                                            <TableCell align="center">{row.favorite ? "○" : "×"}</TableCell>
                                            <TableCell align="center">{row.skip ? "○" : "×"}</TableCell>
                                            <TableCell align="center">
                                                <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleEdit(row)}>Edit</Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => {
                                                        if (row && row.music_common_id && row.title) {
                                                            setDeleteTarget({
                                                                music_common_id: row.music_common_id,
                                                                user_music_setting_id: row.user_music_setting_id,
                                                                music_id: row.music_id,
                                                                title: row.title
                                                            });
                                                            setDeleteDialogOpen(true);
                                                        }
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>

                    <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
                        <Pagination count={pageCount} page={page} onChange={handlePageChange} color="primary" />
                    </Box>
                </>
            </main>

            <EditDialog
                open={dialogOpen}
                editData={editData}
                setEditData={setEditData}
                onClose={handleEditDialogClose}
                onSave={handleEditDialogSave}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                target={deleteTarget}
                onClose={handleDeleteDialogClose}
                onDelete={handleDeleteDialogDelete}
            />

            <BulkImportDialog
                open={bulkImportDialogOpen}
                onClose={() => setBulkImportDialogOpen(false)}
                onImport={handleBulkImport}
            />

            <AutoDialog
                open={autoDialogOpen}
                onClose={() => {
                    if (!autoDialogLoading) {
                        setAutoDialogOpen(false);
                    }
                }}
                loading={autoDialogLoading}
                rowsCount={rows.filter(r => !r.skip).length}
                onAuto={async ({ email, password, mylistTitle, count }) => {
                    // rowsからskip=falseのmusic_idをランダム抽出
                    const filtered = rows.filter(r => !r.skip);
                    const shuffled = filtered
                        .map(value => ({ value, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ value }) => value);
                    const id_list = shuffled.slice(0, count).map(r => r.music_id);

                    setAutoDialogLoading(true);
                    try {
                        const reqBody: IRegisterRequest = { email, password, id_list, subscription, title: mylistTitle };
                        const res = await fetch("/api/register", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(reqBody),
                        });
                        const data = await res.json();
                        if (res.ok) {
                            alert("自動登録処理を開始しました。完了時に通知をお送りします。");
                        } else {
                            alert("自動処理失敗: " + JSON.stringify(data));
                        }
                    } catch (e) {
                        alert("自動処理エラー: " + e);
                    } finally {
                        setAutoDialogLoading(false);
                        setAutoDialogOpen(false);
                    }
                }}
            />
            <SettingsDialog
                open={settingsDialogOpen}
                onClose={() => setSettingsDialogOpen(false)}
            />
            <SearchDialog
                open={searchDialogOpen}
                onClose={() => setSearchDialogOpen(false)}
                onAdd={async (data) => {
                    // Create new music item for add action (don't close dialog)
                    const newItem: IMusic = {
                        music_common_id: "",
                        user_music_setting_id: "",
                        music_id: data.music_id,
                        title: data.title,
                        favorite: false,
                        skip: false,
                        memo: "",
                    };

                    try {
                        const response = await fetch("/api/music", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                music_id: newItem.music_id,
                                title: newItem.title,
                                favorite: newItem.favorite,
                                skip: newItem.skip,
                                memo: newItem.memo,
                            }),
                        });

                        if (response.ok) {
                            const result = await response.json();
                            const addedItem = {
                                ...newItem,
                                music_common_id: result.music_common_id,
                                user_music_setting_id: result.user_music_setting_id,
                            };
                            updateLocalCache(addedItem, 'create');
                            // Don't close dialog - allow multiple additions
                        } else {
                            const errorData = await response.json();
                            alert("登録に失敗しました: " + JSON.stringify(errorData));
                        }
                    } catch (error) {
                        console.error("Error adding music:", error);
                        alert("登録中にエラーが発生しました");
                    }
                }}
                onRegister={async (data) => {
                    // Create new music item similar to handleAdd
                    const newItem: IMusic = {
                        music_common_id: "",
                        user_music_setting_id: "",
                        music_id: data.music_id,
                        title: data.title,
                        favorite: false,
                        skip: false,
                        memo: "",
                    };

                    try {
                        const response = await fetch("/api/music", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                music_id: newItem.music_id,
                                title: newItem.title,
                                favorite: newItem.favorite,
                                skip: newItem.skip,
                                memo: newItem.memo,
                            }),
                        });

                        if (response.ok) {
                            const result = await response.json();
                            const addedItem = {
                                ...newItem,
                                music_common_id: result.music_common_id,
                                user_music_setting_id: result.user_music_setting_id,
                            };
                            updateLocalCache(addedItem, 'create');
                            setSearchDialogOpen(false);
                        } else {
                            const errorData = await response.json();
                            alert("登録に失敗しました: " + JSON.stringify(errorData));
                        }
                    } catch (error) {
                        console.error("Error adding music:", error);
                        alert("登録中にエラーが発生しました");
                    }
                }}
                registeredMusicIds={registeredMusicIds}
            />
        </>
    );
}
