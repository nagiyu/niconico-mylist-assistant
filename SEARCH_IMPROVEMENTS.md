# Search Functionality Improvements

## Issue Fixed
- **Problem**: Niconico video search was returning "no results found" for any input
- **Root Cause**: Niconico changed their HTML structure, making the existing CSS selectors obsolete
- **Solution**: Enhanced search logic with multiple extraction strategies and comprehensive error logging

## Key Improvements

### 1. Enhanced Search API (`/api/music/search`)

#### Multiple Extraction Strategies
The improved search now uses multiple approaches to extract video IDs:

1. **Modern CSS Selectors**: Updated selectors for current web patterns
   - `[data-content-id]`, `[data-video]`
   - `.searchResultItems li`, `.searchItem`, `.videoListItem`
   - Generic patterns: `.item`, `.result`, `.card`

2. **JSON Data Extraction**: Extracts video IDs from embedded JavaScript/JSON
   - Searches for `"contentId": "sm12345678"` patterns
   - Handles various JSON property names

3. **Enhanced Regex Patterns**: Multiple fallback patterns
   - Data attributes: `data-*="sm12345678"`
   - URL patterns: `/watch/sm12345678`
   - JSON patterns: `"contentId": "sm12345678"`
   - General patterns: Any video ID format

4. **Page Analysis**: Diagnostic information to understand page structure
   - Checks for common indicators (nicovideo, search terms, JavaScript)
   - Identifies potential blocking or error pages

#### Improved Error Handling
- **Timeout Protection**: 15-second timeout prevents hanging requests
- **Enhanced HTTP Headers**: Better compatibility with Niconico's servers
- **Detailed Error Messages**: Specific HTTP status codes and error descriptions
- **Debug Information**: Failed searches include extraction attempt details

### 2. Enhanced Video Info API (`/api/music/utils/videoInfo`)

#### Better Input Validation
- Video ID format validation before API calls
- Prevents unnecessary requests for invalid IDs

#### Improved Error Handling
- **Timeout Protection**: 10-second timeout for API requests
- **Better Error Parsing**: Extracts specific error messages from XML responses
- **Enhanced Logging**: Detailed operation tracking

### 3. Comprehensive Logging

All operations now include detailed logging with component prefixes:

#### Search Operations
```
[SEARCH] Starting search for keyword: "ボーカロイド"
[SEARCH] Fetching URL: https://www.nicovideo.jp/search/...
[SEARCH] Video ID extraction completed. Found 3 unique video IDs
[SEARCH] Successfully got info for sm12345678: "Video Title"
```

#### Video Info Operations
```
[VIDEO_INFO] Fetching info for sm12345678 from API
[VIDEO_INFO] Response for sm12345678: 200 OK
[VIDEO_INFO] Successfully extracted title: "Video Title"
[VIDEO_INFO] API error for sm99999999: NOT_FOUND
```

## Troubleshooting Guide

### If Search Still Fails

1. **Check Server Logs**: Look for `[SEARCH]` prefixed messages to see what extraction methods were attempted

2. **Analyze Debug Information**: Failed search responses include:
   ```json
   {
     "status": "failure",
     "message": "検索結果からビデオIDを抽出できませんでした",
     "debug": {
       "strategies": {
         "cssSelectors": { "selector": "count" },
         "jsonExtraction": { "scriptTagsChecked": 5 },
         "regexPatterns": { "pattern_0": 0 }
       },
       "htmlLength": 12345,
       "htmlSnippet": "..."
     }
   }
   ```

3. **Common Issues**:
   - **Network blocking**: Check if requests to nicovideo.jp are allowed
   - **Changed HTML structure**: Debug info shows what selectors were tried
   - **Rate limiting**: Niconico may be blocking requests

### Log Analysis

Use these commands to filter logs:

```bash
# Search-related logs only
grep "\[SEARCH\]" logs/application.log

# Video info logs only  
grep "\[VIDEO_INFO\]" logs/application.log

# Error logs only
grep "ERROR\|WARN" logs/application.log | grep "\[SEARCH\]\|\[VIDEO_INFO\]"
```

### Testing Extraction Logic

The improved extraction logic has been tested with various HTML structures:

- ✅ Modern structure with `data-content-id` attributes
- ✅ Legacy structure with `data-video-id` attributes  
- ✅ Minimal structure with only watch links
- ✅ Regex-only extraction from embedded content
- ❌ Properly handles broken/empty pages

## Future Maintenance

### When Niconico Changes Structure Again

1. **Check the logs** for extraction attempt details
2. **Add new CSS selectors** to the `modernSelectors` array
3. **Update regex patterns** if needed for new formats
4. **Test with different keywords** to ensure broad compatibility

### Monitoring

Set up alerts for:
- High frequency of search failures
- Specific error patterns in logs
- Changes in average response times

## Technical Details

### Files Modified
- `/manager/app/api/music/search/route.ts` - Enhanced search API
- `/manager/app/api/music/utils/videoInfo.ts` - Improved video info utility

### Dependencies
- No new dependencies added
- Uses existing `cheerio` for HTML parsing
- Compatible with existing authentication system

### Performance Impact
- Minimal performance impact
- Additional extraction attempts only run if primary methods fail
- Timeout protections prevent hanging requests