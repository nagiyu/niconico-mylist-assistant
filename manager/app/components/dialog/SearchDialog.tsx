import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
} from "@mui/material";
import ClearIcon from '@mui/icons-material/Clear';
import { useState, useEffect } from "react";
import styles from "./SearchDialog.module.css";
import { ExtendedValidationErrors, validateField, hasValidationErrors } from "common";
import { useVideoInfo } from "@/hooks/useVideoInfo";

interface SearchDialogProps {
    open: boolean;
    onClose: () => void;
    onRegister: (data: { music_id: string; title: string }) => void;
    onAdd?: (data: { music_id: string; title: string }) => void;
    registeredMusicIds: string[];
}

interface SearchResult {
    contentId: string;
    title: string;
}

export default function SearchDialog({
    open,
    onClose,
    onRegister,
    onAdd,
    registeredMusicIds
}: SearchDialogProps) {
    const [musicId, setMusicId] = useState("");
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [errors, setErrors] = useState<ValidationErrors>({
        music_id: "",
        title: "",
    });
    const { isLoading: isLoadingInfo, error: infoError, fetchVideoInfo } = useVideoInfo();

    // Real-time validation on field change
    const handleFieldChange = (field: keyof ValidationErrors, value: string) => {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    // Validate all fields
    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {
            music_id: validateField("music_id", musicId),
            title: validateField("title", title),
        };
        setErrors(newErrors);
        return !hasValidationErrors(newErrors);
    };

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setMusicId("");
            setTitle("");
            setUrl("");
            setSearchKeyword("");
            setSearchResults([]);
            setSearchError("");
            setErrors({ music_id: "", title: "" });
        }
    }, [open]);

    // Handle add button click
    const handleAdd = (result: SearchResult) => {
        if (onAdd) {
            onAdd({ music_id: result.contentId, title: result.title });
        } else {
            // Fallback to onRegister if onAdd is not provided
            onRegister({ music_id: result.contentId, title: result.title });
        }
    }

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
        if (!trimmedMusicId) return;

        const fetchedTitle = await fetchVideoInfo(trimmedMusicId);
        if (fetchedTitle) {
            setTitle(fetchedTitle);
            // Clear title validation error if title was successfully fetched
            setErrors(prev => ({ ...prev, title: "" }));
        }
    };

    // Search videos using Niconico search API
    const handleSearch = async () => {
        const keyword = searchKeyword.trim();
        if (!keyword) {
            setSearchError("検索キーワードを入力してください");
            return;
        }

        setIsSearching(true);
        setSearchError("");
        setSearchResults([]);

        try {
            const response = await fetch(`/api/music/search?q=${encodeURIComponent(keyword)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to search videos");
            }

            if (data.status === "success" && data.results) {
                setSearchResults(data.results);
            } else {
                setSearchError(data.message || "検索に失敗しました");
            }
        } catch (error) {
            console.error("Error searching videos:", error);
            setSearchError("検索中にエラーが発生しました");
        } finally {
            setIsSearching(false);
        }
    };

    // Handle selection of search result
    const handleSelectResult = (result: SearchResult) => {
        setMusicId(result.contentId);
        setTitle(result.title);
        setUrl(""); // Clear URL field since we selected from search
        handleFieldChange("music_id", result.contentId);
        handleFieldChange("title", result.title);
    };

    const handleRegister = () => {
        if (validateForm()) {
            onRegister({ music_id: musicId.trim(), title: title.trim() });
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
            PaperProps={{ className: styles.searchDialogPaper }}
        >
            <DialogTitle>検索</DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        ニコニコ動画で動画を検索し、結果から選択して登録できます
                    </Typography>

                    {/* Search section */}
                    <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                        <TextField
                            label="検索キーワード"
                            value={searchKeyword}
                            onChange={e => setSearchKeyword(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="例: ボーカロイド、楽曲名など"
                            onKeyPress={e => e.key === 'Enter' && handleSearch()}
                            InputProps={{
                                endAdornment: searchKeyword ? (
                                    <IconButton
                                        aria-label="clear search"
                                        onClick={() => setSearchKeyword('')}
                                        edge="end"
                                        size="small"
                                    >
                                        <ClearIcon />
                                    </IconButton>
                                ) : null,
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSearch}
                            disabled={isSearching || !searchKeyword.trim()}
                            startIcon={isSearching ? <CircularProgress size={16} /> : null}
                            sx={{ minWidth: 100 }}
                        >
                            {isSearching ? "検索中..." : "検索"}
                        </Button>
                    </Box>

                    {/* Search error */}
                    {searchError && (
                        <Box sx={{ color: 'error.main', fontSize: '0.875rem', mb: 2 }}>
                            {searchError}
                        </Box>
                    )}
                    
                    {/* Search results */}
                    {searchResults.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                検索結果
                            </Typography>
                            <List sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                                {searchResults.map((result) => (
                                    <Box key={result.contentId} sx={{ display: 'flex', alignItems: 'center' }}>
                                        <ListItem disablePadding sx={{ flex: 1 }}>
                                            <ListItemButton onClick={() => handleSelectResult(result)}>
                                                <ListItemText
                                                    primary={result.title}
                                                    secondary={
                                                        <Typography variant="caption" display="block">
                                                            ID: {result.contentId}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            sx={{ ml: 1 }}
                                            onClick={() => handleAdd(result)}
                                            disabled={registeredMusicIds.includes(result.contentId)}
                                        >
                                            追加
                                        </Button>
                                    </Box>
                                ))}
                            </List>
                        </Box>
                    )}
                </Box>

                {infoError && (
                    <Box sx={{ color: 'error.main', fontSize: '0.875rem', mt: 1 }}>
                        {infoError}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>キャンセル</Button>
            </DialogActions>
        </Dialog>
    );
}
