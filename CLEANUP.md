# Image Cleanup System

The calibration app includes a comprehensive cleanup system to prevent uploaded images from accumulating over time.

## Automatic Cleanup

### 1. **Frontend: Reset Images Button**
When users click the "Reset Images" or "Clear All" buttons:
- All uploaded images are cleared from the UI
- A DELETE request is sent to the backend to remove the session
- Physical files and database records are deleted immediately

### 2. **Backend: Automatic Background Cleanup**
The backend runs automatic cleanup tasks:
- **On Startup**: Cleans up sessions older than 24 hours
- **Every Hour**: Runs scheduled cleanup automatically
- **Orphaned Files**: Removes directories without database entries

### 3. **Session Age-Based Cleanup**
Sessions are automatically deleted after 24 hours to prevent accumulation:
- Database records are removed
- Physical upload directories are deleted
- All associated calibration results are cleaned up

## Manual Cleanup

### Method 1: API Endpoint
Trigger cleanup via API:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/upload/cleanup?hours_old=24
```

Parameters:
- `hours_old`: Delete sessions older than this many hours (default: 24)

### Method 2: Python Script
Run the cleanup script directly:
```bash
cd /Users/nicolainielsen/calibrator-app
python -m backend.cleanup_script --hours 24
```

Options:
- `--hours HOURS`: Delete sessions older than specified hours

### Method 3: Visit API Docs
Navigate to http://127.0.0.1:8000/docs and use the `/api/v1/upload/cleanup` endpoint.

## What Gets Cleaned Up

1. **Database Records**:
   - Session records
   - Calibration images metadata
   - Calibration results
   - Calibration parameters

2. **Physical Files**:
   - Upload directories (e.g., `uploads/session-id/`)
   - All images within session directories
   - Orphaned directories without database entries

## Cleanup Strategy

The system uses multiple strategies to ensure no files accumulate:

1. **User-Initiated**: When users reset images (immediate)
2. **Time-Based**: Sessions older than 24 hours (automatic)
3. **Orphaned Files**: Directories without database records (automatic)
4. **On-Demand**: Manual trigger via API or script (as needed)

## Configuration

To change the cleanup interval or age threshold, modify:

**Automatic Cleanup Interval** (`backend/main.py`):
```python
time.sleep(1 * 60 * 60)  # Change 1 to desired hours
```

**Session Age Threshold** (`backend/main.py`):
```python
cleanup_old_sessions(hours_old=24)  # Change 24 to desired hours
```

## Monitoring

Check backend logs to see cleanup activity:
```
Running initial cleanup on startup...
Cleanup completed: Deleted 5 old sessions
Orphaned file cleanup completed: Deleted 2 directories
Background cleanup task started (runs every hour)
```

## Best Practices

1. **Let automatic cleanup handle most cases** - The system is configured to prevent accumulation
2. **Use manual cleanup after bulk testing** - If you upload many test sessions
3. **Monitor disk space** - Check `uploads/` directory size periodically
4. **Adjust thresholds if needed** - Based on your usage patterns
