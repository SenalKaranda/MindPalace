/**
 * Client-side performance monitoring utility
 * Helps diagnose whether slowdowns are server-side or client-side
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: null,
      apiCalls: [],
      renderTime: null,
      bundleLoadTime: null
    };
    this.enabled = process.env.NODE_ENV === 'development' || localStorage.getItem('perfMonitor') === 'true';
  }

  /**
   * Measure page load time
   */
  measurePageLoad() {
    if (!this.enabled) return;

    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        this.metrics.pageLoad = {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          totalTime: perfData.loadEventEnd - perfData.fetchStart,
          dns: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp: perfData.connectEnd - perfData.connectStart,
          request: perfData.responseStart - perfData.requestStart,
          response: perfData.responseEnd - perfData.responseStart,
          domProcessing: perfData.domComplete - perfData.domInteractive
        };

        console.group('🚀 Page Load Performance');
        console.log('Total Load Time:', this.metrics.pageLoad.totalTime.toFixed(2), 'ms');
        console.log('DNS Lookup:', this.metrics.pageLoad.dns.toFixed(2), 'ms');
        console.log('TCP Connection:', this.metrics.pageLoad.tcp.toFixed(2), 'ms');
        console.log('Request Time:', this.metrics.pageLoad.request.toFixed(2), 'ms');
        console.log('Response Time:', this.metrics.pageLoad.response.toFixed(2), 'ms');
        console.log('DOM Processing:', this.metrics.pageLoad.domProcessing.toFixed(2), 'ms');
        console.log('DOM Content Loaded:', this.metrics.pageLoad.domContentLoaded.toFixed(2), 'ms');
        console.groupEnd();
      }
    });
  }

  /**
   * Monitor API call performance
   */
  monitorApiCall(url, method = 'GET') {
    if (!this.enabled) return { start: () => {}, end: () => {} };

    const startTime = performance.now();
    const apiCall = {
      url,
      method,
      startTime,
      endTime: null,
      duration: null,
      serverTime: null,
      size: null
    };

    return {
      start: () => {
        apiCall.startTime = performance.now();
      },
      end: (response) => {
        apiCall.endTime = performance.now();
        apiCall.duration = apiCall.endTime - apiCall.startTime;
        
        // Get server response time from header if available
        if (response?.headers) {
          const serverTime = response.headers['x-response-time'];
          if (serverTime) {
            apiCall.serverTime = parseInt(serverTime.replace('ms', ''));
          }
        }

        // Calculate network vs server time
        if (apiCall.serverTime) {
          const networkTime = apiCall.duration - apiCall.serverTime;
          console.log(`[API] ${method} ${url}`);
          console.log(`  Total: ${apiCall.duration.toFixed(2)}ms | Server: ${apiCall.serverTime}ms | Network: ${networkTime.toFixed(2)}ms`);
          
          if (apiCall.duration > 500) {
            console.warn(`  ⚠️ Slow API call detected!`);
            if (apiCall.serverTime > 300) {
              console.warn(`  🔴 Server-side bottleneck (${apiCall.serverTime}ms)`);
            } else if (networkTime > 200) {
              console.warn(`  🟡 Network bottleneck (${networkTime.toFixed(2)}ms)`);
            }
          }
        } else {
          console.log(`[API] ${method} ${url} - ${apiCall.duration.toFixed(2)}ms`);
        }

        this.metrics.apiCalls.push(apiCall);
        return apiCall;
      }
    };
  }

  /**
   * Measure React render time
   */
  measureRender(componentName) {
    if (!this.enabled) return { start: () => {}, end: () => {} };

    const startTime = performance.now();
    return {
      start: () => {
        // Already started
      },
      end: () => {
        const duration = performance.now() - startTime;
        if (duration > 100) {
          console.warn(`[RENDER] ${componentName} took ${duration.toFixed(2)}ms - Consider optimization`);
        }
        return duration;
      }
    };
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (!this.enabled) return null;

    const summary = {
      pageLoad: this.metrics.pageLoad,
      apiCalls: {
        total: this.metrics.apiCalls.length,
        average: this.metrics.apiCalls.length > 0
          ? this.metrics.apiCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / this.metrics.apiCalls.length
          : 0,
        slowest: this.metrics.apiCalls.length > 0
          ? this.metrics.apiCalls.reduce((max, call) => (call.duration || 0) > (max.duration || 0) ? call : max, this.metrics.apiCalls[0])
          : null
      }
    };

    console.group('📊 Performance Summary');
    if (summary.pageLoad) {
      console.log('Page Load:', summary.pageLoad.totalTime.toFixed(2), 'ms');
    }
    console.log('API Calls:', summary.apiCalls.total);
    console.log('Average API Time:', summary.apiCalls.average.toFixed(2), 'ms');
    if (summary.apiCalls.slowest) {
      console.log('Slowest API:', summary.apiCalls.slowest.url, '-', summary.apiCalls.slowest.duration.toFixed(2), 'ms');
    }
    console.groupEnd();

    return summary;
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('perfMonitor', enabled ? 'true' : 'false');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start page load monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.measurePageLoad();
}

export default PerformanceMonitor;
