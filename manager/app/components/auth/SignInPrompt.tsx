"use client";

import { signIn } from "next-auth/react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

export default function SignInPrompt() {
    return (
        <>
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Typography variant="h6" component="div">
                        サインイン
                    </Typography>
                    <Button color="inherit" onClick={() => signIn()}>
                        Login with Google
                    </Button>
                </Toolbar>
            </AppBar>
            <div style={{ padding: 24 }}>
                <p>サインインしてください。</p>
            </div>
        </>
    );
}
