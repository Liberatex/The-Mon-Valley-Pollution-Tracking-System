const winston = require('winston');
const { performance } = require('perf_hooks');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mv-pollution-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Analytics tracking
class Analytics {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTimes: [],
      ollamaRequests: 0,
      ollamaErrors: 0,
      activeUsers: new Set(),
      features: {
        chat: 0,
        health: 0,
        ollamaTest: 0
      }
    };
    this.startTime = Date.now();
  }

  trackRequest(endpoint, method, responseTime, statusCode) {
    this.metrics.requests++;
    this.metrics.responseTimes.push(responseTime);
    
    if (statusCode >= 400) {
      this.metrics.errors++;
    }

    if (endpoint === '/api/llama3-chat') {
      this.metrics.features.chat++;
    } else if (endpoint === '/api/health') {
      this.metrics.features.health++;
    } else if (endpoint === '/api/ollama-test') {
      this.metrics.features.ollamaTest++;
    }

    logger.info('Request tracked', {
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }

  trackOllamaRequest(success, responseTime) {
    this.metrics.ollamaRequests++;
    if (!success) {
      this.metrics.ollamaErrors++;
    }
  }

  trackUser(userId) {
    this.metrics.activeUsers.add(userId);
  }

  getMetrics() {
    const avgResponseTime = this.metrics.responseTimes.length > 0 
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length 
      : 0;

    return {
      uptime: Date.now() - this.startTime,
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
      avgResponseTime: avgResponseTime.toFixed(2),
      ollamaRequests: this.metrics.ollamaRequests,
      ollamaErrors: this.metrics.ollamaErrors,
      ollamaSuccessRate: this.metrics.ollamaRequests > 0 
        ? ((this.metrics.ollamaRequests - this.metrics.ollamaErrors) / this.metrics.ollamaRequests * 100).toFixed(2) 
        : 0,
      activeUsers: this.metrics.activeUsers.size,
      features: this.metrics.features
    };
  }
}

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    analytics.trackRequest(req.path, req.method, duration, res.statusCode);
  });
  
  next();
};

// Error tracking middleware
const errorTrackingMiddleware = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
};

// Health check with detailed metrics
const healthCheck = (req, res) => {
  const metrics = analytics.getMetrics();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: metrics.uptime,
    services: {
      backend: 'running',
      ollama: metrics.ollamaSuccessRate > 90 ? 'healthy' : 'degraded',
      database: 'connected'
    },
    metrics: {
      requests: metrics.requests,
      errorRate: `${metrics.errorRate}%`,
      avgResponseTime: `${metrics.avgResponseTime}ms`,
      ollamaSuccessRate: `${metrics.ollamaSuccessRate}%`,
      activeUsers: metrics.activeUsers
    }
  };
  
  res.json(health);
};

// Initialize analytics
const analytics = new Analytics();

module.exports = {
  logger,
  analytics,
  performanceMiddleware,
  errorTrackingMiddleware,
  healthCheck
}; 