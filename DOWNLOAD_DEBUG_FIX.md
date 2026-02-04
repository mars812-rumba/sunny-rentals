# 🔧 Download Format Issue Fix

## Problem
Files download as `*.jpg.js` instead of proper images, even though they upload correctly to backend.

## Root Cause Analysis
The issue is likely in:
1. **URL encoding inconsistencies** between frontend and backend
2. **File path handling** in the download endpoint
3. **MIME type detection** issues
4. **Filename manipulation** during download

## Fixes Applied

### ✅ 1. Consistent URL Encoding
- Fixed inconsistent `encodeURIComponent` usage
- Now both userDocuments and chat media use the same encoding

### ✅ 2. Enhanced Debug Logging
- Added comprehensive logging for both frontend and backend
- Will show exact filename, URL, and download attempts

### ✅ 3. Backend Path Debugging
- Added detailed path checking in backend
- Will show which files exist and which are being served

## Expected Debug Output

**Frontend Console:**
```
📁 [DEBUG] Document 1: {
  originalFilename: "photo_20260204_055549.jpg",
  encodedFilename: "photo_20260204_055549.jpg",
  downloadUrl: "/api/crm/media/374897465/download/photo_20260204_055549.jpg",
  contentType: "image/jpeg"
}
```

**Backend Console:**
```
📥 [DEBUG] Download request: user_id=374897465, filename=photo_20260204_055549.jpg
🔍 [DEBUG] Checking paths: backend/data/media/374897465/photo_20260204_055549.jpg exists: false
🔍 [DEBUG] Checking paths: backend/data/media/374897465/incoming/photo_20260204_055549.jpg exists: true
📤 [DEBUG] Serving file: backend/data/media/374897465/incoming/photo_20260204_055549.jpg, mime_type: image/jpeg
```

## Testing Steps

1. **Select a user with media files**
2. **Open browser console** (F12)
3. **Go to Info tab** to see Documents section
4. **Click download button** on any document
5. **Check console logs** for detailed debug information
6. **Verify downloaded file** has correct extension

## If Issue Persists

The issue might be:
1. **Browser caching** - try hard refresh (Ctrl+Shift+R)
2. **File path mismatch** - check if backend paths exist
3. **MIME type confusion** - check if content-type headers are correct
4. **URL encoding** - check if special characters in filenames

## Next Steps

Run the application and check the debug logs. The comprehensive logging will show exactly:
- What filename is being requested
- What files exist on backend
- What MIME type is being served
- What URL is being constructed

This will pinpoint the exact cause of the `*.jpg.js` download issue.