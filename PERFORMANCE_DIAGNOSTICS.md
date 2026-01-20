# Performance Diagnostics Guide

This guide helps you determine whether performance issues are server-side or client-side.

## Quick Diagnosis Methods

### 1. Browser DevTools Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Refresh the page (Ctrl+R or Cmd+R)
4. Look for these key metrics:

#### What to Check:

**Server Response Time (TTFB - Time To First Byte):**
- **Good**: < 100ms for localhost
- **Warning**: 100-500ms
- **Problem**: > 500ms (server-side issue)

**Content Download Time:**
- **Good**: < 50ms for localhost
- **Warning**: 50-200ms
- **Problem**: > 200ms (network/client issue)

**Total Request Time:**
- Check the **Timing** column or hover over the request bar
- Breakdown shows:
  - **Queued**: Time waiting (usually 0ms)
  - **DNS**: DNS lookup (should be 0ms for localhost)
  - **Initial connection**: TCP handshake (should be < 5ms for localhost)
  - **SSL**: TLS negotiation (N/A for HTTP)
  - **Request sent**: Time to send request (usually < 1ms)
  - **Waiting (TTFB)**: **Server response time** - This is key!
  - **Content Download**: Time to download response

#### Interpreting Results:

- **If TTFB is high (> 200ms)**: Server-side bottleneck
  - Check server logs for slow database queries
  - Check server CPU/memory usage
  - Look for blocking operations

- **If Content Download is high**: Client-side or network issue
  - Large response payloads
  - Slow network connection
  - Browser processing time

### 2. Browser Console Performance Logs

The app now includes automatic performance monitoring. Check the browser console for:

```
🚀 Page Load Performance
  Total Load Time: XXXms
  DNS Lookup: XXXms
  TCP Connection: XXXms
  Request Time: XXXms
  Response Time: XXXms
  DOM Processing: XXXms

[API] GET /api/settings
  Total: XXXms | Server: XXXms | Network: XXXms
```

#### Interpreting API Logs:

- **Server time > 300ms**: Server-side bottleneck (🔴)
- **Network time > 200ms**: Network/client-side issue (🟡)
- **Total time > 500ms**: Overall slow request (⚠️)

### 3. Server Logs

Check your server console for performance logs:

```
[PERF] GET /api/settings - 200 - 45ms
[PERF] GET /api/chores - 200 - 234ms - 12.34KB - SLOW
```

- **< 100ms**: Fast response
- **100-500ms**: Acceptable
- **> 500ms**: Slow (marked as SLOW in logs)

## Common Issues and Fixes

### Server-Side Issues

**Symptoms:**
- High TTFB in Network tab
- High server time in API logs
- Server logs show SLOW requests

**Fixes:**

1. **Database Query Optimization**
   - Add indexes to frequently queried columns
   - Use prepared statements (already done)
   - Batch queries where possible

2. **Response Caching**
   - API responses are now cached client-side
   - Consider server-side caching for static data

3. **Async Operations**
   - Ensure all I/O operations are async
   - Don't block the event loop

### Client-Side Issues

**Symptoms:**
- High Content Download time
- Long main thread tasks in Performance tab
- Slow React rendering

**Fixes:**

1. **Code Splitting** (Already implemented)
   - Widgets are lazy-loaded
   - Only enabled widgets are loaded

2. **API Caching** (Already implemented)
   - Responses cached for 5 minutes
   - Reduces redundant requests

3. **Bundle Size**
   - Check bundle size in Network tab
   - Large bundles (> 1MB) slow down parsing

### Network Issues (Localhost)

**Symptoms:**
- High DNS/TCP times (unusual for localhost)
- Connection timeouts
- Intermittent failures

**Fixes:**

1. **Use 127.0.0.1 instead of localhost**
   - Update `.env` file: `VITE_REACT_APP_API_URL=http://127.0.0.1:5001`
   - Faster DNS resolution

2. **Check Firewall/Antivirus**
   - May be blocking localhost connections
   - Add exception for localhost:5001

3. **Browser Extensions**
   - Disable extensions that might interfere
   - Try incognito mode

## Performance Targets

### Localhost (Development)
- **Page Load**: < 2 seconds
- **API Response**: < 100ms
- **Time to Interactive**: < 3 seconds

### Production
- **Page Load**: < 3 seconds
- **API Response**: < 200ms
- **Time to Interactive**: < 5 seconds

## Enabling Performance Monitoring

Performance monitoring is enabled by default in development. To enable in production:

```javascript
// In browser console:
localStorage.setItem('perfMonitor', 'true');
location.reload();
```

To disable:
```javascript
localStorage.setItem('perfMonitor', 'false');
location.reload();
```

## Quick Test Script

Run this in browser console after a refresh to get a detailed breakdown:

```javascript
// Get all API calls from Network tab
const apiCalls = performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/api/'))
  .map(r => ({
    url: r.name.split('/api/')[1] || r.name,
    total: r.duration.toFixed(2) + 'ms',
    ttfb: (r.responseStart - r.requestStart).toFixed(2) + 'ms',
    download: (r.responseEnd - r.responseStart).toFixed(2) + 'ms',
    size: (r.transferSize / 1024).toFixed(2) + 'KB'
  }));

console.table(apiCalls);

// Get page load breakdown
const nav = performance.getEntriesByType('navigation')[0];
if (nav) {
  console.group('📊 Page Load Breakdown');
  console.log('DNS:', (nav.domainLookupEnd - nav.domainLookupStart).toFixed(2), 'ms');
  console.log('TCP:', (nav.connectEnd - nav.connectStart).toFixed(2), 'ms');
  console.log('Request:', (nav.responseStart - nav.requestStart).toFixed(2), 'ms');
  console.log('Response (TTFB):', (nav.responseStart - nav.requestStart).toFixed(2), 'ms');
  console.log('Download:', (nav.responseEnd - nav.responseStart).toFixed(2), 'ms');
  console.log('Total:', (nav.loadEventEnd - nav.fetchStart).toFixed(2), 'ms');
  console.groupEnd();
}
```

## Expected Values for Localhost

- **DNS lookup**: 0ms
- **TCP connection**: < 5ms
- **TTFB**: < 100ms
- **Content download**: < 50ms
- **Total API call**: < 150ms

## Interpreting Results

- **If TTFB is high (> 200ms)**: Server-side bottleneck
  - Check server console for `[PERF]` logs
  - Look for slow database queries
  - Check server resource usage

- **If download/render is high**: Client-side issue
  - Check bundle sizes
  - Look for large API responses
  - Check React rendering performance

- **If DNS/TCP is high**: Network/OS issue
  - Try using `127.0.0.1` instead of `localhost`
  - Check firewall/antivirus settings
  - Test in different browser
