"use client";

import { signOut } from "next-auth/react";
import styles from "../../page.module.css";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useState } from "react";
import EditDialog from "@/app/components/dialog/EditDialog";
import DeleteDialog from "@/app/components/dialog/DeleteDialog";
import AutoDialog from "@/app/components/dialog/AutoDialog";

import { Session } from "next-auth";
import { IMusic } from "@/app/interface/IMusic";
import { DeleteTarget } from "@/app/types/DeleteTarget";
import { useEffect } from "react";
import { IRegisterRequest } from "@/app/interface/IRegisterRequest";

export default function SignedInContent({ session }: { session: Session }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editData, setEditData] = useState<IMusic | null>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

    const [autoDialogOpen, setAutoDialogOpen] = useState(false);

    const [rows, setRows] = useState<IMusic[]>([]);

    // APIからデータ取得する関数
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

    // 初回マウント時に API から取得
    useEffect(() => {
        fetchMusic();
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
        setDialogOpen(false);
        setEditData(null);
        await fetchMusic();
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
        }
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        await fetchMusic();
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
                    <div style={{ maxWidth: 600, margin: "24px auto 8px auto", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button variant="contained" color="primary" sx={{ minWidth: 80 }} onClick={handleAdd}>Add</Button>
                        <Button variant="contained" color="secondary" sx={{ minWidth: 80 }} onClick={() => setAutoDialogOpen(true)}>Auto</Button>
                    </div>
                    <TableContainer component={Paper} sx={{ maxWidth: 600, margin: "24px auto" }}>
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
                                {rows.map((row) =>
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

            <AutoDialog
                open={autoDialogOpen}
                onClose={() => setAutoDialogOpen(false)}
                rowsCount={rows.filter(r => !r.skip).length}
                onAuto={async ({ email, password, mylistTitle, count }) => {
                    // rowsからskip=falseのmusic_idをランダム抽出
                    const filtered = rows.filter(r => !r.skip);
                    const shuffled = filtered
                        .map(value => ({ value, sort: Math.random() }))
                        .sort((a, b) => a.sort - b.sort)
                        .map(({ value }) => value);
                    const id_list = shuffled.slice(0, count).map(r => r.music_id);

                    try {
                        const reqBody: IRegisterRequest = { email, password, id_list };
                        const res = await fetch("/api/register", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(reqBody),
                        });
                        const data = await res.json();
                        if (res.ok) {
                            alert("自動処理成功: " + JSON.stringify(data));
                        } else {
                            alert("自動処理失敗: " + JSON.stringify(data));
                        }
                    } catch (e) {
                        alert("自動処理エラー: " + e);
                    }
                    setAutoDialogOpen(false);
                }}
            />
        </>
    );
}
