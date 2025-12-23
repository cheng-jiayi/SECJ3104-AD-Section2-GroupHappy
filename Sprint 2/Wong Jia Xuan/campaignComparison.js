import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  ActivityIndicator, Dimensions, TouchableOpacity,
  Alert, RefreshControl, Share,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Polygon, Circle, Text as SvgText, Line, G, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = 'http://localhost:5000';

// Custom Grouped Bar Chart Component - ALL METRICS SHOWN
const GroupedBarChart = ({ data, campaigns, width: chartWidth, height: chartHeight }) => {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#FF5722'];
  const barWidth = 24;
  const groupPadding = 40;
  const barPadding = 10;
  
  // Always show all 5 metrics
  const metrics = [
    'participation',
    'goal_achievement',
    'avg_points',
    'completion_rate',
    'success_score'
  ];
  
  const metricLabels = {
    'participation': 'Participation',
    'goal_achievement': 'Goal %',
    'avg_points': 'Avg Points',
    'completion_rate': 'Completion',
    'success_score': 'Success Score'
  };
  
  // Calculate positions
  const numGroups = campaigns.length;
  const numBars = metrics.length; // Always 5
  
  // Calculate group width
  const minGroupWidth = 100;
  const calculatedGroupWidth = (numBars * barWidth) + ((numBars - 1) * barPadding);
  const groupWidth = Math.max(calculatedGroupWidth, minGroupWidth);
  
  // Calculate total content width needed
  const totalContentWidth = (numGroups * groupWidth) + ((numGroups - 1) * groupPadding);
  
  // Find max value for Y axis
  const allValues = metrics.flatMap(metric => 
    campaigns.map(campaign => {
      const val = data[campaign.eventID]?.[metric];
      return typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) || 0 : 0;
    })
  );
  
  const maxValue = Math.max(...allValues, 100);
  
  // Scale function for Y axis
  const scaleY = (value) => {
    const topPadding = 30;
    const bottomPadding = 105;
    const chartAreaHeight = chartHeight - topPadding - bottomPadding;
    
    const normalizedValue = value / maxValue;
    return topPadding + (chartAreaHeight * (1 - normalizedValue));
  };
  
  // Scale function for X axis - PROPER ALIGNMENT
  const scaleX = (groupIndex, barIndex) => {
    const yAxisWidth = 50;
    
    // Calculate actual bars width within group
    const barsWidth = (numBars * barWidth) + ((numBars - 1) * barPadding);
    
    let groupStart;
    
    if (totalContentWidth <= (chartWidth - yAxisWidth - 30)) {
      // All content fits: center everything
      const availableWidth = chartWidth - yAxisWidth - 30;
      const leftMargin = (availableWidth - totalContentWidth) / 2;
      groupStart = yAxisWidth + leftMargin + (groupIndex * (groupWidth + groupPadding));
    } else {
      // Needs scrolling: start from left
      groupStart = yAxisWidth + (groupIndex * (groupWidth + groupPadding));
    }
    
    // Center bars within their group
    const barsStart = groupStart + (groupWidth - barsWidth) / 2;
    const barStart = barsStart + (barIndex * (barWidth + barPadding));
    
    return barStart;
  };

  // Get group center for label positioning
  const getGroupCenterX = (groupIndex) => {
    const yAxisWidth = 50;
    const rightPadding = 20;
    
    let groupStart;
    
    if (totalContentWidth <= (chartWidth - yAxisWidth - rightPadding)) {
      const availableWidth = chartWidth - yAxisWidth - rightPadding;
      const leftMargin = (availableWidth - totalContentWidth) / 2;
      groupStart = yAxisWidth + leftMargin + (groupIndex * (groupWidth + groupPadding));
    } else {
      groupStart = yAxisWidth + (groupIndex * (groupWidth + groupPadding));
    }
    
    return groupStart + (groupWidth / 2);
  };

  // Calculate if we need horizontal scrolling
  const needsHorizontalScroll = totalContentWidth > (chartWidth - 90);
  const chartContainerWidth = needsHorizontalScroll ? totalContentWidth + 120 : chartWidth;

  return (
    <View style={{ 
      width: chartWidth, 
      height: chartHeight,
    }}>
      {/* Chart container */}
      <View style={{ 
        width: '94%', 
        height: chartHeight - 70,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0F2F1',
        overflow: 'hidden',
      }}>
        {needsHorizontalScroll ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ 
              width: chartContainerWidth,
              minWidth: chartContainerWidth,
              paddingRight: 10,
            }}
            style={{ 
              height: '100%',
              width: '100%',
            }}
          >
            <ChartContent 
              chartContainerWidth={chartContainerWidth}
              chartHeight={chartHeight - 70}
              scaleX={scaleX}
              scaleY={scaleY}
              getGroupCenterX={getGroupCenterX}
              campaigns={campaigns}
              metrics={metrics}
              data={data}
              barWidth={barWidth}
              numBars={numBars}
              groupWidth={groupWidth}
              colors={colors}
              maxValue={maxValue}
              chartWidth={chartWidth}
              numGroups={numGroups}
              needsHorizontalScroll={needsHorizontalScroll}
            />
          </ScrollView>
        ) : (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center',
            width: '100%',
          }}>
            <ChartContent 
              chartContainerWidth={chartWidth}
              chartHeight={chartHeight - 70}
              scaleX={scaleX}
              scaleY={scaleY}
              getGroupCenterX={getGroupCenterX}
              campaigns={campaigns}
              metrics={metrics}
              data={data}
              barWidth={barWidth}
              numBars={numBars}
              groupWidth={groupWidth}
              colors={colors}
              maxValue={maxValue}
              chartWidth={chartWidth}
              numGroups={numGroups}
              needsHorizontalScroll={needsHorizontalScroll}
            />
          </View>
        )}
      </View>
      
      {/* Legend - Show all 5 metrics */}
      <View style={styles.chartLegendContainer}>
        <Text style={styles.legendTitle}>Performance Metrics:</Text>
        <View style={styles.customLegend}>
          {metrics.map((metric, index) => (
            <View key={`legend-${index}`} style={styles.customLegendItem}>
              <View 
                style={[
                  styles.customLegendColor, 
                  { backgroundColor: colors[index % colors.length] }
                ]} 
              />
              <Text style={styles.customLegendText}>{metricLabels[metric]}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ChartContent component
const ChartContent = ({ 
  chartContainerWidth, chartHeight, scaleX, scaleY, 
  getGroupCenterX, campaigns, metrics, data, barWidth, 
  numBars, groupWidth, colors, maxValue, chartWidth,
  numGroups, needsHorizontalScroll
}) => {
  // Generate Y-axis values
  const yAxisValues = [0, 25, 50, 75, 100].map(value => {
    const y = scaleY(value);
    return { value, y };
  });

  // Fixed Y-axis position
  const yAxisX = 40;

  return (
    <Svg width={chartContainerWidth} height={chartHeight}>
      {/* Y Axis Line */}
      <Line
        x1={yAxisX}
        y1={scaleY(maxValue)}
        x2={yAxisX}
        y2={scaleY(0)}
        stroke="#B0BEC5"
        strokeWidth="1.5"
      />
      
      {/* X Axis Line */}
      <Line
        x1={yAxisX}
        y1={scaleY(0)}
        x2={chartContainerWidth - (needsHorizontalScroll ? 20 : 20)}
        y2={scaleY(0)}
        stroke="#B0BEC5"
        strokeWidth="1.5"
      />
      
      {/* Y Axis Labels */}
      {yAxisValues.map((item, index) => (
        <G key={`y-label-${index}`}>
          <Line
            x1={yAxisX - 5}
            y1={item.y}
            x2={yAxisX}
            y2={item.y}
            stroke="#B0BEC5"
            strokeWidth="1"
          />
          <SvgText
            x={yAxisX - 10}
            y={item.y + 4}
            fill="#5D6D7E"
            fontSize="11"
            fontWeight="500"
            textAnchor="end"
            alignmentBaseline="middle"
          >
            {item.value}
          </SvgText>
        </G>
      ))}
      
      {/* Draw Bars */}
      {campaigns.map((campaign, groupIndex) => (
        <G key={`group-${groupIndex}`}>
          {/* Campaign Label - STRAIGHT TEXT */}
          <SvgText
            x={getGroupCenterX(groupIndex)}
            y={scaleY(0) + 20}
            fill="#1A5F7A"
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
          >
            {campaign.eventTitle?.substring(0, 15) || `Campaign ${groupIndex + 1}`}
            {campaign.eventTitle?.length > 15 ? '...' : ''}
          </SvgText>
          
          {/* Bars for each metric */}
          {metrics.map((metric, barIndex) => {
            const rawValue = data[campaign.eventID]?.[metric];
            let value = 0;
            
            if (typeof rawValue === 'number' && !isNaN(rawValue)) {
              value = rawValue;
            } else if (typeof rawValue === 'string') {
              const parsed = parseFloat(rawValue);
              value = isNaN(parsed) ? 0 : parsed;
            }
            
            const x = scaleX(groupIndex, barIndex);
            const y = scaleY(value);
            const barHeight = scaleY(0) - y;
            
            return (
              <G key={`bar-${groupIndex}-${barIndex}`}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={colors[barIndex % colors.length]}
                  rx={3}
                  ry={3}
                />
                
                {/* Value label on top of bar */}
                {value >= 0 && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={barHeight > 18 ? y + 12 : y - 6}
                    fill={barHeight > 18 ? '#FFFFFF' : '#1A5D7A'}
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {metric === 'avg_points'
                      ? value.toFixed(1)
                      : Math.round(value)}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      ))}
    </Svg>
  );
};

// CustomRadarChart component
const CustomRadarChart = ({ data, labels, width: chartWidth, height: chartHeight }) => {
  const centerX = chartWidth / 2;
  const centerY = chartHeight / 2;
  const radius = Math.min(centerX, centerY) - 40;
  const numPoints = labels.length;
  
  const calculatePoints = (values, maxValues) => {
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints - Math.PI / 2;
      const rawValue = values[i] || 0;
      const value = Math.min(rawValue, maxValues[i] || 100);
      const normalizedValue = value / (maxValues[i] || 100);
      const x = centerX + radius * normalizedValue * Math.cos(angle);
      const y = centerY + radius * normalizedValue * Math.sin(angle);
      points.push({ x, y });
    }
    return points;
  };

  const maxValues = labels.map((_, index) => {
    const datasetValues = data.datasets.map(dataset => dataset.data[index] || 0);
    return Math.max(...datasetValues, 100);
  });

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {/* Draw grid circles */}
      {[0.25, 0.5, 0.75, 1].map((scale, index) => (
        <Polygon
          key={`grid-${index}`}
          points={labels.map((_, i) => {
            const angle = (2 * Math.PI * i) / numPoints - Math.PI / 2;
            const x = centerX + radius * scale * Math.cos(angle);
            const y = centerY + radius * scale * Math.sin(angle);
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="#E0F2F1"
          strokeWidth="1"
        />
      ))}

      {/* Draw axis lines */}
      {labels.map((_, index) => {
        const angle = (2 * Math.PI * index) / numPoints - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return (
          <Line
            key={`axis-${index}`}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="#B0BEC5"
            strokeWidth="1"
          />
        );
      })}

      {/* Draw data polygons */}
      {data.datasets.map((dataset, datasetIndex) => {
        const points = calculatePoints(dataset.data, maxValues);
        return (
          <React.Fragment key={`dataset-${datasetIndex}`}>
            <Polygon
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill={dataset.color ? dataset.color(0.2) : `rgba(${datasetIndex * 80}, ${180 - datasetIndex * 30}, 75, 0.2)`}
              stroke={dataset.color ? dataset.color(1) : `rgba(${datasetIndex * 80}, ${180 - datasetIndex * 30}, 75, 1)`}
              strokeWidth="2"
            />
            {/* Points */}
            {points.map((point, pointIndex) => (
              <Circle
                key={`point-${datasetIndex}-${pointIndex}`}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={dataset.color ? dataset.color(1) : `rgba(${datasetIndex * 80}, ${180 - datasetIndex * 30}, 75, 1)`}
              />
            ))}
          </React.Fragment>
        );
      })}

      {/* Draw labels */}
      {labels.map((label, index) => {
        const angle = (2 * Math.PI * index) / numPoints - Math.PI / 2;

        let labelRadius;
        if (label === 'Participation' || label === 'Avg Points') {
          labelRadius = radius + 13; 
        } else if (label === 'Completion') {
          labelRadius = radius + 17; 
        } else if (label === 'Success Score') {
          labelRadius = radius + 32;
        } else if (label === 'Goal %') {
          labelRadius = radius + 25;
        }
        
        const x = centerX + labelRadius * Math.cos(angle);
        const y = centerY + labelRadius * Math.sin(angle);
        
        let textAnchor = 'middle';
        if (angle > Math.PI / 6 && angle < (5 * Math.PI) / 6) textAnchor = 'start';
        if (angle < -Math.PI / 6 && angle > -(5 * Math.PI) / 6) textAnchor = 'end';
        
        return (
          <SvgText
            key={`label-${index}`}
            x={x}
            y={y}
            fill="#1A5F7A"
            fontSize="11"
            fontWeight="500"
            textAnchor={textAnchor}
            alignmentBaseline="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
};

export default function CampaignComparisonScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { campaignIds = [], comparisonType = 'completed' } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [comparisonViewSaved, setComparisonViewSaved] = useState(false);
  const [categoryPerformance, setCategoryPerformance] = useState({});

  useEffect(() => {
    if (campaignIds.length > 0) {
      loadComparisonData();
    } else {
      Alert.alert('No Campaigns', 'Please select campaigns to compare first.');
      navigation.goBack();
    }
  }, [campaignIds]);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      
      // YOUR ORIGINAL DATA LOADING LOGIC - KEPT AS IS
      try {
        const campaignPromises = campaignIds.map(async (campaignId) => {
          const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`);
          const data = await response.json();
          return data.success ? data.campaign : null;
        });
        
        const fetchedCampaigns = (await Promise.all(campaignPromises)).filter(c => c !== null);
        if (fetchedCampaigns.length >= 2) {
          // Use your actual fetched data
          proceedWithComparison(fetchedCampaigns);
        } else {
          Alert.alert('Selection Error', 'Could not load enough campaigns for comparison.');
          navigation.goBack();
          return;
        }
      } catch (fetchError) {
        console.error('Error fetching campaigns:', fetchError);
        Alert.alert(
          'Network Error',
          'Failed to load campaign data. Please check your connection.',
          [
            { text: 'Try Again', onPress: () => loadComparisonData() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
      
    } catch (error) {
      console.error('Error loading comparison data:', error);
      Alert.alert(
        'Comparison Error',
        'Failed to load campaign data. Please try again.',
        [
          { text: 'Try Again', onPress: () => loadComparisonData() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const proceedWithComparison = (campaignsData) => {
    const normalizedCampaigns = analyzeComparisonData(campaignsData);
    setCampaigns(normalizedCampaigns);
    calculateCategoryPerformance(normalizedCampaigns);
    
    const insights = generateInsights(normalizedCampaigns);
    const optimalPoints = calculateOptimalPoints(normalizedCampaigns);
    
    const sortedByPerformance = [...normalizedCampaigns].sort(
      (a, b) => (b.normalizedMetrics?.performanceScore || 0) - (a.normalizedMetrics?.performanceScore || 0)
    );
    
    const bestCampaign = sortedByPerformance[0];
    const worstCampaign = sortedByPerformance[sortedByPerformance.length - 1];
    
    setComparisonData({
      generatedAt: new Date().toISOString(),
      comparisonId: `COMP-${Date.now()}-${campaignIds.join('-')}`,
      analysis: {
        normalizedCampaigns,
        bestCampaign,
        worstCampaign,
        insights,
        optimalPoints,
        totalCompared: normalizedCampaigns.length,
        comparisonCategories: [...new Set(normalizedCampaigns.map(c => c.eventCategory || 'General'))]
      }
    });
  };

  const analyzeComparisonData = (campaignsData) => {
    // Find maximum values for normalization
    const maxParticipation = Math.max(...campaignsData.map(c => Number(c.participants) || 0), 1);
    const maxPoints = Math.max(...campaignsData.map(c => Number(c.pointsCollected) || 0), 1);
    
    const normalizedCampaigns = campaignsData.map(campaign => {
      const participationRate = Number(campaign.participants) || 0;
      const goalAchievement = Number(campaign.goalPercent) || 0;
      const pointsCollected = Number(campaign.pointsCollected) || 0;
      
      // Calculate Avg Points Per Participant
      let avgPointsPerParticipant;
      if (campaign.averagePoints !== undefined && campaign.averagePoints !== null) {
        avgPointsPerParticipant = Number(campaign.averagePoints);
      } else {
        avgPointsPerParticipant = pointsCollected / Math.max(participationRate, 1);
      }
      avgPointsPerParticipant = isNaN(avgPointsPerParticipant) ? 0 : avgPointsPerParticipant;
      
      // Normalize participation to percentage (0-100)
      const participationPercent = (participationRate / maxParticipation) * 100;
      
      // Normalize avg points to percentage (assuming 0-10 points scale normalized to 0-100)
      const avgPointsPercent = Math.min((avgPointsPerParticipant / 10) * 100, 100);
      
      // NEW SUCCESS SCORE FORMULA
      const successScore = (
        (goalAchievement * 0.4) +        // Goal % contributes 40%
        (participationPercent * 0.3) +   // Participation % contributes 30%
        (avgPointsPercent * 0.3)         // Avg Points % contributes 30%
      );
      
      const normalizedSuccessScore = Math.min(Math.max(successScore, 0), 100);
      
      // Calculate completion rate (100 if completed, 0 otherwise)
      const completionRate = campaign.status === 'Completed' ? 100 : 0;
      
      // Performance score (different from success score - includes more factors)
      const participationScore = Math.min(participationRate / 100, 1) * 100 * 0.3;
      const pointsEffectiveness = participationRate > 0 ? pointsCollected / participationRate : 0;
      const effectivenessScore = Math.min(pointsEffectiveness / 10, 1) * 100 * 0.3;
      const performanceScore = (
        (goalAchievement * 0.4) +
        participationScore +
        effectivenessScore
      );
      
      return {
        ...campaign,
        normalizedMetrics: {
          participationRate: Number(participationRate) || 0,
          participationPercent: Number(participationPercent) || 0,
          goalAchievement: Number(goalAchievement) || 0,
          avgPointsPerParticipant: Number(avgPointsPerParticipant) || 0,
          avgPointsPercent: Number(avgPointsPercent) || 0,
          completionRate: Number(completionRate) || 0,
          pointsEffectiveness: Number(pointsEffectiveness) || 0,
          performanceScore: Number(performanceScore) || 0,
          successScore: Number(normalizedSuccessScore) || 0,
          successScoreBreakdown: {
            goalContribution: goalAchievement * 0.4,
            participationContribution: participationPercent * 0.3,
            avgPointsContribution: avgPointsPercent * 0.3
          }
        }
      };
    });
    
    return normalizedCampaigns;
  };

  const calculateCategoryPerformance = (campaignsData) => {
    if (!campaignsData || campaignsData.length === 0) {
      setCategoryPerformance({});
      return;
    }
    
    const categories = {};
    
    campaignsData.forEach(campaign => {
      const category = campaign.eventCategory || 'General';
      
      if (!categories[category]) {
        categories[category] = {
          campaigns: [],
          totalPoints: 0,
          totalParticipants: 0,
          totalGoalAchievement: 0,
          totalSuccessScore: 0,
          successfulCampaigns: 0
        };
      }
      
      categories[category].campaigns.push(campaign);
      
      const pointsCollected = Number(campaign.pointsCollected) || 0;
      const participationRate = Number(campaign.normalizedMetrics?.participationRate) || 0;
      const goalAchievement = Number(campaign.normalizedMetrics?.goalAchievement) || 0;
      const successScore = Number(campaign.normalizedMetrics?.successScore) || 0;
      
      categories[category].totalPoints += pointsCollected;
      categories[category].totalParticipants += participationRate;
      categories[category].totalGoalAchievement += goalAchievement;
      categories[category].totalSuccessScore += successScore;
      
      if (goalAchievement >= 80) {
        categories[category].successfulCampaigns++;
      }
    });
    
    const categoryAnalysis = {};
    
    Object.entries(categories).forEach(([category, data]) => {
      const totalCampaigns = data.campaigns.length;
      
      if (totalCampaigns === 0) return;
      
      const avgPointsPerParticipant = data.totalParticipants > 0 
        ? data.totalPoints / data.totalParticipants 
        : 0;
      
      const successRate = totalCampaigns > 0 
        ? (data.successfulCampaigns / totalCampaigns) * 100 
        : 0;
      
      const avgSuccessScore = totalCampaigns > 0 
        ? data.totalSuccessScore / totalCampaigns 
        : 0;
      
      const avgGoalAchievement = totalCampaigns > 0 
        ? data.totalGoalAchievement / totalCampaigns 
        : 0;
      
      const pointsEffectivenessScore = Math.min((avgPointsPerParticipant / 10) * 30, 30) || 0;
      const goalAchievementScore = Math.min((avgGoalAchievement / 100) * 40, 40) || 0;
      const successRateScore = Math.min((successRate / 100) * 20, 20) || 0;
      const successScoreBonus = Math.min((avgSuccessScore / 100) * 10, 10) || 0;
      
      const engagementScore = Math.round(
        pointsEffectivenessScore + 
        goalAchievementScore + 
        successRateScore + 
        successScoreBonus
      );
      
      const finalEngagementScore = isNaN(engagementScore) ? 0 : Math.min(Math.max(engagementScore, 0), 100);
      
      categoryAnalysis[category] = {
        engagementScore: finalEngagementScore,
        avgPointsPerParticipant: isNaN(avgPointsPerParticipant) ? "0.0" : avgPointsPerParticipant.toFixed(1),
        successRate: isNaN(successRate) ? "0.0" : successRate.toFixed(1),
        avgSuccessScore: isNaN(avgSuccessScore) ? "0.0" : avgSuccessScore.toFixed(1),
        totalCampaigns,
        totalParticipants: data.totalParticipants,
        totalPoints: data.totalPoints,
        avgGoalAchievement: isNaN(avgGoalAchievement) ? "0.0" : avgGoalAchievement.toFixed(1)
      };
    });
    
    setCategoryPerformance(categoryAnalysis);
  };

  const calculateOptimalPoints = (campaignsData) => {
    if (!campaignsData || campaignsData.length === 0) return {};
    
    const categories = {};
    campaignsData.forEach(campaign => {
      const category = campaign.eventCategory || 'General';
      if (!categories[category]) {
        categories[category] = {
          campaigns: [],
          totalPoints: 0,
          totalParticipants: 0,
          avgGoalAchievement: 0
        };
      }
      categories[category].campaigns.push(campaign);
      categories[category].totalPoints += (Number(campaign.pointsCollected) || 0);
      categories[category].totalParticipants += (Number(campaign.normalizedMetrics?.participationRate) || 0);
      categories[category].avgGoalAchievement += (Number(campaign.normalizedMetrics?.goalAchievement) || 0);
    });
    
    const optimal = {};
    Object.entries(categories).forEach(([category, data]) => {
      const successfulCampaigns = data.campaigns.filter(c => 
        (Number(c.normalizedMetrics?.goalAchievement) || 0) >= 80
      );
      
      if (successfulCampaigns.length > 0) {
        const pointsPerParticipant = successfulCampaigns.map(c => {
          const points = Number(c.pointsCollected) || 0;
          const participants = Number(c.normalizedMetrics?.participationRate) || 1;
          return points / Math.max(participants, 1);
        });
        
        const avgPointsPerParticipant = pointsPerParticipant.length > 0 ? 
          pointsPerParticipant.reduce((a, b) => a + b, 0) / pointsPerParticipant.length : 0;
        
        const variance = pointsPerParticipant.reduce((acc, val) => 
          acc + Math.pow(val - avgPointsPerParticipant, 2), 0) / Math.max(pointsPerParticipant.length, 1);
        const stdDev = Math.sqrt(variance);
        
        optimal[category] = {
          recommendedPoints: Math.round(avgPointsPerParticipant),
          optimalRange: [
            Math.round(Math.max(avgPointsPerParticipant - stdDev, 0)),
            Math.round(avgPointsPerParticipant + stdDev)
          ],
          expectedParticipation: Math.round(data.totalParticipants / Math.max(data.campaigns.length, 1)),
          engagementEffectiveness: (data.totalPoints / Math.max(data.totalParticipants, 1)).toFixed(2),
          sampleSize: successfulCampaigns.length,
          avgGoalAchievement: (data.avgGoalAchievement / Math.max(data.campaigns.length, 1)).toFixed(1)
        };
      }
    });
    
    return optimal;
  };

  const generateInsights = (campaignsData) => {
    const insights = [];
    
    if (!campaignsData || campaignsData.length === 0) return insights;
    
    // Best success score with breakdown
    const sortedBySuccessScore = [...campaignsData].sort(
      (a, b) => (Number(b.normalizedMetrics?.successScore) || 0) - (Number(a.normalizedMetrics?.successScore) || 0)
    );
    if (sortedBySuccessScore.length > 0) {
      const bestCampaign = sortedBySuccessScore[0];
      const successScore = bestCampaign.normalizedMetrics?.successScore || 0;
      const breakdown = bestCampaign.normalizedMetrics?.successScoreBreakdown;
      
      if (breakdown) {
        insights.push(`🏆 Best Success Score: ${bestCampaign.eventTitle} (${successScore.toFixed(1)}/100)`);
        insights.push(`   Breakdown: Goal ${breakdown.goalContribution.toFixed(1)} + Participation ${breakdown.participationContribution.toFixed(1)} + Avg Points ${breakdown.avgPointsContribution.toFixed(1)}`);
      } else {
        insights.push(`🏆 Best Success Score: ${bestCampaign.eventTitle} (${successScore.toFixed(1)}/100)`);
      }
    }
    
    // Best goal achievement
    const sortedByGoal = [...campaignsData].sort(
      (a, b) => (Number(b.normalizedMetrics?.goalAchievement) || 0) - (Number(a.normalizedMetrics?.goalAchievement) || 0)
    );
    if (sortedByGoal.length > 0) {
      insights.push(`🎯 Best goal achievement: ${sortedByGoal[0].eventTitle} (${sortedByGoal[0].normalizedMetrics?.goalAchievement || 0}%)`);
    }
    
    // Highest participation
    const sortedByParticipation = [...campaignsData].sort(
      (a, b) => (Number(b.normalizedMetrics?.participationRate) || 0) - (Number(a.normalizedMetrics?.participationRate) || 0)
    );
    if (sortedByParticipation.length > 0) {
      insights.push(`👥 Highest participation: ${sortedByParticipation[0].eventTitle} (${sortedByParticipation[0].normalizedMetrics?.participationRate || 0} participants)`);
    }
    
    // Best average points
    const sortedByAvgPoints = [...campaignsData].sort(
      (a, b) => (Number(b.normalizedMetrics?.avgPointsPerParticipant) || 0) - (Number(a.normalizedMetrics?.avgPointsPerParticipant) || 0)
    );
    if (sortedByAvgPoints.length > 0 && (sortedByAvgPoints[0].normalizedMetrics?.avgPointsPerParticipant || 0) > 0) {
      insights.push(`⭐ Best average points: ${sortedByAvgPoints[0].eventTitle} (${sortedByAvgPoints[0].normalizedMetrics?.avgPointsPerParticipant.toFixed(1)} points/participant)`);
    }
    
    return insights;
  };

  const handleGenerateReport = async () => {
    try {
      setExporting(true);
      
      // Get the campaign IDs from the current campaigns being compared
      const selectedCampaignIds = campaigns.map(campaign => campaign.eventID);
      
      // Navigate to GenerateReport with proper data
      navigation.navigate('GenerateReport', {
        reportType: 'Comparative analysis',
        campaignIds: selectedCampaignIds, // Use the correct variable
        sourceScreen: 'CampaignComparison',
        comparisonData: comparisonData, // Pass the comparison data
        initialData: {
          campaigns: campaigns,
          comparisonData: comparisonData,
          categoryPerformance: categoryPerformance
        }
      });
      
    } catch (error) {
      console.error('Error preparing report:', error);
      Alert.alert('Report Error', 'Failed to prepare report data.');
    } finally {
      setExporting(false);
    }
  };

  const handleShareComparison = async () => {
    try {
      const comparisonSummary = `🎯 Campaign Comparison Results:\n\n`;
      const campaignsSummary = campaigns.map((campaign, index) => {
        const successScore = campaign.normalizedMetrics?.successScore || 0;
        const breakdown = campaign.normalizedMetrics?.successScoreBreakdown;
        
        let scoreDetails = `Success: ${successScore.toFixed(1)}/100`;
        if (breakdown) {
          scoreDetails += ` (Goal:${breakdown.goalContribution.toFixed(1)} + Part:${breakdown.participationContribution.toFixed(1)} + Points:${breakdown.avgPointsContribution.toFixed(1)})`;
        }
        
        return `${index + 1}. ${campaign.eventTitle}\n   • Goal: ${campaign.normalizedMetrics?.goalAchievement || 0}%\n   • Participants: ${campaign.normalizedMetrics?.participationRate || 0}\n   • ${scoreDetails}\n`;
      }).join('\n');
      
      const insightsSummary = comparisonData?.analysis?.insights?.join('\n• ') || 'No insights available';
      
      let categorySummary = '';
      if (Object.keys(categoryPerformance).length > 0) {
        categorySummary = '\n📊 Category Performance:\n';
        Object.entries(categoryPerformance).forEach(([category, data]) => {
          categorySummary += `• ${category}: ${data.engagementScore}/100 engagement score\n`;
        });
      }
      
      const formulaNote = '\n📈 Success Score Formula:\nGoal % × 0.4 + Participation % × 0.3 + Avg Points % × 0.3';
      
      await Share.share({
        message: `${comparisonSummary}${campaignsSummary}\n💡 Key Insights:\n• ${insightsSummary}${categorySummary}${formulaNote}\n\nGenerated: ${new Date().toLocaleDateString()}\n\nvia UTM ReMerit Analytics`,
        title: 'Campaign Comparison Results'
      });
      
    } catch (error) {
      console.error('Error sharing comparison:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading Comparison Data...</Text>
          <Text style={styles.loadingSubtext}>Analyzing {campaignIds.length} campaigns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare data for grouped bar chart
  const barChartData = {};
  campaigns.forEach(campaign => {
    if (!barChartData[campaign.eventID]) {
      barChartData[campaign.eventID] = {};
    }
    
    // Always include all 5 metrics
    const allMetrics = [
      'participation',
      'goal_achievement',
      'avg_points',
      'completion_rate',
      'success_score'
    ];
    
    allMetrics.forEach(metric => {
      let value = 0;
      
      switch (metric) {
        case 'participation': 
          value = Number(campaign.normalizedMetrics?.participationRate) || 0;
          break;
        case 'goal_achievement': 
          value = Number(campaign.normalizedMetrics?.goalAchievement) || 0;
          break;
        case 'avg_points': 
          value = Number(campaign.normalizedMetrics?.avgPointsPerParticipant) || 0;
          break;
        case 'completion_rate': 
          value = Number(campaign.normalizedMetrics?.completionRate) || 0;
          break;
        case 'success_score': 
          value = Number(campaign.normalizedMetrics?.successScore) || 0;
          break;
      }
      
      barChartData[campaign.eventID][metric] = value;
    });
  });

  // Radar Chart Data
  const radarChartData = {
    labels: ['Participation', 'Goal %', 'Avg Points', 'Completion', 'Success Score'],
    datasets: campaigns.map((campaign, index) => {
      const dataValues = [
        Math.min(Number(campaign.normalizedMetrics?.participationRate) || 0, 100),
        Number(campaign.normalizedMetrics?.goalAchievement) || 0,
        Math.min(Number(campaign.normalizedMetrics?.avgPointsPerParticipant) || 0, 100),
        Number(campaign.normalizedMetrics?.completionRate) || 0,
        Number(campaign.normalizedMetrics?.successScore) || 0
      ];
      
      return {
        data: dataValues.map(val => isNaN(val) ? 0 : val),
        color: (opacity = 1) => `rgba(${index * 80}, ${180 - index * 30}, 75, ${opacity})`
      };
    })
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadComparisonData} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Campaign Names */}
        <View style={styles.header}>
          <View style={styles.campaignNamesContainer}>
            <Text style={styles.campaignNamesTitle}>Compared Campaigns ({campaigns.length}):</Text>
            <View style={styles.campaignNamesList}>
              {campaigns.map((campaign, index) => (
                <View key={index} style={styles.campaignNameItem}>
                  <View style={[styles.campaignColorDot, { 
                    backgroundColor: `rgb(${index * 80}, ${180 - index * 30}, 75)` 
                  }]} />
                  <Text style={styles.campaignNameText}>
                    {campaign.eventTitle}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
        </View>

          {/* Success Score Formula */}
          <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📊 All 5 Performance Metrics Compared</Text>
          <Text style={styles.successFormula}>
            Success Score = (Goal % × 0.4) + (Participation % × 0.3) + (Avg Points % × 0.3)
          </Text>
          <Text style={styles.infoNote}>
            Formula weights: Goal Achievement (40%), Participation (30%), Average Points (30%)
          </Text>
        </View>

        {/* Grouped Bar Charts */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Side-by-Side Comparison</Text>
          <Text style={styles.chartSubtitle}>
            All 5 metrics across {campaigns.length} campaigns
          </Text>
          
          <GroupedBarChart
            data={barChartData}
            campaigns={campaigns}
            width={width - 40}
            height={340}
          />
        </View>

        {/* Radar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Performance Profile</Text>
          <Text style={styles.chartSubtitle}>
            Compare all metrics at a glance
          </Text>
          
          <View style={styles.radarContainer}>
            <CustomRadarChart
              data={radarChartData}
              labels={radarChartData.labels}
              width={width - 40}
              height={280}
            />
          </View>
          
          {/* Legend */}
          <View style={styles.radarLegend}>
            {campaigns.map((campaign, index) => (
              <View key={`legend-${index}`} style={styles.radarLegendItem}>
                <View style={[styles.radarLegendDot, { 
                  backgroundColor: `rgb(${index * 80}, ${180 - index * 30}, 75)` 
                }]} />
                <Text style={styles.radarLegendText}>
                  {campaign.eventTitle?.substring(0, 20) || `Campaign ${index + 1}`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary Table */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Summary Comparison</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.summaryTable}>
              <View style={styles.tableHeader}>
                <View style={styles.tableHeaderCellCampaign}>
                  <Text style={styles.tableHeaderText}>Campaign</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Status</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Participation</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Goal %</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Avg Points</Text>
                </View>
                <View style={styles.tableHeaderCell}>
                  <Text style={styles.tableHeaderText}>Success Score</Text>
                </View>
              </View>
              
              {campaigns.map((campaign, index) => {
                const isBest = comparisonData?.analysis?.bestCampaign?.eventID === campaign.eventID;
                const isWorst = comparisonData?.analysis?.worstCampaign?.eventID === campaign.eventID;
                
                const participationRate = Number(campaign.normalizedMetrics?.participationRate) || 0;
                const goalAchievement = Number(campaign.normalizedMetrics?.goalAchievement) || 0;
                const avgPoints = Number(campaign.normalizedMetrics?.avgPointsPerParticipant) || 0;
                const successScore = Number(campaign.normalizedMetrics?.successScore) || 0;
                const breakdown = campaign.normalizedMetrics?.successScoreBreakdown;
                
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.tableRow,
                      isBest && styles.bestRow,
                      isWorst && styles.worstRow
                    ]}
                  >
                    <View style={styles.tableCellCampaign}>
                      <View style={styles.campaignNameRow}>
                        <View style={[styles.tableCampaignColorDot, { 
                          backgroundColor: `rgb(${index * 80}, ${180 - index * 30}, 75)` 
                        }]} />
                        <Text style={styles.tableCellTitle} numberOfLines={2}>
                          {campaign.eventTitle}
                        </Text>
                      </View>
                      <Text style={styles.tableCellCategory}>{campaign.eventCategory || 'General'}</Text>
                      {breakdown && (
                        <Text style={styles.breakdownText}>
                          Score breakdown: G{breakdown.goalContribution.toFixed(1)} + P{breakdown.participationContribution.toFixed(1)} + A{breakdown.avgPointsContribution.toFixed(1)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.tableCell}>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: campaign.status === 'Completed' ? '#4CAF50' : '#2196F3' }
                      ]}>
                        <Text style={styles.statusBadgeText}>{campaign.status}</Text>
                      </View>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.tableCellValue}>
                        {participationRate}
                      </Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={[
                        styles.tableCellValue,
                        { color: goalAchievement >= 80 ? '#2E7D32' : goalAchievement >= 50 ? '#FF9800' : '#F44336' }
                      ]}>
                        {goalAchievement}%
                      </Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.tableCellValue}>
                        {avgPoints.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={[
                        styles.tableCellValue,
                        { color: successScore >= 70 ? '#2E7D32' : successScore >= 50 ? '#FF9800' : '#F44336' }
                      ]}>
                        {successScore.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          
          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.bestDot]} />
              <Text style={styles.legendText}>Best performer</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.worstDot]} />
              <Text style={styles.legendText}>Needs improvement</Text>
            </View>
          </View>
        </View>

        {/* Key Insights */}
        {comparisonData?.analysis?.insights && comparisonData.analysis.insights.length > 0 && (
          <View style={styles.detailsCard}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>💡</Text>
              <Text style={styles.cardTitle}>Analysis Insights</Text>
            </View>
            
            {comparisonData.analysis.insights.map((insight, index) => (
              <View key={`insight-${index}`} style={styles.insightItem}>
                <Text style={styles.insightBullet}>•</Text>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Category Performance Analysis */}
        {Object.keys(categoryPerformance).length > 0 && (
          <View style={styles.detailsCard}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardIcon}>📊</Text>
              <Text style={styles.cardTitle}>Category Performance Analysis</Text>
            </View>
            
            <Text style={styles.optimalPointsSubtitle}>
              Performance analysis by event category:
            </Text>
            
            {Object.entries(categoryPerformance).map(([category, data], index) => (
              <View key={`category-${index}`} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{category}</Text>
                  <View style={styles.engagementScore}>
                    <Text style={styles.engagementScoreText}>
                      {isNaN(data.engagementScore) ? 0 : data.engagementScore}/100
                    </Text>
                    <Text style={styles.engagementScoreLabel}>Engagement</Text>
                  </View>
                </View>
                <View style={styles.categoryStats}>
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Avg Points per Participant:</Text>
                    <Text style={styles.categoryStatValue}>{data.avgPointsPerParticipant}</Text>
                  </View>
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Success Rate:</Text>
                    <Text style={styles.categoryStatValue}>{data.successRate}%</Text>
                  </View>
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Avg Success Score:</Text>
                    <Text style={styles.categoryStatValue}>{data.avgSuccessScore}</Text>
                  </View>
                  <View style={styles.categoryStat}>
                    <Text style={styles.categoryStatLabel}>Total Campaigns:</Text>
                    <Text style={styles.categoryStatValue}>{data.totalCampaigns}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.exportButton]}
            onPress={handleGenerateReport}
            disabled={exporting}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionButtonText}>
              {exporting ? 'Generating...' : 'Generate Report'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShareComparison}
          >
            <Text style={styles.actionIcon}>🔗</Text>
            <Text style={styles.actionButtonText}>Share Comparison</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Comparison ID: {comparisonData?.comparisonId} • {campaigns.length} campaigns • 5 metrics compared
          </Text>
          <Text style={styles.footerSubtext}>
            Success Score Formula: Goal % × 0.4 + Participation % × 0.3 + Avg Points % × 0.3
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F8FF'
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F0F8FF'
  },
  loadingText: { 
    marginTop: 15, 
    color: '#2E7D32',
    fontSize: 18,
    fontWeight: '600'
  },
  loadingSubtext: {
    marginTop: 8,
    color: '#5D6D7E',
    fontSize: 14,
  },
  scrollView: { 
    flex: 1,
  },

  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
  },
  campaignNamesContainer: {
    backgroundColor: '#F8FDFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  campaignNamesTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A5F7A',
    marginBottom: 10,
  },
  campaignNamesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  campaignNameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0F2F1',
    minWidth: '48%',
  },
  campaignColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  campaignNameText: {
    fontSize: 16,
    color: '#1A5F7A',
    fontWeight: '500',
    flexShrink: 1,
  },
  tableCampaignColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    marginTop: 4,
  },
  campaignNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  breakdownText: {
    fontSize: 10,
    color: '#78909C',
    fontStyle: 'italic',
    marginTop: 2,
    marginLeft: 18,
  },
  infoCard: {
    backgroundColor: '#F9FDFF',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A5F7A',
    marginBottom: 10,
  },
  successFormula: {
    fontSize: 14,
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  infoNote: {
    fontSize: 12,
    color: '#78909C',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0F2F1',
  },
  chartCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    paddingBottom: 25,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A5F7A',
    marginBottom: 5,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#78909C',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  emptyChartCard: {
    backgroundColor: '#F9FDFF',
    margin: 15,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0F2F1',
    borderStyle: 'dashed',
  },
  emptyChartText: {
    fontSize: 16,
    color: '#78909C',
    fontWeight: '500',
    marginBottom: 5,
  },
  emptyChartSubtext: {
    fontSize: 13,
    color: '#B0BEC5',
    textAlign: 'center',
  },
  chartLegendContainer: {
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5D6D7E',
    marginBottom: 8,
    textAlign: 'center',
  },
  customLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  customLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  customLegendText: {
    fontSize: 11,
    color: '#5D6D7E',
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
  },
  radarLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  radarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  radarLegendText: {
    fontSize: 12,
    color: '#5D6D7E',
  },
  detailsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A5F7A',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#2E7D32',
  },
  summaryTable: {
    minWidth: width * 1.5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FDFF',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#E0F2F1',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCellCampaign: {
    width: 200,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    width: 100,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A5F7A',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
  },
  bestRow: {
    backgroundColor: '#F1F8E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  worstRow: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  tableCellCampaign: {
    width: 200,
    paddingHorizontal: 8,
  },
  tableCell: {
    width: 100,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A5F7A',
    lineHeight: 18,
    flex: 1,
  },
  tableCellCategory: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
    marginLeft: 18,
  },
  tableCellValue: {
    fontSize: 14,
    color: '#5D6D7E',
    fontWeight: '500',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  bestDot: {
    backgroundColor: '#4CAF50',
  },
  worstDot: {
    backgroundColor: '#F44336',
  },
  legendText: {
    fontSize: 12,
    color: '#5D6D7E',
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  insightBullet: {
    fontSize: 16,
    color: '#2E7D32',
    marginRight: 10,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#5D6D7E',
    lineHeight: 20,
  },
  optimalPointsSubtitle: {
    fontSize: 14,
    color: '#78909C',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  categoryItem: {
    backgroundColor: '#F9FDFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A5F7A',
  },
  engagementScore: {
    alignItems: 'center',
  },
  engagementScoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  engagementScoreLabel: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 2,
  },
  categoryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryStat: {
    width: '50%',
    marginBottom: 8,
  },
  categoryStatLabel: {
    fontSize: 13,
    color: '#78909C',
    marginBottom: 2,
  },
  categoryStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A5F7A',
  },
  actionsContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exportButton: {
    backgroundColor: '#2196F3',
  },
  shareButton: {
    backgroundColor: '#9C27B0',
  },
  saveButton: {
    backgroundColor: '#FF9800',
  },
  actionIcon: {
    fontSize: 18,
    color: 'white',
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F8FDFF',
  },
  footerText: {
    fontSize: 13,
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#78909C',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
