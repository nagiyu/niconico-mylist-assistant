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
import { EditData } from "@/app/types/EditData";
import { DeleteTarget } from "@/app/types/DeleteTarget";

export default function SignedInContent({ session }: { session: Session }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editData, setEditData] = useState<EditData>(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

    const [autoDialogOpen, setAutoDialogOpen] = useState(false);

    const handleAdd = () => {
        setEditData({ id: "", title: "", favorite: false, skip: false, memo: "" });
        setDialogOpen(true);
    };

    const handleEdit = (row: { id: string; title: string; favorite?: boolean; skip?: boolean; memo?: string }) => {
        setEditData({
            id: row.id,
            title: row.title,
            favorite: row.favorite ?? false,
            skip: row.skip ?? false,
            memo: row.memo ?? "",
        });
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditData(null);
    };

    const handleDialogSave = () => {
        setDialogOpen(false);
        setEditData(null);
        // 保存処理はここに追加可能
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
                {(() => {
                    const rows = [
                        {
                            id: "sm43166484",
                            title: "JUVENILE",
                            favorite: true,
                            skip: false,
                        },
                        {
                            id: "sm44683022",
                            title: "急性恋愛中毒",
                            favorite: false,
                            skip: true,
                        },
                    ];
                    return (
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
                                        {rows.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell>{row.id}</TableCell>
                                                <TableCell>{row.title}</TableCell>
                                                <TableCell align="center">{row.favorite ? "○" : "×"}</TableCell>
                                                <TableCell align="center">{row.skip ? "○" : "×"}</TableCell>
                                                <TableCell align="center">
                                                    <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleEdit(row)}>Edit</Button>
                                                    <Button size="small" variant="outlined" color="error" onClick={() => { setDeleteTarget({ id: row.id, title: row.title }); setDeleteDialogOpen(true); }}>Delete</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    );
                })()}
            </main>

            <EditDialog
                open={dialogOpen}
                editData={editData}
                setEditData={setEditData}
                onClose={handleDialogClose}
                onSave={handleDialogSave}
            />

            <DeleteDialog
                open={deleteDialogOpen}
                target={deleteTarget}
                onClose={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}
                onDelete={() => {
                    // 削除処理はここに追加可能
                    setDeleteDialogOpen(false);
                    setDeleteTarget(null);
                }}
            />
            <AutoDialog
                open={autoDialogOpen}
                onClose={() => setAutoDialogOpen(false)}
                onAuto={() => {
                    // 自動処理はここに追加可能
                    setAutoDialogOpen(false);
                }}
            />
        </>
    );
}
