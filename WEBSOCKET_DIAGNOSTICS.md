# WebSocket Connection Diagnostics

## The server is running fine! Let's diagnose the frontend connection issue.

### Step 1: Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab for WebSocket errors.

Look for messages like:
- "WebSocket connection closed: [code] [reason]"
- "WebSocket error: [error]"
- Any red error messages related to WebSocket

### Step 2: Check Network Tab

1. Open Developer Tools → Network tab
2. Filter by "WS" (WebSocket)
3. Refresh the page
4. Look for the WebSocket connection to `ws://localhost:8500/ws/trigger`
5. Click on it to see:
   - Connection status (Pending, Open, Closed)
   - Messages sent/received
   - Close code and reason

### Step 3: Common Issues & Fixes

#### Issue: Connection closes immediately with code 1006
**Cause**: Server crashed or network error
**Fix**: Check server logs in `/tmp/ws_test.log`

#### Issue: Connection closes with code 1000
**Cause**: Normal closure (server or client initiated)
**Fix**: Check if there's an error in message handling

#### Issue: Connection closes with code 1002
**Cause**: Protocol error
**Fix**: Check if message format is correct

#### Issue: CORS or Origin errors
**Cause**: Browser security policy
**Fix**: Check server allows your origin

### Step 4: Test WebSocket Manually

Open browser console and run:

```javascript
// Test basic connection
const ws = new WebSocket('ws://localhost:8500/ws/trigger');

ws.onopen = () => {
    console.log('✓ WebSocket connected!');
    // Send ping
    ws.send(JSON.stringify({type: 'ping'}));
};

ws.onmessage = (event) => {
    console.log('✓ Received:', event.data);
};

ws.onerror = (error) => {
    console.error('✗ WebSocket error:', error);
};

ws.onclose = (event) => {
    console.log('✗ WebSocket closed:', event.code, event.reason);
};
```

### Step 5: Check for Specific Errors

If you see any of these in console, let me know:

1. **"TypeError: Cannot read property 'X' of undefined"**
   - There might be an issue with the sync_websocket_managers function

2. **"Connection refused"**
   - Server isn't running on port 8500

3. **"Invalid frame header" or "Protocol error"**
   - Message format issue

4. **Connection works but logs missing**
   - The /api/workflow-updates endpoint might have an issue

### Step 6: Verify Server is Running

Run this in terminal:
```bash
curl http://localhost:8500/health
```

Should return JSON with status "healthy"

### What Error Are You Seeing?

Please share:
1. The exact error message from browser console
2. The WebSocket close code (from Network tab)
3. Any Python errors from server logs

This will help me identify the exact issue!
