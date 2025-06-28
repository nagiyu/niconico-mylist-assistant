# Auto Get Information Feature - Testing Guide

## Feature Overview
The Auto Get Information feature adds an "Info" button to the add/edit dialog that automatically fetches video title from Niconico's API and populates the title field.

## Implementation Details

### API Endpoint
- **URL**: `/api/music/info`
- **Method**: GET
- **Parameter**: `video_id` (query parameter)
- **Authentication**: Requires Google OAuth session

### UI Changes
- Added "Info" button between "キャンセル" and "保存" buttons in EditDialog
- Button shows loading state with circular progress indicator
- Error messages are displayed below the title field
- Button is disabled when no music_id is entered

## How to Test

1. **Login**: Navigate to the application and login with Google OAuth
2. **Open Dialog**: Click the "追加" (Add) button to open the EditDialog
3. **Enter Video ID**: Input a valid Niconico video ID (e.g., "sm9", "sm40")
4. **Click Info**: Click the "Info" button to fetch video information
5. **Verify**: Check that the title field is automatically populated

## Expected Behavior

### Success Case
- Loading indicator appears on Info button
- Title field is automatically populated with the video title
- Any existing title validation error is cleared
- Success message could be added in future versions

### Error Cases
- **Empty ID**: "IDを入力してください" error message
- **Invalid Video**: "ERROR: Not Found or Invalid video ID." error message  
- **Network Error**: "情報の取得中にエラーが発生しました" error message

## API Response Format

### Success Response
```json
{
  "status": "success",
  "video_id": "sm9",
  "title": "動画のタイトル"
}
```

### Error Response
```json
{
  "status": "failure", 
  "message": "ERROR: Not Found or Invalid video ID."
}
```

## Technical Notes

- XML parsing supports both CDATA and simple title formats
- Server-side API avoids CORS issues
- Follows the same authentication pattern as other API endpoints
- Error handling covers network, parsing, and validation errors

## Files Modified
- `manager/app/api/music/info/route.ts` - New API endpoint
- `manager/app/components/dialog/EditDialog.tsx` - Added Info button and functionality