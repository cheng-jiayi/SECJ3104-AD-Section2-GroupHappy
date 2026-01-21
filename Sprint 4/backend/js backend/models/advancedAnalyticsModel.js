const { pool } = require('../config/database');

class AdvancedAnalyticsModel {
  // UC29: Predict Recycling Trends
   static async getRecyclingTrends(faculty = null, months = 6) {
  const query = `
    SELECT 
      DATE_FORMAT(rt.transaction_date, '%Y-%m') as month_year,
      s.faculty,
      COUNT(DISTINCT CASE 
                      WHEN rt.transaction_date >= DATE_SUB(LAST_DAY(DATE_SUB(CURDATE(), INTERVAL ? MONTH)) + INTERVAL 1 DAY, INTERVAL 0 MONTH) 
                      THEN rt.userID 
                    END) as unique_users,
      COUNT(*) as total_transactions,
      SUM(rt.points_earned) as total_points,
      ROUND(SUM(rt.quantity), 2) as total_kg,
      ROUND(AVG(rt.points_earned), 2) as avg_points_per_transaction
    FROM recycling_transactions rt
    JOIN User u ON rt.userID = u.userID
    JOIN Student s ON u.userID = s.userID
    WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    ${faculty ? 'AND s.faculty = ?' : ''}
    GROUP BY DATE_FORMAT(rt.transaction_date, '%Y-%m'), s.faculty
    ORDER BY month_year DESC, s.faculty
  `;

  const params = faculty ? [months, months, faculty] : [months, months];
  const [rows] = await pool.execute(query, params);

  return rows.map(r => ({
    ...r,
    unique_users: Number(r.unique_users) || 0,
    total_transactions: Number(r.total_transactions) || 0,
    total_points: Number(r.total_points) || 0,
    total_kg: Number(r.total_kg) || 0,
    avg_points_per_transaction: Number(r.avg_points_per_transaction) || 0,
  }));
}



 static async predictNextMonthTrends(faculty) {
  const query = `
    WITH RECURSIVE last6months AS (
      -- Generate last 6 completed months (exclude current month)
      SELECT 1 AS seq, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m') AS month_year
      UNION ALL
      SELECT seq + 1, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq + 1 MONTH), '%Y-%m')
      FROM last6months
      WHERE seq < 6
    ),
    MonthlyData AS (
      SELECT 
        ? AS faculty,
        l.month_year,
        COALESCE(SUM(rt.points_earned), 0) AS total_points
      FROM last6months l
      LEFT JOIN Student s ON s.faculty = ?
      LEFT JOIN User u ON s.userID = u.userID
      LEFT JOIN recycling_transactions rt 
        ON u.userID = rt.userID 
        AND DATE_FORMAT(rt.transaction_date, '%Y-%m') = l.month_year
      GROUP BY l.month_year
      ORDER BY l.month_year DESC
    ),
    Aggregated AS (
      SELECT 
        faculty,
        MAX(total_points) AS last_month_points,
        ROUND(AVG(total_points) ,2) AS three_month_avg
      FROM (
        SELECT * FROM MonthlyData ORDER BY month_year DESC LIMIT 3
      ) last3
      GROUP BY faculty
    )
    SELECT 
      faculty,
      DATE_FORMAT(CURDATE(), '%Y-%m') AS current_month,
      DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y-%m') AS predicted_month,
      COALESCE(last_month_points, 0) AS last_month_actual,
      COALESCE(three_month_avg, 0) AS three_month_average,
      ROUND(COALESCE(last_month_points * 0.7 + three_month_avg * 0.3, three_month_avg), 2) AS predicted_points_next_month,
      CASE 
          WHEN COALESCE(last_month_points, three_month_avg) >= three_month_avg * 1.2 THEN 'High Growth Expected'
          WHEN COALESCE(last_month_points, three_month_avg) >= three_month_avg * 1.05 THEN 'Moderate Growth Expected'
          WHEN COALESCE(last_month_points, three_month_avg) BETWEEN three_month_avg * 0.95 AND three_month_avg * 1.05 THEN 'Stable Performance Expected'
          WHEN COALESCE(last_month_points, three_month_avg) >= three_month_avg * 0.8 THEN 'Moderate Decline Expected'
          ELSE 'Sharp Decline Expected'
      END AS trend_analysis
    FROM Aggregated;
  `;

  const [rows] = await pool.execute(query, [faculty, faculty]);

  if (!rows[0]) {
    return {
      faculty,
      current_month: new Date().toISOString().slice(0,7),
      predicted_month: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0,7),
      last_month_actual: 0,
      three_month_average: 0,
      predicted_points_next_month: 0,
      trend_analysis: 'No data available'
    };
  }

