const express = require('express');
const router = express.Router();
const AdvancedAnalyticsController = require('../controllers/advancedAnalyticsController');

// Simple test endpoint (add this first)
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Module 3 API is working',
    timestamp: new Date().toISOString()
  });
});

// UC29: Predict Recycling Trends
router.get('/trends', AdvancedAnalyticsController.getRecyclingTrends);
router.get('/trends/predict/:faculty', AdvancedAnalyticsController.predictTrends);
router.get('/trends/materials', AdvancedAnalyticsController.getMaterialTrends);

// UC30: Detect Low Engagement Areas
router.get('/engagement', AdvancedAnalyticsController.getEngagementOverview);
router.get('/engagement/low-engagement', AdvancedAnalyticsController.detectLowEngagement);
router.get('/engagement/trends', AdvancedAnalyticsController.getEngagementTrends);
router.get('/engagement/zones', AdvancedAnalyticsController.getCampusZoneEngagement);

// UC31: Generate Sustainability Insights & Recommendations
router.get('/insights', AdvancedAnalyticsController.generateInsights);
router.get('/recommendations', AdvancedAnalyticsController.getRecommendations);
router.get('/dashboard-metrics', AdvancedAnalyticsController.getDashboardMetrics);
router.get('/quick-insights', AdvancedAnalyticsController.getQuickInsights);

// Combined dashboard endpoint
router.get('/dashboard', AdvancedAnalyticsController.getModuleDashboard);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Module 3 Advanced Analytics API'
  });
});

module.exports = router;