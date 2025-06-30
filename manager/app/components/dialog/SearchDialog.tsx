import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState, useEffect, useRef } from "react";

interface SearchDialogProps {
    open: boolean;
    onClose: () => void;
    onRegister: (data: { music_id: string; title: string }) => void;
}

interface ValidationErrors {
    music_id: string;
    title: string;
}

export default function SearchDialog({
    open,
    onClose,
    onRegister,
}: SearchDialogProps) {
    const [musicId, setMusicId] = useState("");
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [errors, setErrors] = useState<ValidationErrors>({
        music_id: "",
        title: "",
    });
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [infoError, setInfoError] = useState<string>("");
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Validation function
    const validateField = (field: string, value: string): string => {
        if (field === "music_id" || field === "title") {
            if (!value || value.trim() === "") {
                return `${field === "music_id" ? "ID" : "タイトル"}は必須です`;
            }
        }
        return "";
    };

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {
            music_id: validateField("music_id", musicId),
            title: validateField("title", title),
        };
        setErrors(newErrors);
        return !newErrors.music_id && !newErrors.title;
    };

    // Real-time validation on field change
    const handleFieldChange = (field: keyof ValidationErrors, value: string) => {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setMusicId("");
            setTitle("");
            setUrl("");
            setErrors({ music_id: "", title: "" });
            setInfoError("");
        }
    }, [open]);

    // Extract Music ID from URL
    const extractMusicIdFromUrl = (inputUrl: string): string | null => {
        if (!inputUrl) return null;
        
        // Support multiple URL formats
        const patterns = [
            /(?:nicovideo\.jp\/watch\/)([a-z]{2}\d+)/,  // https://www.nicovideo.jp/watch/sm12345678
            /(?:nico\.ms\/)([a-z]{2}\d+)/,              // https://nico.ms/sm12345678
            /^([a-z]{2}\d+)$/                           // Direct ID like sm12345678
        ];
        
        for (const pattern of patterns) {
            const match = inputUrl.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    };

    // Handle URL input change with automatic MusicID extraction
    const handleUrlChange = (inputUrl: string) => {
        setUrl(inputUrl);
        
        if (inputUrl.trim()) {
            const extractedId = extractMusicIdFromUrl(inputUrl.trim());
            if (extractedId) {
                setMusicId(extractedId);
                handleFieldChange("music_id", extractedId);
                setInfoError(""); // Clear any previous errors
            }
        } else {
            // Clear MusicID when URL is cleared
            setMusicId("");
            handleFieldChange("music_id", "");
        }
    };

    // Extract Music ID from URL field
    const handleExtractMusicId = () => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            alert("URLまたはMusicIDを入力してください");
            return;
        }

        try {
            const extractedId = extractMusicIdFromUrl(trimmedUrl);
            
            if (extractedId) {
                setMusicId(extractedId);
                handleFieldChange("music_id", extractedId);
                setInfoError(""); // Clear any previous errors
            } else {
                alert("有効なニコニコ動画のURLまたはIDを入力してください\n例: sm12345678, https://www.nicovideo.jp/watch/sm12345678");
            }
        } catch (error) {
            console.error("Error extracting music ID:", error);
            alert("MusicIDの取得に失敗しました");
        }
    };

    // Fetch video info from Niconico API
    const handleGetInfo = async () => {
        const trimmedMusicId = musicId.trim();
        if (!trimmedMusicId) {
            setInfoError("IDを入力してください");
            return;
        }

        setIsLoadingInfo(true);
        setInfoError("");

        try {
            const response = await fetch(`/api/music/info?video_id=${encodeURIComponent(trimmedMusicId)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch video info");
            }

            if (data.status === "success" && data.title) {
                setTitle(data.title);
                // Clear title validation error if title was successfully fetched
                setErrors(prev => ({ ...prev, title: "" }));
            } else {
                setInfoError(data.message || "情報の取得に失敗しました");
            }
        } catch (error) {
            console.error("Error fetching video info:", error);
            setInfoError("情報の取得中にエラーが発生しました");
        } finally {
            setIsLoadingInfo(false);
        }
    };

    const handleRegister = () => {
        if (validateForm()) {
            onRegister({ music_id: musicId.trim(), title: title.trim() });
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>検索</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        ニコニコ動画で動画を検索し、URLまたはMusicIDを入力して登録できます
                    </Typography>
                    <iframe
                        ref={iframeRef}
                        src="https://www.nicovideo.jp/"
                        width="100%"
                        height="400"
                        style={{ border: "1px solid #ccc", borderRadius: "4px" }}
                        title="ニコニコ動画"
                    />
                </Box>
                
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                        label="URL または MusicID"
                        value={url}
                        onChange={e => handleUrlChange(e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="例: https://www.nicovideo.jp/watch/sm12345678 または sm12345678"
                        helperText="URLまたはMusicIDを入力すると自動的に抽出されます"
                    />
                    <Button
                        variant="outlined"
                        onClick={handleExtractMusicId}
                        disabled={!url.trim()}
                        sx={{ minWidth: 100 }}
                    >
                        取得
                    </Button>
                </Box>

                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                        label="Music ID"
                        value={musicId}
                        disabled
                        fullWidth
                        size="small"
                        error={!!errors.music_id}
                        helperText={errors.music_id || "URLから自動的に抽出されます"}
                    />
                </Box>

                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <TextField
                        label="タイトル"
                        value={title}
                        onChange={e => {
                            const value = e.target.value;
                            setTitle(value);
                            handleFieldChange("title", value);
                        }}
                        fullWidth
                        size="small"
                        error={!!errors.title}
                        helperText={errors.title || "Infoボタンで自動取得、または手動で編集可能です"}
                    />
                    <Button
                        variant="outlined"
                        onClick={handleGetInfo}
                        disabled={isLoadingInfo || !musicId.trim()}
                        startIcon={isLoadingInfo ? <CircularProgress size={16} /> : null}
                        sx={{ minWidth: 100 }}
                    >
                        {isLoadingInfo ? "取得中..." : "Info"}
                    </Button>
                </Box>

                {infoError && (
                    <Box sx={{ color: 'error.main', fontSize: '0.875rem', mt: 1 }}>
                        {infoError}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>キャンセル</Button>
                <Button 
                    variant="contained" 
                    onClick={handleRegister}
                    disabled={!!errors.music_id || !!errors.title || !musicId.trim() || !title.trim()}
                >
                    登録
                </Button>
            </DialogActions>
        </Dialog>
    );
}