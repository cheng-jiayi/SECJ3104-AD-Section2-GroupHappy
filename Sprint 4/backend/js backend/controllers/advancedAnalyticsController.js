const AdvancedAnalyticsModel = require('../models/advancedAnalyticsModel');

class AdvancedAnalyticsController {
  // UC29: Predict Recycling Trends
  static async getRecyclingTrends(req, res) {
    try {
      const { faculty, months } = req.query;
      const parsedMonths = parseInt(months) || 6;
      const trends = await AdvancedAnalyticsModel.getRecyclingTrends(faculty, parsedMonths);
      
      res.status(200).json({
        success: true,
        data: trends,
        message: 'Recycling trends retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recycling trends',
        error: error.message
      });
    }
  }

  static async predictTrends(req, res) {
    try {
      const { faculty } = req.params;
      if (!faculty) {
        return res.status(400).json({
          success: false,
          message: 'Faculty parameter is required'
        });
      }

      const prediction = await AdvancedAnalyticsModel.predictNextMonthTrends(faculty);

      const safePrediction = prediction || {
        faculty,
        current_month: new Date().toISOString().slice(0, 7),
        predicted_month: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7),
        last_month_actual: 0,
        three_month_average: 0,
        predicted_points_next_month: 0,
        trend_analysis: 'No data available'
      };

      res.status(200).json({
        success: true,
        data: safePrediction,
        message: prediction 
          ? 'Trend prediction generated successfully'
          : 'No historical data available for this faculty'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate trend prediction',
        error: error.message
      });
    }
  }

  static async getMaterialTrends(req, res) {
    try {
      const { months } = req.query;
      const parsedMonths = parseInt(months) || 6;
      const trends = await AdvancedAnalyticsModel.getMaterialTrends(parsedMonths);
      
      res.status(200).json({
        success: true,
        data: trends,
        message: 'Material trends retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve material trends',
        error: error.message
      });
    }
  }

  // In your AnalyticsController.js
  static async debugFacultyData(req, res) {
    try {
      const { faculty } = req.params;
      
      const query = `
        SELECT 
          s.faculty,
          COUNT(DISTINCT s.userID) AS total_students,
          COUNT(DISTINCT rt.userID) AS students_with_transactions,
          COUNT(rt.transaction_id) AS total_transactions,
          COALESCE(SUM(rt.points_earned), 0) AS total_points,
          MIN(rt.transaction_date) AS earliest_transaction,
          MAX(rt.transaction_date) AS latest_transaction
        FROM Student s
        LEFT JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON u.userID = rt.userID
        WHERE s.faculty = ?
        GROUP BY s.faculty;
      `;
      
      const [rows] = await pool.execute(query, [faculty]);
      
      res.status(200).json({
        success: true,
        data: rows[0] || {
          faculty,
          total_students: 0,
          students_with_transactions: 0,
          total_transactions: 0,
          total_points: 0,
          earliest_transaction: null,
          latest_transaction: null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch debug data',
        error: error.message
      });
    }
  }

  // UC30: Detect Low Engagement Areas
  static async getEngagementOverview(req, res) {
    try {
      const engagementData = await AdvancedAnalyticsModel.getCurrentSemesterEngagement();
      
      res.status(200).json({
        success: true,
        data: engagementData,
        message: 'Engagement overview retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve engagement overview',
        error: error.message
      });
    }
  }

  static async detectLowEngagement(req, res) {
    try {
      const lowEngagementAreas = await AdvancedAnalyticsModel.detectLowEngagementAreas();
      
      res.status(200).json({
        success: true,
        data: lowEngagementAreas,
        message: 'Low engagement areas detected successfully',
        summary: {
          total_areas: lowEngagementAreas.length,
          critical_areas: lowEngagementAreas.filter(area => area.engagement_status === 'CRITICAL').length,
          warning_areas: lowEngagementAreas.filter(area => area.engagement_status === 'WARNING').length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to detect low engagement areas',
        error: error.message
      });
    }
  }

  static async getEngagementTrends(req, res) {
    try {
      const { months } = req.query;
      const parsedMonths = parseInt(months) || 6;
      const trends = await AdvancedAnalyticsModel.getEngagementTrends(parsedMonths);
      
      res.status(200).json({
        success: true,
        data: trends,
        message: 'Engagement trends retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve engagement trends',
        error: error.message
      });
    }
  }

  static async getCampusZoneEngagement(req, res) {
    try {
      const zoneEngagement = await AdvancedAnalyticsModel.getCampusZoneEngagement();
      
      const sanitizeNumber = (value) => {
        if (value === null || value === undefined || !isFinite(value)) return 0;
        return value;
      };

      zoneEngagement.forEach(zone => {
        zone.zone_participation_rate = sanitizeNumber(zone.zone_participation_rate);
        zone.active_recyclers = sanitizeNumber(zone.active_recyclers);
        zone.total_zone_points = sanitizeNumber(zone.total_zone_points);

        if (zone.coordinates) {
          zone.coordinates = zone.coordinates.map(coord => ({
            x: sanitizeNumber(coord.x),
            y: sanitizeNumber(coord.y),
          }));
        }
      });

      res.status(200).json({
        success: true,
        data: zoneEngagement,
        message: 'Campus zone engagement retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve campus zone engagement',
        error: error.message
      });
    }
  }

  // UC31: Generate Sustainability Insights & Recommendations
  static async generateInsights(req, res) {
    try {
      let insights = await AdvancedAnalyticsModel.generateSustainabilityInsights();

      // Normalize priority_level to 'High', 'Medium', 'Low'
      insights = insights.map(i => ({
        ...i,
        priority_level: i.priority_level
          ? i.priority_level.charAt(0).toUpperCase() + i.priority_level.slice(1).toLowerCase()
          : 'Low' // default if missing
      }));

      res.status(200).json({
        success: true,
        data: insights,
        message: 'Sustainability insights generated successfully',
        summary: {
          total_insights: insights.length,
          high_priority: insights.filter(insight => insight.priority_level === 'High').length,
          medium_priority: insights.filter(insight => insight.priority_level === 'Medium').length,
          low_priority: insights.filter(insight => insight.priority_level === 'Low').length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate sustainability insights',
        error: error.message
      });
    }
  }


  static async getRecommendations(req, res) {
    try {
      const recommendations = await AdvancedAnalyticsModel.getStrategicRecommendations();
      
      res.status(200).json({
        success: true,
        data: recommendations,
        message: 'Strategic recommendations retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve strategic recommendations',
        error: error.message
      });
    }
  }

  static async getDashboardMetrics(req, res) {
    try {
      const metrics = await AdvancedAnalyticsModel.getExecutiveDashboardMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics,
        message: 'Executive dashboard metrics retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard metrics',
        error: error.message
      });
    }
  }

  static async getQuickInsights(req, res) {
    try {
      const insights = await AdvancedAnalyticsModel.getQuickInsights();
      
      res.status(200).json({
        success: true,
        data: insights,
        message: 'Quick insights retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve quick insights',
        error: error.message
      });
    }
  }

  // Combined endpoint for module dashboard
  static async getModuleDashboard(req, res) {
    try {
      const [engagementData, lowEngagementAreas, insights, metrics, quickInsights] = await Promise.all([
        AdvancedAnalyticsModel.getCurrentSemesterEngagement().catch(() => []),
        AdvancedAnalyticsModel.detectLowEngagementAreas().catch(() => []),
        AdvancedAnalyticsModel.generateSustainabilityInsights().catch(() => []),
        AdvancedAnalyticsModel.getExecutiveDashboardMetrics().catch(() => []),
        AdvancedAnalyticsModel.getQuickInsights().catch(() => [])
      ]);

      res.status(200).json({
        success: true,
        data: {
          engagement: engagementData,
          low_engagement: lowEngagementAreas,
          insights,
          metrics,
          quick_insights: quickInsights,
          timestamp: new Date().toISOString()
        },
        message: 'Module dashboard data retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve module dashboard data',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = AdvancedAnalyticsController;