  // Ensure numeric values
  const result = rows[0];
  for (let key of ['last_month_actual', 'three_month_average', 'predicted_points_next_month']) {
    result[key] = Number(result[key]) || 0;
  }

  return result;
}


  static async debugFacultyData(faculty) {
    const debugQuery = `
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

    const [rows] = await pool.execute(debugQuery, [faculty]);
    console.log('DEBUG DATA:', rows[0]);
    return rows[0];
  }




  static async getMaterialTrends(months = 6) {
    const query = `
      SELECT 
        material_type,
        DATE_FORMAT(transaction_date, '%Y-%m') as month_year,
        COUNT(*) as transaction_count,
        SUM(points_earned) as total_points,
        ROUND(SUM(quantity), 2) as total_kg,
        ROUND(AVG(points_earned), 2) as avg_points_per_transaction,
        RANK() OVER (PARTITION BY DATE_FORMAT(transaction_date, '%Y-%m') ORDER BY SUM(points_earned) DESC) as rank_by_points
      FROM recycling_transactions
      WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY material_type, DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month_year DESC, rank_by_points
    `;
    
    const [rows] = await pool.execute(query, [months]);
    return rows;
  }

  // UC30: Detect Low Engagement Areas
  static async getCurrentSemesterEngagement() {
    const query = `
      SELECT 
        s.faculty,
        COUNT(DISTINCT s.studentID) as total_students,
        COUNT(DISTINCT rt.userID) as active_recyclers,
        ROUND((COUNT(DISTINCT rt.userID) / COUNT(DISTINCT s.studentID)) * 100, 2) as participation_rate_percent,
        COALESCE(SUM(rt.points_earned), 0) as total_points,
        COALESCE(COUNT(rt.id), 0) as total_transactions,
        ROUND(COALESCE(SUM(rt.points_earned) / NULLIF(COUNT(DISTINCT rt.userID), 0), 0), 2) as avg_points_per_active_student,
        ROUND(COALESCE(COUNT(rt.id) / NULLIF(COUNT(DISTINCT rt.userID), 0), 0), 2) as avg_transactions_per_active_student
      FROM Student s
      LEFT JOIN User u ON s.userID = u.userID
      LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
        AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY s.faculty
      ORDER BY participation_rate_percent DESC
    `;
    
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async detectLowEngagementAreas() {
    const query = `
      WITH EngagementData AS (
        SELECT 
          s.faculty,
          COUNT(DISTINCT s.studentID) as total_students,
          COUNT(DISTINCT rt.userID) as active_recyclers,
          ROUND((COUNT(DISTINCT rt.userID) / COUNT(DISTINCT s.studentID)) * 100, 2) as participation_rate,
          COALESCE(AVG(rt.points_earned), 0) as avg_points_per_active_student,
          COALESCE(COUNT(rt.id) / NULLIF(COUNT(DISTINCT rt.userID), 0), 0) as avg_transactions_per_active_student
        FROM Student s
        LEFT JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
          AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY s.faculty
      ),
      CampusAvg AS (
        SELECT 
          AVG(participation_rate) as campus_avg_participation,
          AVG(avg_points_per_active_student) as campus_avg_points,
          AVG(avg_transactions_per_active_student) as campus_avg_transactions
        FROM EngagementData
      )
      SELECT 
        ed.faculty,
        ed.total_students,
        ed.active_recyclers,
        ed.participation_rate,
        ed.avg_points_per_active_student,
        ed.avg_transactions_per_active_student,
        ca.campus_avg_participation,
        ca.campus_avg_points,
        ca.campus_avg_transactions,
        CASE 
          WHEN ed.participation_rate < ca.campus_avg_participation * 0.7 THEN 'CRITICAL'
          WHEN ed.participation_rate < ca.campus_avg_participation THEN 'WARNING'
          ELSE 'SATISFACTORY'
        END as engagement_status,
        CASE 
          WHEN ed.participation_rate < ca.campus_avg_participation * 0.7 THEN 'Immediate intervention required'
          WHEN ed.participation_rate < ca.campus_avg_participation THEN 'Needs improvement'
          ELSE 'Performing well'
        END as status_description
      FROM EngagementData ed
      CROSS JOIN CampusAvg ca
      ORDER BY 
        CASE 
          WHEN ed.participation_rate < ca.campus_avg_participation * 0.7 THEN 1
          WHEN ed.participation_rate < ca.campus_avg_participation THEN 2
          ELSE 3
        END,
        ed.participation_rate ASC
    `;
    
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async getEngagementTrends(months = 6) {
    const query = `
      WITH MonthlyEngagement AS (
        SELECT 
          s.faculty,
          DATE_FORMAT(rt.transaction_date, '%Y-%m') as month_year,
          COUNT(DISTINCT rt.userID) as monthly_active_recyclers,
          COUNT(DISTINCT s.studentID) as total_faculty_students,
          ROUND(COALESCE(COUNT(DISTINCT rt.userID) / NULLIF(COUNT(DISTINCT s.studentID), 0), 0) * 100, 2) as monthly_participation_rate,
          SUM(rt.points_earned) as monthly_points
        FROM Student s
        JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON u.userID = rt.userID
        WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
          OR rt.transaction_date IS NULL
        GROUP BY s.faculty, DATE_FORMAT(rt.transaction_date, '%Y-%m')
      )
      SELECT 
        faculty,
        month_year,
        monthly_active_recyclers,
        monthly_participation_rate,
        monthly_points,
        COALESCE(LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year), 0) as previous_month_rate,
        ROUND(monthly_participation_rate - COALESCE(LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year), 0), 2) as participation_change,
        CASE 
          WHEN monthly_participation_rate - COALESCE(LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year), 0) < -5 THEN 'DECLINING RAPIDLY'
          WHEN monthly_participation_rate - COALESCE(LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year), 0) < 0 THEN 'SLIGHT DECLINE'
          WHEN monthly_participation_rate - COALESCE(LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year), 0) > 5 THEN 'IMPROVING RAPIDLY'
          WHEN monthly_participation_rate - COALESCE(LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year), 0) > 0 THEN 'SLIGHT IMPROVEMENT'
          ELSE 'STABLE'
        END as trend_status
      FROM MonthlyEngagement
      WHERE month_year IS NOT NULL
      ORDER BY faculty, month_year DESC
    `;

    const [rows] = await pool.execute(query, [months]);

    // sanitize numeric values for chart
    return rows.map(r => ({
      ...r,
      monthly_active_recyclers: Number(r.monthly_active_recyclers) || 0,
      total_faculty_students: Number(r.total_faculty_students) || 0,
      monthly_participation_rate: Number(r.monthly_participation_rate) || 0,
      previous_month_rate: Number(r.previous_month_rate) || 0,
      participation_change: Number(r.participation_change) || 0,
      monthly_points: Number(r.monthly_points) || 0,
    }));
  }


  static async getCampusZoneEngagement() {
    const query = `
      SELECT 
        CASE 
          WHEN s.faculty IN ('FKE','FK','FKT') THEN 'Electrical, Chemical & Energy Engineering Zone'
          WHEN s.faculty IN ('FS','FKM') THEN 'Mechanics & Applied Sciences Zone'
          WHEN s.faculty IN ('FABU','FSSH') THEN 'Environment, Society & Design Zone'
          WHEN s.faculty IN ('FEST','SPACE') THEN 'Education Zone'
          WHEN s.faculty = 'FM' THEN 'Management Zone'
          ELSE 'Other Zones'
        END as campus_zone,
        COUNT(DISTINCT s.studentID) as total_students,
        COUNT(DISTINCT rt.userID) as active_recyclers,
        ROUND(COALESCE(COUNT(DISTINCT rt.userID) / NULLIF(COUNT(DISTINCT s.studentID), 0), 0) * 100, 2) as zone_participation_rate,
        COALESCE(SUM(rt.points_earned), 0) as total_zone_points,
        COALESCE(COUNT(rt.id), 0) as total_zone_transactions,
        ROUND(COALESCE(AVG(DATEDIFF(CURDATE(), rt.transaction_date)), 0), 0) as avg_days_since_last_activity
      FROM Student s
      LEFT JOIN User u ON s.userID = u.userID
      LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
        AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY campus_zone
      ORDER BY zone_participation_rate ASC
    `;

    const [rows] = await pool.execute(query);

    // sanitize numeric values
    return rows.map(r => ({
      ...r,
      total_students: Number(r.total_students) || 0,
      active_recyclers: Number(r.active_recyclers) || 0,
      zone_participation_rate: Number(r.zone_participation_rate) || 0,
      total_zone_points: Number(r.total_zone_points) || 0,
      total_zone_transactions: Number(r.total_zone_transactions) || 0,
      avg_days_since_last_activity: Number(r.avg_days_since_last_activity) || 0,
    }));
  }

  // UC31: Generate Sustainability Insights & Recommendations
  static async generateSustainabilityInsights() {
    try {
      console.log('Starting generateSustainabilityInsights...');
      
      // First, let's create the temporary view if it doesn't exist
      const createViewQuery = `
        CREATE OR REPLACE VIEW CurrentSemesterEngagement AS
        SELECT 
          s.faculty,
          COUNT(DISTINCT s.studentID) as total_students,
          COUNT(DISTINCT rt.userID) as active_recyclers,
          ROUND(COALESCE(COUNT(DISTINCT rt.userID) * 100.0 / NULLIF(COUNT(DISTINCT s.studentID), 0), 0), 2) as participation_rate_percent,
          COALESCE(SUM(rt.points_earned), 0) as total_points,
          COALESCE(SUM(rt.quantity), 0) as total_kg,
          ROUND(COALESCE(SUM(rt.points_earned) / NULLIF(COUNT(DISTINCT rt.userID), 0), 0), 2) as avg_points_per_active_student
        FROM Student s
        LEFT JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
          AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY s.faculty;
      `;
      
      await pool.execute(createViewQuery);
      console.log('View created successfully');
      
      // Now run the insights query
      const query = `
        WITH FacultyPerformance AS (
          SELECT 
            faculty,
            total_students,
            active_recyclers,
            participation_rate_percent,
            total_points,
            total_kg,
            avg_points_per_active_student
          FROM CurrentSemesterEngagement
        ),
        CampusAvg AS (
          SELECT 
            COALESCE(AVG(participation_rate_percent), 0) AS avg_participation,
            COALESCE(AVG(avg_points_per_active_student), 0) AS avg_points
          FROM FacultyPerformance
        ),
        LowEngagement AS (
          SELECT 
            GROUP_CONCAT(faculty SEPARATOR ', ') AS low_engagement_faculties,
            COUNT(*) as low_engagement_count
          FROM FacultyPerformance fp
          CROSS JOIN CampusAvg ca
          WHERE fp.participation_rate_percent < ca.avg_participation * 0.8
          OR ca.avg_participation = 0
        ),
        TopMaterial AS (
          SELECT material_type
          FROM recycling_transactions
          WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
          GROUP BY material_type
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )
        SELECT 
          'Campus Performance' AS insight_category,
          CONCAT('Overall Participation Rate: ', 
                ROUND((SELECT avg_participation FROM CampusAvg), 1), 
                '%') AS insight_title,
          CONCAT('Current semester shows ', 
                ROUND((SELECT avg_participation FROM CampusAvg), 1), 
                '% participation rate with average ', 
                ROUND((SELECT avg_points FROM CampusAvg), 0), 
                ' points per active student.') AS insight_description,
          CASE 
            WHEN (SELECT avg_participation FROM CampusAvg) < 40 THEN 'Implement campus-wide recycling awareness week with bonus points'
            WHEN (SELECT avg_participation FROM CampusAvg) < 60 THEN 'Launch inter-faculty recycling competition'
            ELSE 'Maintain current initiatives and focus on sustaining engagement'
          END AS recommendation,
          CASE 
            WHEN (SELECT avg_participation FROM CampusAvg) < 40 THEN 'High'
            WHEN (SELECT avg_participation FROM CampusAvg) < 60 THEN 'Medium'
            ELSE 'Low'
          END AS priority_level,
          'Entire Campus' as affected_area
        FROM dual
        WHERE (SELECT avg_participation FROM CampusAvg) IS NOT NULL
        
        UNION ALL
        
        SELECT 
          'Low Engagement Alert' AS insight_category,
          CASE 
            WHEN (SELECT low_engagement_count FROM LowEngagement) > 0 
            THEN CONCAT('Low Engagement Detected in ', (SELECT low_engagement_faculties FROM LowEngagement))
            ELSE 'All Faculties Meeting Expectations'
          END AS insight_title,
          CASE 
            WHEN (SELECT low_engagement_count FROM LowEngagement) > 0 
            THEN 'Faculties performing below 80% of campus average need attention.'
            ELSE 'All faculties are performing at or above expectations.'
          END AS insight_description,
          CASE 
            WHEN (SELECT low_engagement_count FROM LowEngagement) > 0 
            THEN '1. Targeted awareness campaigns\n2. Faculty-specific incentives\n3. Additional recycling infrastructure\n4. Regular progress monitoring'
            ELSE 'Continue current successful strategies'
          END AS recommendation,
          CASE 
            WHEN (SELECT low_engagement_count FROM LowEngagement) > 0 THEN 'High'
            ELSE 'Low'
          END AS priority_level,
          COALESCE((SELECT low_engagement_faculties FROM LowEngagement), 'None') as affected_area
        FROM dual
        
        UNION ALL
        
        SELECT 
          'Material Focus' AS insight_category,
          CONCAT('Dominant Material: ', COALESCE((SELECT material_type FROM TopMaterial), 'No data')) AS insight_title,
          CASE 
            WHEN (SELECT material_type FROM TopMaterial) IS NOT NULL 
            THEN 'One material type accounts for disproportionate amount of recycling activity.'
            ELSE 'Insufficient recycling data to determine material trends.'
          END AS insight_description,
          CASE 
            WHEN (SELECT material_type FROM TopMaterial) IS NOT NULL 
            THEN '1. Promote recycling of underutilized materials\n2. Offer bonus points for diverse material recycling\n3. Educate on proper sorting of all recyclables'
            ELSE '1. Encourage students to start recycling\n2. Launch awareness campaign about recyclable materials'
          END AS recommendation,
          'Medium' AS priority_level,
          'Material Diversity' as affected_area
        FROM dual;
      `;
      
      console.log('Executing insights query...');
      const [rows] = await pool.execute(query);
      console.log(`Query executed successfully, found ${rows.length} insights`);
      
      // Add default insights if no data
      if (rows.length === 0) {
        return [{
          insight_category: 'Data Status',
          insight_title: 'Insufficient Data Available',
          insight_description: 'Not enough recycling data available to generate insights. Encourage students to start recycling.',
          recommendation: '1. Launch awareness campaign\n2. Set up recycling stations\n3. Offer introductory bonuses',
          priority_level: 'High',
          affected_area: 'Entire Campus'
        }];
      }
      
      return rows;
      
    } catch (error) {
      console.error('Error in generateSustainabilityInsights:', error);
      throw error;
    }
  }

  static async getStrategicRecommendations() {
    try {
      console.log('Starting getStrategicRecommendations...');
      
      const query = `
        -- Faculty performance for strategic recommendations
        WITH FacultyPerformance AS (
          SELECT 
            s.faculty,
            COUNT(DISTINCT s.studentID) as total_students,
            COUNT(DISTINCT rt.userID) as active_recyclers,
            ROUND(
              COALESCE(COUNT(DISTINCT rt.userID) * 100.0 / NULLIF(COUNT(DISTINCT s.studentID), 0), 0), 
              2
            ) as participation_rate_percent,
            ROUND(
              COALESCE(SUM(rt.points_earned) / NULLIF(COUNT(DISTINCT rt.userID), 0), 0), 
              2
            ) as avg_points_per_active_student
          FROM Student s
          LEFT JOIN User u ON s.userID = u.userID
          LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
            AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
          GROUP BY s.faculty
        ),
        
        -- Get faculty with lowest participation
        LowestParticipation AS (
          SELECT faculty, participation_rate_percent
          FROM FacultyPerformance
          WHERE participation_rate_percent IS NOT NULL
          ORDER BY participation_rate_percent ASC
          LIMIT 1
        ),
        
        -- Get least popular material
        MaterialAnalysis AS (
          SELECT material_type
          FROM recycling_transactions
          WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
          GROUP BY material_type
          ORDER BY COUNT(*) ASC
          LIMIT 1
        ),
        
        -- Get faculties with low participation (< 40%)
        LowParticipationFaculties AS (
          SELECT GROUP_CONCAT(faculty SEPARATOR ', ') as faculties_list
          FROM FacultyPerformance
          WHERE participation_rate_percent < 40
        )
        
        -- Return recommendations with safe defaults
        SELECT 
          'Resource Allocation' as category,
          CONCAT(
            'Increase resources for ', 
            COALESCE((SELECT faculty FROM LowestParticipation), 'all faculties'),
            ' (Lowest participation: ',
            COALESCE((SELECT ROUND(participation_rate_percent, 1) FROM LowestParticipation), 0),
            '%)'
          ) as recommendation,
          'High' as priority
        FROM dual
        
        UNION ALL
        
        SELECT 
          'Incentive Strategy',
          CONCAT(
            'Focus on promoting ', 
            COALESCE((SELECT material_type FROM MaterialAnalysis), 'all materials'),
            ' recycling with bonus points'
          ),
          'Medium'
        FROM dual
        
        UNION ALL
        
        SELECT 
          'Infrastructure Planning',
          CONCAT(
            'Deploy additional recycling stations in ',
            COALESCE((SELECT faculties_list FROM LowParticipationFaculties), 'strategic locations'),
            CASE 
              WHEN (SELECT faculties_list FROM LowParticipationFaculties) IS NULL 
              THEN ' (All faculties meeting targets)'
              ELSE ' areas'
            END
          ),
          CASE 
            WHEN (SELECT faculties_list FROM LowParticipationFaculties) IS NULL THEN 'Low'
            ELSE 'High'
          END
        FROM dual
        
        UNION ALL
        
        SELECT 
          'Campaign Planning',
          CONCAT(
            'Schedule next major campaign in ',
            MONTHNAME(DATE_ADD(CURDATE(), INTERVAL 1 MONTH)),
            ' with focus on student engagement'
          ),
          'Medium'
        FROM dual
        
        UNION ALL
        
        SELECT 
          'Sustainability Goals',
          CONCAT(
            'Aim to increase overall campus participation from ',
            COALESCE((SELECT ROUND(AVG(participation_rate_percent), 1) FROM FacultyPerformance), 0),
            '% to ',
            COALESCE((SELECT ROUND(AVG(participation_rate_percent) * 1.2, 1) FROM FacultyPerformance), 0),
            '% by next semester'
          ),
          'High'
        FROM dual;
      `;
      
      console.log('Executing strategic recommendations query...');
      const [rows] = await pool.execute(query);
      console.log(`Found ${rows.length} recommendations`);
      
      // If no data, return default recommendations
      if (!rows || rows.length === 0) {
        console.log('No recommendations found, returning defaults');
        return [
          {
            category: 'Initial Setup',
            recommendation: 'Start collecting recycling data to generate personalized recommendations',
            priority: 'High'
          },
          {
            category: 'Awareness Campaign',
            recommendation: 'Launch campus-wide recycling awareness program',
            priority: 'High'
          },
          {
            category: 'Infrastructure',
            recommendation: 'Set up recycling stations in key campus locations',
            priority: 'Medium'
          }
        ];
      }
      
      return rows;
      
    } catch (error) {
      console.error('Error in getStrategicRecommendations:', error);
      console.error('SQL Error Code:', error.code);
      console.error('SQL Error Message:', error.sqlMessage);
      
      // Return safe default recommendations instead of throwing error
      return [
        {
          category: 'System Status',
          recommendation: 'Analyzing recycling data to generate recommendations...',
          priority: 'Medium'
        },
        {
          category: 'Initial Steps',
          recommendation: 'Ensure recycling stations are properly set up and labeled',
          priority: 'High'
        },
        {
          category: 'Student Engagement',
          recommendation: 'Promote recycling program through campus channels',
          priority: 'High'
        }
      ];
    }
  }


  static async getExecutiveDashboardMetrics() {
    const query = `
      SELECT 
        'Campus Participation Rate' as metric,
        CONCAT(ROUND(AVG(participation_rate_percent), 1), '%') as value,
        CASE 
          WHEN AVG(participation_rate_percent) < 40 THEN 'Needs Immediate Attention'
          WHEN AVG(participation_rate_percent) < 60 THEN 'Requires Improvement'
          ELSE 'Satisfactory'
        END as status
      FROM (
        SELECT 
          s.faculty,
          COUNT(DISTINCT s.studentID) as total_students,
          COUNT(DISTINCT rt.userID) as active_recyclers,
          ROUND((COUNT(DISTINCT rt.userID) / COUNT(DISTINCT s.studentID)) * 100, 2) as participation_rate_percent
        FROM Student s
        LEFT JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
          AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        GROUP BY s.faculty
      ) as engagement_stats
      UNION ALL
      SELECT 
        'Total Recycled (Kg)',
        FORMAT(ROUND(COALESCE(SUM(quantity), 0), 0), 0) as value,
        CASE 
          WHEN COALESCE(SUM(quantity), 0) < 500 THEN 'Below Target'
          WHEN COALESCE(SUM(quantity), 0) < 1000 THEN 'On Track'
          ELSE 'Exceeding Target'
        END as status
      FROM recycling_transactions
      WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      UNION ALL
      SELECT 
        'Active Recycling Students',
        CONCAT(
          (SELECT COUNT(DISTINCT rt.userID) 
           FROM recycling_transactions rt 
           WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)),
          '/',
          (SELECT COUNT(*) FROM Student)
        ) as value,
        CONCAT(
          ROUND((SELECT COUNT(DISTINCT rt.userID) 
                 FROM recycling_transactions rt 
                 WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) * 100.0 / 
                (SELECT COUNT(*) FROM Student), 1),
          '% Active'
        ) as status
      FROM dual
      UNION ALL
      SELECT 
        'Low Engagement Areas',
        (SELECT COUNT(*) 
         FROM (
           SELECT s.faculty
           FROM Student s
           LEFT JOIN User u ON s.userID = u.userID
           LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
             AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
           GROUP BY s.faculty
           HAVING COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.studentID) < 40
         ) as low_engagement
        ) as value,
        CASE 
          WHEN (SELECT COUNT(*) 
                FROM (
                  SELECT s.faculty
                  FROM Student s
                  LEFT JOIN User u ON s.userID = u.userID
                  LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
                    AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  GROUP BY s.faculty
                  HAVING COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.studentID) < 40
                ) as low_engagement) > 3 THEN 'Multiple Areas Need Attention'
          WHEN (SELECT COUNT(*) 
                FROM (
                  SELECT s.faculty
                  FROM Student s
                  LEFT JOIN User u ON s.userID = u.userID
                  LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
                    AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                  GROUP BY s.faculty
                  HAVING COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.studentID) < 40
                ) as low_engagement) > 0 THEN 'Some Areas Need Attention'
          ELSE 'All Areas Performing Well'
        END as status
      FROM dual
    `;
    
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async getQuickInsights() {
    const query = `
      SELECT 
        'Top Performing Faculty' as insight,
        (SELECT s.faculty 
         FROM Student s
         JOIN User u ON s.userID = u.userID
         JOIN recycling_transactions rt ON u.userID = rt.userID
         GROUP BY s.faculty
         ORDER BY COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.studentID) DESC 
         LIMIT 1) as value,
        'Recognize and share best practices' as recommendation
      FROM dual
      UNION ALL
      SELECT 
        'Most Recycled Material',
        (SELECT material_type 
         FROM recycling_transactions 
         GROUP BY material_type 
         ORDER BY COUNT(*) DESC 
         LIMIT 1),
        'Focus promotion on other materials to increase diversity'
      FROM dual
      UNION ALL
      SELECT 
        'Best Day for Recycling',
        (SELECT DAYNAME(transaction_date) 
         FROM recycling_transactions 
         GROUP BY DAYNAME(transaction_date) 
         ORDER BY COUNT(*) DESC 
         LIMIT 1),
        'Schedule major collections and campaigns on this day'
      FROM dual
      UNION ALL
      SELECT 
        'Engagement Growth Trend',
        CASE 
          WHEN (SELECT AVG(participation_change) 
                FROM (
                  SELECT 
                    faculty,
                    month_year,
                    monthly_participation_rate,
                    LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) as prev_rate,
                    monthly_participation_rate - LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) as participation_change
                  FROM (
                    SELECT 
                      s.faculty,
                      DATE_FORMAT(rt.transaction_date, '%Y-%m') as month_year,
                      COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.studentID) as monthly_participation_rate
                    FROM Student s
                    JOIN User u ON s.userID = u.userID
                    LEFT JOIN recycling_transactions rt ON u.userID = rt.userID
                    WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                    GROUP BY s.faculty, DATE_FORMAT(rt.transaction_date, '%Y-%m')
                  ) as monthly_data
                ) as trend_data
                WHERE participation_change IS NOT NULL) > 0 
          THEN 'POSITIVE ↗️' 
          ELSE 'NEGATIVE ↘️'
        END,
        CASE 
          WHEN (SELECT AVG(participation_change) 
                FROM (
                  SELECT 
                    faculty,
                    month_year,
                    monthly_participation_rate,
                    LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) as prev_rate,
                    monthly_participation_rate - LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) as participation_change
                  FROM (
                    SELECT 
                      s.faculty,
                      DATE_FORMAT(rt.transaction_date, '%Y-%m') as month_year,
                      COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.studentID) as monthly_participation_rate
                    FROM Student s
                    JOIN User u ON s.userID = u.userID
                    LEFT JOIN recycling_transactions rt ON u.userID = rt.userID
                    WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                    GROUP BY s.faculty, DATE_FORMAT(rt.transaction_date, '%Y-%m')
                  ) as monthly_data
                ) as trend_data
                WHERE participation_change IS NOT NULL) > 0 
          THEN 'Continue current strategies'
          ELSE 'Review and adjust engagement strategies'
        END
      FROM dual
    `;
    
    const [rows] = await pool.execute(query);
    return rows;
  }
}

module.exports = AdvancedAnalyticsModel;