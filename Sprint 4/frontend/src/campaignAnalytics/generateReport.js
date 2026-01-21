import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, ActivityIndicator,
  Dimensions, Modal, Share, Platform,
  Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Use the correct API base URL
const API_BASE_URL = 'http://10.0.2.2:5000';

export default function GenerateReportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { 
    reportType = 'Semester Summary',
    campaignIds = [],
    sourceScreen = 'CampaignAnalytics',
    campaignData = null,
    comparisonData = null,
    adminId = 'ADM001'
  } = route.params || {};
  
  const [generating, setGenerating] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reportFormat, setReportFormat] = useState('JSON');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  
  // Get report title based on report type
  const getReportTitle = () => {
    const dateStr = new Date().toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    if (reportType === 'Single campaign' && campaignData) {
      return `${campaignData.eventTitle} Report - ${dateStr}`;
    } else if (reportType === 'Comparative analysis' && campaignIds.length > 0) {
      return `Campaign Comparison Report - ${campaignIds.length} campaigns - ${dateStr}`;
    } else if (reportType === 'Semester Summary') {
      const semester = getCurrentSemester();
      return `UTM ReMerit ${semester} Semester Analytics Report - ${dateStr}`;
    }
    
    return `UTM ReMerit Campaign Analytics Report - ${dateStr}`;
  };

  const getCurrentSemester = () => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    
    if (month == 9 || month == 10 || month == 11 || month == 12 || month == 1 || month == 2) {
      return `${year}-1`;
    } else {
      return `${year}-2`;
    }
  };
  
  // Enhanced data fetching with proper error handling
  const fetchReportData = async () => {
    try {
      console.log(`Fetching report data for type: ${reportType}, IDs: ${campaignIds}`);
      
      let reportData = {};
      const reportTitle = getReportTitle();
      
      switch(reportType) {
        case 'Single campaign':
          if (campaignIds.length > 0) {
            const campaignId = campaignIds[0];
            console.log(`Fetching single campaign: ${campaignId}`);
            
            // Fetch campaign details from CampaignDetails view
            const campaignResponse = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`);
            if (!campaignResponse.ok) {
              throw new Error(`Failed to fetch campaign: ${campaignResponse.status}`);
            }
            
            const campaignResult = await campaignResponse.json();
            console.log('Campaign result:', campaignResult);
            
            if (!campaignResult.success || !campaignResult.campaign) {
              throw new Error(campaignResult.error || 'Campaign not found');
            }
            
            const campaign = campaignResult.campaign;
            
            // Debug log the campaign data
            console.log('Campaign data:', {
              id: campaign.eventID,
              title: campaign.eventTitle,
              participants: campaign.participants,
              pointsCollected: campaign.pointsCollected,
              goalPercent: campaign.goalPercent,
              averagePoints: campaign.averagePoints
            });
            
            // Fetch participation data
            const participationResponse = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}/participation`);
            const participationResult = participationResponse.ok ? await participationResponse.json() : { success: false };
            const participation = participationResult.success ? participationResult.participation : [];
            
            // Calculate additional stats
            const totalPoints = participation.reduce((sum, p) => sum + (p.rewardPointsEarned || 0), 0);
            const totalParticipants = participation.filter(p => p.participationStatus === 'Completed').length;
            const avgPointsPerParticipant = totalParticipants > 0 ? totalPoints / totalParticipants : 0;
            
            // Ensure numeric values are properly set
            const participants = Number(campaign.participants) || totalParticipants || 0;
            const pointsCollected = Number(campaign.pointsCollected) || totalPoints || 0;
            const goalPercent = Number(campaign.goalPercent) || 0;
            const averagePoints = Number(campaign.averagePoints) || avgPointsPerParticipant || 0;
            
            reportData = {
              reportTitle,
              reportType,
              campaign: {
                ...campaign,
                participants: participants,
                pointsCollected: pointsCollected,
                goalPercent: goalPercent,
                averagePoints: averagePoints,
                rewardPoints: Number(campaign.rewardPoints) || 0,
                UTMMeritPoints: Number(campaign.UTMMeritPoints) || 0
              },
              participation: {
                totalParticipants,
                totalPoints,
                list: participation
              },
              summary: {
                title: campaign.eventTitle || 'Unknown Campaign',
                category: campaign.eventCategory || 'Uncategorized',
                status: campaign.status || 'Unknown',
                participants: participants,
                pointsCollected: pointsCollected,
                goalPercent: goalPercent,
                averagePoints: averagePoints,
                startDate: campaign.eventStartDate,
                endDate: campaign.eventEndDate,
                createdBy: campaign.createdByName || 'Unknown'
              },
              insights: generateSingleCampaignInsights(campaign, totalPoints, totalParticipants),
              recommendations: generateSingleCampaignRecommendations(campaign, totalPoints, totalParticipants),
              generatedAt: new Date().toISOString(),
              reportDate: new Date().toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            };
            
            console.log('Single campaign report data:', reportData.summary);
          }
          break;
          
        case 'Comparative analysis':
          if (campaignIds.length > 0) {
            console.log(`Fetching comparison data for ${campaignIds.length} campaigns`);
            
            const campaigns = [];
            let totalParticipants = 0;
            let totalPoints = 0;
            let totalGoal = 0;
            let totalAvgPoints = 0;
            let validCampaignCount = 0;
            
            // Fetch each campaign individually to ensure we get all data
            for (const id of campaignIds) {
              const campaignResponse = await fetch(`${API_BASE_URL}/api/campaigns/${id}`);
              if (campaignResponse.ok) {
                const result = await campaignResponse.json();
                if (result.success && result.campaign) {
                  const campaign = result.campaign;
                  
                  // Ensure numeric values
                  const participants = Number(campaign.participants) || 0;
                  const pointsCollected = Number(campaign.pointsCollected) || 0;
                  const goalPercent = Number(campaign.goalPercent) || 0;
                  const averagePoints = Number(campaign.averagePoints) || 0;
                  
                  campaigns.push({
                    ...campaign,
                    participants: participants,
                    pointsCollected: pointsCollected,
                    goalPercent: goalPercent,
                    averagePoints: averagePoints
                  });
                  
                  // Accumulate totals
                  totalParticipants += participants;
                  totalPoints += pointsCollected;
                  totalGoal += goalPercent;
                  
                  if (averagePoints > 0) {
                    totalAvgPoints += averagePoints;
                    validCampaignCount++;
                  }
                }
              }
            }
            
            console.log(`Fetched ${campaigns.length} campaigns for comparison`);
            
            if (campaigns.length === 0) {
              throw new Error('No valid campaigns found');
            }
            
            // Calculate averages
            const avgGoal = campaigns.length > 0 ? totalGoal / campaigns.length : 0;
            const avgPoints = validCampaignCount > 0 ? totalAvgPoints / validCampaignCount : 0;
            
            // Find best and worst performers
            let bestCampaign = null;
            let worstCampaign = null;
            
            if (campaigns.length > 0) {
              const sortedByGoal = [...campaigns].sort((a, b) => b.goalPercent - a.goalPercent);
              bestCampaign = sortedByGoal[0];
              worstCampaign = sortedByGoal[sortedByGoal.length - 1];
            }
            
            reportData = {
              reportTitle,
              reportType,
              campaigns: campaigns,
              comparisonMetrics: {
                totalCampaigns: campaigns.length,
                totalParticipants: totalParticipants,
                totalPoints: totalPoints,
                averageGoal: avgGoal,
                averagePoints: avgPoints, // This was missing - now added!
                bestPerformer: bestCampaign ? bestCampaign.eventTitle : 'N/A',
                bestGoalPercent: bestCampaign ? bestCampaign.goalPercent : 0,
                worstPerformer: worstCampaign ? worstCampaign.eventTitle : 'N/A',
                worstGoalPercent: worstCampaign ? worstCampaign.goalPercent : 0
              },
              insights: generateComparisonInsights(campaigns),
              recommendations: generateComparisonRecommendations(campaigns),
              generatedAt: new Date().toISOString(),
              reportDate: new Date().toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            };
            
            console.log('Comparison report data:', reportData.comparisonMetrics);
          }
          break;
          
        case 'Semester Summary':
        default:
          console.log('Fetching semester summary data');
          
          try {
            // Fetch dashboard summary
            const summaryResponse = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
            if (!summaryResponse.ok) {
              throw new Error('Failed to fetch dashboard summary');
            }
            
            const summaryResult = await summaryResponse.json();
            console.log('📊 Dashboard summary RAW DATA:', summaryResult);
            
            if (!summaryResult.success) {
              throw new Error('Failed to fetch dashboard summary');
            }
            
            const summary = summaryResult.summary || {};
            console.log('📊 Summary object:', JSON.stringify(summary, null, 2));
            
            // Log all properties to see what's available
            console.log('📊 All summary properties:');
            Object.keys(summary).forEach(key => {
              console.log(`  ${key}: ${summary[key]} (type: ${typeof summary[key]})`);
            });
            
            // Fetch all campaigns
            const campaignsResponse = await fetch(`${API_BASE_URL}/api/campaigns`);
            if (!campaignsResponse.ok) {
              throw new Error('Failed to fetch campaigns');
            }
            
            const campaignsResult = await campaignsResponse.json();
            if (!campaignsResult.success) {
              throw new Error('Failed to fetch campaigns');
            }
            
            const allCampaigns = campaignsResult.campaigns || [];
            console.log(`Fetched ${allCampaigns.length} total campaigns`);
            
            // Process campaigns to ensure numeric values
            const processedCampaigns = allCampaigns.map(campaign => ({
              ...campaign,
              participants: Number(campaign.participants) || 0,
              pointsCollected: Number(campaign.pointsCollected) || 0,
              goalPercent: Number(campaign.goalPercent) || 0,
              averagePoints: Number(campaign.averagePoints) || 0,
              rewardPoints: Number(campaign.rewardPoints) || 0,
              UTMMeritPoints: Number(campaign.UTMMeritsPoints) || 0
            }));
            
            // Get status distribution
            const statusResponse = await fetch(`${API_BASE_URL}/api/campaigns/status-distribution`);
            const statusResult = statusResponse.ok ? await statusResponse.json() : { success: false };
            const statusDistribution = statusResult.success ? statusResult.distribution : [];
            
            // Get top campaigns
            const completedCampaigns = processedCampaigns.filter(c => c.status === 'Completed');
            const topCampaigns = [...completedCampaigns]
              .sort((a, b) => (b.goalPercent || 0) - (a.goalPercent || 0))
              .slice(0, 5);
            
            // Calculate category breakdown
            const categoryBreakdown = {};
            processedCampaigns.forEach(campaign => {
              const category = campaign.eventCategory || 'Uncategorized';
              if (!categoryBreakdown[category]) {
                categoryBreakdown[category] = {
                  count: 1,
                  totalParticipants: campaign.participants || 0,
                  totalPoints: campaign.pointsCollected || 0,
                  avgGoalPercent: campaign.goalPercent || 0,
                  completed: campaign.status === 'Completed' ? 1 : 0
                };
              } else {
                categoryBreakdown[category].count++;
                categoryBreakdown[category].totalParticipants += campaign.participants || 0;
                categoryBreakdown[category].totalPoints += campaign.pointsCollected || 0;
                categoryBreakdown[category].avgGoalPercent = 
                  (categoryBreakdown[category].avgGoalPercent + (campaign.goalPercent || 0)) / 2;
                if (campaign.status === 'Completed') {
                  categoryBreakdown[category].completed++;
                }
              }
            });
            
            // Convert category breakdown to array
            const categoryArray = Object.entries(categoryBreakdown).map(([name, data]) => ({
              name,
              ...data,
              successRate: data.completed / data.count * 100
            }));
            
            // IMPORTANT: Use the actual values from the API response
            reportData = {
              reportTitle,
              reportType: 'Semester Summary',
              semester: getCurrentSemester(),
              summary: {
                // Use the actual values from the API response
                totalCampaigns: Number(summary.totalCampaigns) || processedCampaigns.length,
                totalParticipants: Number(summary.totalParticipants) || 0,
                totalPointsCollected: Number(summary.totalPointsCollected) || 0,
                avgGoalAchievement: Number(summary.avgGoalAchievement) || 0,
                avgPointsPerParticipant: Number(summary.avgPointsPerParticipant) || 0,
                completedCampaigns: Number(summary.completedCampaigns) || completedCampaigns.length,
                ongoingCampaigns: Number(summary.ongoingCampaigns) || processedCampaigns.filter(c => c.status === 'Ongoing').length,
                upcomingCampaigns: Number(summary.upcomingCampaigns) || processedCampaigns.filter(c => c.status === 'Upcoming').length,
                statusDistribution: statusDistribution
              },
              campaigns: processedCampaigns,
              categoryBreakdown: categoryArray,
              topCampaigns,
              insights: generateSemesterInsights(processedCampaigns, summary),
              recommendations: generateSemesterRecommendations(processedCampaigns, summary),
              generatedAt: new Date().toISOString(),
              reportDate: new Date().toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            };
            
            console.log('📊 Final report data summary:', reportData.summary);
            console.log('📊 Points collected:', reportData.summary.totalPointsCollected);
            console.log('📊 Avg points:', reportData.summary.avgPointsPerParticipant);
            
          } catch (error) {
            console.error('Error fetching semester data:', error);
            throw error;
          }
          break;
      }
      
      return reportData;
      
    } catch (error) {
      console.error('Error fetching report data:', error);
      throw new Error(`Failed to fetch report data: ${error.message}`);
    }
  };
  
  // Insight generation functions
  const generateSingleCampaignInsights = (campaign, totalPoints, totalParticipants) => {
    const insights = [];
    const goalPercent = Number(campaign.goalPercent) || 0;
    const participants = Number(campaign.participants) || totalParticipants || 0;
    const points = Number(campaign.pointsCollected) || totalPoints || 0;
    
    if (goalPercent > 0) {
      if (goalPercent >= 100) {
        insights.push(`Exceeded target by ${(goalPercent - 100).toFixed(1)}%`);
      } else if (goalPercent >= 80) {
        insights.push(`Achieved ${goalPercent.toFixed(1)}% of target`);
      } else if (goalPercent >= 50) {
        insights.push(`Moderate performance: ${goalPercent.toFixed(1)}% goal achievement`);
      } else {
        insights.push(`Fell short of target by ${(100 - goalPercent).toFixed(1)}%`);
      }
    } else {
      insights.push(`No goal achievement data available`);
    }
    
    if (participants > 0) {
      insights.push(`${participants} participants engaged`);
    } else {
      insights.push(`No participation data available`);
    }
    
    if (points > 0) {
      insights.push(`${points.toLocaleString()} points collected`);
    }
    
    const avgPoints = Number(campaign.averagePoints) || 0;
    if (avgPoints > 0) {
      if (avgPoints > 50) {
        insights.push(`High average of ${avgPoints.toFixed(1)} points per participant`);
      } else {
        insights.push(`Average of ${avgPoints.toFixed(1)} points per participant`);
      }
    }
    
    if (campaign.status === 'Completed') {
      insights.push(`Campaign successfully completed`);
    } else if (campaign.status === 'Ongoing') {
      insights.push(`Campaign currently in progress`);
    } else if (campaign.status === 'Upcoming') {
      insights.push(`Campaign scheduled for future`);
    }
    
    return insights;
  };
  
  const generateComparisonInsights = (campaigns) => {
    const insights = [];
    
    if (campaigns.length === 0) return ['No campaigns to compare'];
    
    // Filter campaigns with valid goal data
    const validCampaigns = campaigns.filter(c => (Number(c.goalPercent) || 0) > 0);
    
    if (validCampaigns.length === 0) {
      insights.push('No goal achievement data available for comparison');
      return insights;
    }
    
    // Find best and worst
    const sorted = [...validCampaigns].sort((a, b) => 
      (Number(b.goalPercent) || 0) - (Number(a.goalPercent) || 0)
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    if (best.goalPercent) {
      insights.push(`Best performer: ${best.eventTitle} (${Number(best.goalPercent).toFixed(1)}% goal)`);
    }
    
    if (worst.goalPercent && worst.goalPercent < 80) {
      insights.push(`Needs improvement: ${worst.eventTitle} (${Number(worst.goalPercent).toFixed(1)}% goal)`);
    }
    
    const totalParticipants = validCampaigns.reduce((sum, c) => sum + (Number(c.participants) || 0), 0);
    const totalPoints = validCampaigns.reduce((sum, c) => sum + (Number(c.pointsCollected) || 0), 0);
    const avgGoal = validCampaigns.reduce((sum, c) => sum + (Number(c.goalPercent) || 0), 0) / validCampaigns.length;
    
    // Calculate average points
    const campaignsWithAvgPoints = validCampaigns.filter(c => (Number(c.averagePoints) || 0) > 0);
    const avgPoints = campaignsWithAvgPoints.length > 0 
      ? campaignsWithAvgPoints.reduce((sum, c) => sum + (Number(c.averagePoints) || 0), 0) / campaignsWithAvgPoints.length
      : 0;
    
    if (totalParticipants > 0) {
      insights.push(`Total participants across ${validCampaigns.length} campaigns: ${totalParticipants}`);
    }
    
    if (totalPoints > 0) {
      insights.push(`Total points collected: ${totalPoints.toLocaleString()}`);
    }
    
    insights.push(`Average goal achievement: ${avgGoal.toFixed(1)}%`);
    
    if (avgPoints > 0) {
      insights.push(`Average points per campaign: ${avgPoints.toFixed(1)}`);
    }
    
    // Category analysis
    const categories = {};
    validCampaigns.forEach(c => {
      const cat = c.eventCategory || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && topCategory[1] > 1) {
      insights.push(`Most compared category: ${topCategory[0]} (${topCategory[1]} campaigns)`);
    }
    
    return insights;
  };
  
  const generateSemesterInsights = (campaigns, summary) => {
    const insights = [];
    
    insights.push(`Analyzed ${campaigns.length} total campaigns this semester`);
    
    const completed = campaigns.filter(c => c.status === 'Completed').length;
    const ongoing = campaigns.filter(c => c.status === 'Ongoing').length;
    const upcoming = campaigns.filter(c => c.status === 'Upcoming').length;
    
    if (completed > 0) {
      insights.push(`${completed} campaigns successfully completed`);
    }
    
    if (ongoing > 0) {
      insights.push(`${ongoing} campaigns currently ongoing`);
    }
    
    if (upcoming > 0) {
      insights.push(`${upcoming} campaigns scheduled for future`);
    }
    
    // Use summary data from API
    const totalParticipants = Number(summary.totalParticipants) || 0;
    const totalPoints = Number(summary.totalPointsCollected) || 0;
    const avgGoal = Number(summary.avgGoalAchievement) || 0;
    const avgPoints = Number(summary.avgPointsPerParticipant) || 0;
    
    if (totalParticipants > 0) {
      insights.push(`${totalParticipants.toLocaleString()} total participants engaged`);
    }
    
    if (totalPoints > 0) {
      insights.push(`${totalPoints.toLocaleString()} total points collected`);
    }
    
    if (avgGoal > 0) {
      if (avgGoal >= 80) {
        insights.push(`Excellent average goal achievement: ${avgGoal.toFixed(1)}%`);
      } else if (avgGoal >= 60) {
        insights.push(`Average goal achievement: ${avgGoal.toFixed(1)}%`);
      } else {
        insights.push(`Below average goal achievement: ${avgGoal.toFixed(1)}%`);
      }
    }
    
    if (avgPoints > 0) {
      insights.push(`Average points per participant: ${avgPoints.toFixed(1)}`);
    }
    
    // Category insights
    const categories = {};
    campaigns.forEach(c => {
      const cat = c.eventCategory || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && topCategory[1] > 0) {
      insights.push(`Most active category: ${topCategory[0]} (${topCategory[1]} campaigns)`);
    }
    
    // Calculate participation rate
    const campaignsWithParticipants = campaigns.filter(c => (c.participants || 0) > 0);
    if (campaignsWithParticipants.length > 0) {
      const avgParticipants = campaignsWithParticipants.reduce((sum, c) => sum + (c.participants || 0), 0) / campaignsWithParticipants.length;
      insights.push(`Average participants per campaign: ${avgParticipants.toFixed(0)}`);
    }
    
    return insights;
  };
  
  // Recommendation generation functions
  const generateSingleCampaignRecommendations = (campaign, totalPoints, totalParticipants) => {
    const recommendations = [];
    const goalPercent = Number(campaign.goalPercent) || 0;
    const participants = Number(campaign.participants) || totalParticipants || 0;
    
    if (goalPercent > 0 && goalPercent < 80) {
      recommendations.push("Increase promotion through social media and campus channels");
      recommendations.push("Consider extending campaign duration for better reach");
      recommendations.push("Review and adjust participation incentives");
    }
    
    if (participants < 10 && campaign.status === 'Completed') {
      recommendations.push("Partner with student clubs for wider participation next time");
      recommendations.push("Offer additional incentives for early registration");
    }
    
    const avgPoints = Number(campaign.averagePoints) || 0;
    if (avgPoints > 0 && avgPoints < 30) {
      recommendations.push("Review and adjust point rewards to increase engagement");
    }
    
    if (campaign.status === 'Upcoming') {
      recommendations.push("Use insights from similar past campaigns for planning");
      recommendations.push("Set clear participation targets and tracking methods");
    }
    
    if (recommendations.length === 0) {
      if (goalPercent >= 80) {
        recommendations.push("Continue successful strategies for future campaigns");
        recommendations.push("Consider expanding to additional campus locations");
      } else {
        recommendations.push("Analyze participation barriers and address them");
        recommendations.push("Improve campaign visibility through multiple channels");
      }
    }
    
    return recommendations;
  };
  
  const generateComparisonRecommendations = (campaigns) => {
    const recommendations = [];
    
    if (campaigns.length === 0) return ['No recommendations available'];
    
    // Find best performing campaign
    const validCampaigns = campaigns.filter(c => (Number(c.goalPercent) || 0) > 0);
    if (validCampaigns.length > 0) {
      const bestCampaign = [...validCampaigns].sort((a, b) => 
        (Number(b.goalPercent) || 0) - (Number(a.goalPercent) || 0)
      )[0];
      
      if (bestCampaign) {
        recommendations.push(`Apply successful strategies from "${bestCampaign.eventTitle}" to other campaigns`);
      }
    }
    
    recommendations.push("Review timing and duration of underperforming campaigns");
    recommendations.push("Standardize promotion methods across all campaigns");
    
    const lowPerformance = campaigns.filter(c => (Number(c.goalPercent) || 0) < 70);
    if (lowPerformance.length > 0) {
      recommendations.push(`Provide additional support for ${lowPerformance.length} underperforming campaigns`);
    }
    
    // Category-based recommendations
    const categories = {};
    campaigns.forEach(c => {
      const cat = c.eventCategory || 'Uncategorized';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(c);
    });
    
    Object.entries(categories).forEach(([category, catCampaigns]) => {
      if (catCampaigns.length > 1) {
        const avgGoal = catCampaigns.reduce((sum, c) => sum + (Number(c.goalPercent) || 0), 0) / catCampaigns.length;
        if (avgGoal < 70) {
          recommendations.push(`Review strategies for ${category} campaigns (avg: ${avgGoal.toFixed(1)}%)`);
        }
      }
    });
    
    return recommendations;
  };
  
  const generateSemesterRecommendations = (campaigns, summary) => {
    const recommendations = [];
    
    const avgGoal = Number(summary.avgGoalAchievement) || 0;
    
    if (avgGoal < 70) {
      recommendations.push("Conduct training for campaign organizers on goal setting");
      recommendations.push("Review and adjust campaign planning processes");
      recommendations.push("Implement regular progress tracking for ongoing campaigns");
    }
    
    const upcomingCount = campaigns.filter(c => c.status === 'Upcoming').length;
    if (upcomingCount > 0) {
      recommendations.push(`Apply lessons learned to ${upcomingCount} upcoming campaigns`);
    }
    
    // Check for low participation campaigns
    const lowParticipation = campaigns.filter(c => 
      c.status === 'Completed' && (Number(c.participants) || 0) < 5
    ).length;
    
    if (lowParticipation > 0) {
      recommendations.push("Improve marketing strategies for better participation rates");
      recommendations.push("Consider smaller, more focused campaigns for better engagement");
    }
    
    // Category-based recommendations
    const categories = {};
    campaigns.forEach(c => {
      const cat = c.eventCategory || 'Uncategorized';
      if (!categories[cat]) categories[cat] = { count: 0, totalGoal: 0 };
      categories[cat].count++;
      categories[cat].totalGoal += Number(c.goalPercent) || 0;
    });
    
    Object.entries(categories).forEach(([category, data]) => {
      const avgCategoryGoal = data.totalGoal / Math.max(data.count, 1);
      if (avgCategoryGoal < 60 && data.count > 2) {
        recommendations.push(`Review effectiveness of ${category} campaigns (avg: ${avgCategoryGoal.toFixed(1)}%)`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push("Continue current successful strategies");
      recommendations.push("Consider expanding campaign categories based on popularity");
      recommendations.push("Increase digital promotion through UTM ReMerit app");
    }
    
    return recommendations;
  };
  
  // Generate JSON report
  const generateJSONReport = async () => {
    try {
      setGenerating(true);
      
      // 1. Fetch data from MySQL
      const reportData = await fetchReportData();
      console.log('Fetched report data successfully');
      
      // 2. Prepare report for database
      const reportConfig = {
        reportType,
        campaignIds,
        format: 'JSON',
        generatedAt: new Date().toISOString(),
        sourceScreen,
        semester: getCurrentSemester()
      };
      
      const reportForDB = {
        reportTitle: reportData.reportTitle,
        reportType,
        createdBy: adminId,
        reportConfig: JSON.stringify(reportConfig),
        reportData: JSON.stringify(reportData),
        downloadCount: 0
      };
      
      console.log('Saving report to database...');
      
      // 3. Save report to database
      const saveResponse = await fetch(`${API_BASE_URL}/api/reports/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportForDB)
      });
      
      const saveResult = await saveResponse.json();
      
      if (saveResult.success) {
        // 4. Set generated report and show modal
        setGeneratedReport(reportData);
        setDownloadUrl(saveResult.downloadUrl || '');
        setReportModalVisible(true);
        
        Alert.alert(
          'Report Generated & Saved',
          `${reportData.reportTitle} has been generated and saved to database successfully!\n\nReport ID: ${saveResult.reportId}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Save Failed', saveResult.error || 'Failed to save report to database');
      }
      
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to generate report. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGenerating(false);
    }
  };
  
  // Generate PDF report
  const generatePDFReport = async () => {
    try {
      setGeneratingPDF(true);
      
      // 1. Fetch data from MySQL
      const reportData = await fetchReportData();
      console.log('Fetched data for PDF report');
      
      // 2. Generate PDF on server
      const pdfResponse = await fetch(`${API_BASE_URL}/api/reports/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData: reportData,
          reportType: reportType
        })
      });
      
      // Check if response is OK
      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.error('PDF generation failed:', errorText);
        throw new Error(`Server error: ${pdfResponse.status}`);
      }
      
      const pdfResult = await pdfResponse.json();
      console.log('PDF result:', pdfResult);
      
      if (pdfResult.success) {
        // Construct the download URL
        const downloadUrl = `${API_BASE_URL}${pdfResult.downloadUrl || `/api/reports/download-pdf/${new Date().getTime()}`}`;
        setPdfUrl(downloadUrl);
        
        // Show compact alert with options
        Alert.alert(
          'PDF Generated',
          'Report ready',
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => console.log('Cancelled')
            },
            { 
              text: 'Open', 
              onPress: () => {
                console.log('Opening PDF:', downloadUrl);
                Linking.openURL(downloadUrl).catch(err => {
                  console.error('Failed to open URL:', err);
                  Alert.alert('Error', 'Could not open PDF. Please try downloading manually.');
                });
              }
            },
            { 
              text: 'Share', 
              onPress: () => sharePDFLink(downloadUrl, reportData.reportTitle)
            }
          ],
          { cancelable: true }
        );
      } else {
        Alert.alert(
          'PDF Generation Failed', 
          pdfResult.error || 'Server could not generate PDF. Please try JSON format instead.'
        );
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to generate PDF report. Please check if Flask server is running and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingPDF(false);
    }
  };
  
  // Share PDF link function
  const sharePDFLink = async (url, title) => {
    try {
      const message = `UTM ReMerit Report: ${title}\n\nDownload: ${url}`;
      
      await Share.share({
        title: 'UTM ReMerit Report',
        message: message
      });
    } catch (error) {
      console.error('Error sharing PDF link:', error);
      Alert.alert('Share Failed', 'Could not share report link');
    }
  };
  
  // Main generate function
  const generateReport = async () => {
    if (reportFormat === 'JSON') {
      await generateJSONReport();
    } else if (reportFormat === 'PDF') {
      await generatePDFReport();
    }
  };
  
  // Share report function
  const shareReport = async () => {
    if (!generatedReport) return;
    
    try {
      const shareContent = {
        title: generatedReport.reportTitle || getReportTitle(),
        message: formatReportForSharing(generatedReport),
        url: downloadUrl ? `${API_BASE_URL}${downloadUrl}` : undefined
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Share Failed', 'Could not share report');
    }
  };
  
  // Format report for sharing
  // Format report for sharing - MODIFIED
const formatReportForSharing = (report) => {
  let shareText = `${report.reportTitle || getReportTitle()}\n\n`;
  
  // Extract data properly based on report type
  let totalCampaigns = 0;
  let totalParticipants = 0;
  let totalPoints = 0;
  let goalPercent = 0;
  let avgPoints = 0;
  let completedCampaigns = 0;
  let ongoingCampaigns = 0;
  let upcomingCampaigns = 0;
  
  // Get report type
  const currentReportType = report.reportType || reportType;
  
  if (report.summary) {
    totalCampaigns = Number(report.summary.totalCampaigns) || 0;
    totalParticipants = Number(report.summary.totalParticipants) || 0;
    totalPoints = Number(report.summary.totalPointsCollected) || 0;
    goalPercent = Number(report.summary.avgGoalAchievement) || Number(report.summary.goalPercent) || 0;
    avgPoints = Number(report.summary.avgPointsPerParticipant) || Number(report.summary.averagePoints) || 0;
    completedCampaigns = Number(report.summary.completedCampaigns) || 0;
    ongoingCampaigns = Number(report.summary.ongoingCampaigns) || 0;
    upcomingCampaigns = Number(report.summary.upcomingCampaigns) || 0;
  }
  
  // For single campaign - MODIFIED
  if (currentReportType === 'Single campaign' && report.campaign) {
    totalParticipants = Number(report.campaign.participants) || 0;
    totalPoints = Number(report.campaign.pointsCollected) || 0;
    goalPercent = Number(report.campaign.goalPercent) || 0;
    avgPoints = Number(report.campaign.averagePoints) || 0;
    
    // Get campaign details
    const campaignTitle = report.campaign.eventTitle || 'Unknown Campaign';
    const campaignCategory = report.campaign.eventCategory || 'Uncategorized';
    const campaignStatus = report.campaign.status || 'Unknown';
    const startDate = report.campaign.eventStartDate || 'N/A';
    const endDate = report.campaign.eventEndDate || 'N/A';
    const createdBy = report.campaign.createdByName || 'Unknown';
    
    shareText += `Campaign: ${campaignTitle}\n`;
    shareText += `Category: ${campaignCategory}\n`;
    shareText += `Status: ${campaignStatus}\n`;
    shareText += `Period: ${startDate} to ${endDate}\n`;
    if (createdBy !== 'Unknown') {
      shareText += `Created by: ${createdBy}\n`;
    }
    shareText += `\n`;
    
    shareText += `Performance Summary:\n`;
    shareText += `• Participants: ${totalParticipants}\n`;
    shareText += `• Points Collected: ${totalPoints.toLocaleString()}\n`;
    shareText += `• Goal Achievement: ${goalPercent.toFixed(1)}%\n`;
    
    if (avgPoints > 0) {
      shareText += `• Avg Points per Participant: ${avgPoints.toFixed(1)}\n`;
    }
    
  } else if (currentReportType === 'Comparative analysis' && report.comparisonMetrics) {
    // For comparative analysis
    totalCampaigns = Number(report.comparisonMetrics.totalCampaigns) || 0;
    totalParticipants = Number(report.comparisonMetrics.totalParticipants) || 0;
    totalPoints = Number(report.comparisonMetrics.totalPoints) || 0;
    goalPercent = Number(report.comparisonMetrics.averageGoal) || 0;
    avgPoints = Number(report.comparisonMetrics.averagePoints) || 0;
    
    shareText += `Comparative Analysis:\n`;
    shareText += `• Total Campaigns Compared: ${totalCampaigns}\n`;
    shareText += `• Total Participants: ${totalParticipants}\n`;
    shareText += `• Total Points: ${totalPoints.toLocaleString()}\n`;
    shareText += `• Average Goal Achievement: ${goalPercent.toFixed(1)}%\n`;
    
    if (avgPoints > 0) {
      shareText += `• Average Points per Campaign: ${avgPoints.toFixed(1)}\n`;
    }
    
    // Add best/worst performers if available
    if (report.comparisonMetrics.bestPerformer && report.comparisonMetrics.bestPerformer !== 'N/A') {
      shareText += `• Best Performer: ${report.comparisonMetrics.bestPerformer} (${report.comparisonMetrics.bestGoalPercent?.toFixed(1)}%)\n`;
    }
    
  } else {
    // For semester summary or default
    shareText += `Summary:\n`;
    
    // Only add total campaigns for non-single campaign reports
    if (currentReportType !== 'Single campaign' && totalCampaigns > 0) {
      shareText += `• Total Campaigns: ${totalCampaigns}\n`;
    }
    
    shareText += `• Total Participants: ${totalParticipants}\n`;
    shareText += `• Total Points: ${totalPoints.toLocaleString()}\n`;
    shareText += `• Goal Achievement: ${goalPercent.toFixed(1)}%\n`;
    
    if (avgPoints > 0) {
      shareText += `• Avg Points per Participant: ${avgPoints.toFixed(1)}\n`;
    }
    
    if (completedCampaigns > 0) {
      shareText += `• Completed Campaigns: ${completedCampaigns}\n`;
    }
    if (ongoingCampaigns > 0) {
      shareText += `• Ongoing Campaigns: ${ongoingCampaigns}\n`;
    }
    if (upcomingCampaigns > 0) {
      shareText += `• Upcoming Campaigns: ${upcomingCampaigns}\n`;
    }
  }
  
  shareText += '\n';
  
  // Insights section
  if (report.insights && Array.isArray(report.insights) && report.insights.length > 0) {
    shareText += `Insights:\n`;
    report.insights.forEach(insight => {
      shareText += `• ${insight}\n`;
    });
    shareText += '\n';
  }
  
  // Recommendations section
  if (report.recommendations && Array.isArray(report.recommendations) && report.recommendations.length > 0) {
    shareText += `Recommendations:\n`;
    report.recommendations.forEach(rec => {
      shareText += `• ${rec}\n`;
    });
    shareText += '\n';
  }
  
  shareText += `Generated: ${new Date().toLocaleDateString()}\n`;
  shareText += `via UTM ReMerit Analytics`;
  
  return shareText;
};
  
  // Render report information
  const renderReportInfo = () => {
    return (
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          {reportType === 'Single campaign' ? 'Single Campaign Report' : 
           reportType === 'Comparative analysis' ? 'Comparative Analysis Report' : 
           'Semester Summary Report'}
        </Text>
        
        <View style={styles.infoDetails}>
          {reportType === 'Single campaign' && campaignIds.length > 0 && (
            <>
              <Text style={styles.infoLabel}>Campaign ID:</Text>
              <Text style={styles.infoValue}>{campaignIds[0]}</Text>
              {campaignData?.eventTitle && (
                <>
                  <Text style={styles.infoLabel}>Campaign:</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>{campaignData.eventTitle}</Text>
                </>
              )}
            </>
          )}
          
          {reportType === 'Comparative analysis' && campaignIds.length > 0 && (
            <>
              <Text style={styles.infoLabel}>Compared Campaigns:</Text>
              <Text style={styles.infoValue}>{campaignIds.length} campaigns</Text>
            </>
          )}
          
          {reportType === 'Semester Summary' && (
            <>
              <Text style={styles.infoLabel}>Report Scope:</Text>
              <Text style={styles.infoValue}>All campaigns in system</Text>
              <Text style={styles.infoLabel}>Semester:</Text>
              <Text style={styles.infoValue}>{getCurrentSemester()}</Text>
              <Text style={styles.infoLabel}>Report Period:</Text>
              <Text style={styles.infoValue}>
                {new Date().toLocaleDateString('en-MY', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Text>
            </>
          )}
          
          <Text style={styles.infoLabel}>Source:</Text>
          <Text style={styles.infoValue}>
            {sourceScreen === 'CampaignDetail' ? 'Campaign Details' : 
             sourceScreen === 'CampaignComparison' ? 'Campaign Comparison' : 
             'Campaign Analytics Dashboard'}
          </Text>
          
          <Text style={styles.infoLabel}>Format:</Text>
          <Text style={styles.infoValue}>{reportFormat}</Text>
        </View>
      </View>
    );
  };
  
  // Render report preview modal - FIXED
  const renderReportPreview = () => {
    if (!generatedReport) return null;
    
    // Extract data properly
    let displayData = {
      title: generatedReport.reportTitle || getReportTitle(),
      type: generatedReport.reportType || reportType,
      semester: generatedReport.semester,
      generatedAt: generatedReport.generatedAt || new Date().toISOString(),
      reportDate: generatedReport.reportDate,
      
      // Summary data
      summary: {
        totalCampaigns: Number(generatedReport.summary?.totalCampaigns) || 0,
        totalParticipants: Number(generatedReport.summary?.totalParticipants) || 0,
        totalPointsCollected: Number(generatedReport.summary?.totalPointsCollected) || 0,
        avgGoalAchievement: Number(generatedReport.summary?.avgGoalAchievement) || 0,
        avgPointsPerParticipant: Number(generatedReport.summary?.avgPointsPerParticipant) || 0,
        goalPercent: Number(generatedReport.summary?.goalPercent) || 0,
        averagePoints: Number(generatedReport.summary?.averagePoints) || 0,
        completedCampaigns: Number(generatedReport.summary?.completedCampaigns) || 0,
        ongoingCampaigns: Number(generatedReport.summary?.ongoingCampaigns) || 0,
        upcomingCampaigns: Number(generatedReport.summary?.upcomingCampaigns) || 0
      },
      
      // Campaign specific data
      campaign: generatedReport.campaign ? {
        ...generatedReport.campaign,
        participants: Number(generatedReport.campaign.participants) || 0,
        pointsCollected: Number(generatedReport.campaign.pointsCollected) || 0,
        goalPercent: Number(generatedReport.campaign.goalPercent) || 0,
        averagePoints: Number(generatedReport.campaign.averagePoints) || 0
      } : null,
      
      // Comparison metrics
      comparisonMetrics: generatedReport.comparisonMetrics ? {
        ...generatedReport.comparisonMetrics,
        totalCampaigns: Number(generatedReport.comparisonMetrics.totalCampaigns) || 0,
        totalParticipants: Number(generatedReport.comparisonMetrics.totalParticipants) || 0,
        totalPoints: Number(generatedReport.comparisonMetrics.totalPoints) || 0,
        averageGoal: Number(generatedReport.comparisonMetrics.averageGoal) || 0,
        averagePoints: Number(generatedReport.comparisonMetrics.averagePoints) || 0
      } : null,
      
      // Other data
      insights: generatedReport.insights || [],
      recommendations: generatedReport.recommendations || []
    };
    
    return (
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {displayData.title}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Modal Content */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.reportPreview}>
                {/* Report Header */}
                <View style={styles.reportHeader}>
                  <Text style={styles.reportMainTitle}>
                    {displayData.title}
                  </Text>
                  <Text style={styles.reportSubtitle}>
                    {displayData.type}
                    {displayData.semester && ` • ${displayData.semester}`}
                  </Text>
                  <Text style={styles.reportDate}>
                    Generated: {new Date(displayData.generatedAt).toLocaleDateString()}
                    {displayData.reportDate && ` • ${displayData.reportDate}`}
                  </Text>
                </View>
                
                {/* Summary Section - FIXED */}
                <View style={styles.reportSection}>
                  <Text style={styles.sectionTitle}>📊 Executive Summary</Text>
                  
                  {/* For single campaign */}
                  {reportType === 'Single campaign' && displayData.campaign && (
                    <View style={styles.campaignSummary}>
                      <Text style={styles.campaignSummaryTitle}>{displayData.campaign.eventTitle}</Text>
                      <View style={styles.campaignDetails}>
                        <Text style={styles.campaignDetail}>Category: {displayData.campaign.eventCategory || 'N/A'}</Text>
                        <Text style={styles.campaignDetail}>Status: {displayData.campaign.status || 'N/A'}</Text>
                        <Text style={styles.campaignDetail}>Period: {displayData.campaign.eventStartDate} to {displayData.campaign.eventEndDate}</Text>
                        <Text style={styles.campaignDetail}>Created by: {displayData.campaign.createdByName || 'N/A'}</Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.summaryGrid}>
                    {/* Campaigns/Participants */}
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>
                        {reportType === 'Single campaign' ? 'Participants' : 'Total Campaigns'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {reportType === 'Single campaign' 
                          ? displayData.campaign?.participants || 0
                          : reportType === 'Comparative analysis'
                          ? displayData.comparisonMetrics?.totalCampaigns || 0
                          : displayData.summary.totalCampaigns || 0}
                      </Text>
                    </View>
                    
                    {/* Points Collected */}
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Points Collected</Text>
                      <Text style={styles.summaryValue}>
                        {(
                          reportType === 'Single campaign' 
                            ? displayData.campaign?.pointsCollected 
                            : reportType === 'Comparative analysis'
                            ? displayData.comparisonMetrics?.totalPoints
                            : displayData.summary.totalPointsCollected
                        )?.toLocaleString() || '0'}
                      </Text>
                    </View>
                    
                    {/* Goal % */}
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>
                        {reportType === 'Single campaign' ? 'Goal %' : 'Avg Goal %'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {(
                          reportType === 'Single campaign' 
                            ? displayData.campaign?.goalPercent 
                            : reportType === 'Comparative analysis'
                            ? displayData.comparisonMetrics?.averageGoal
                            : displayData.summary.avgGoalAchievement
                        )?.toFixed(1) || '0.0'}%
                      </Text>
                    </View>
                    
                    {/* Avg Points - FIXED */}
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Avg Points</Text>
                      <Text style={styles.summaryValue}>
                        {(
                          reportType === 'Single campaign' 
                            ? displayData.campaign?.averagePoints 
                            : reportType === 'Comparative analysis'
                            ? displayData.comparisonMetrics?.averagePoints // This was missing before!
                            : displayData.summary.avgPointsPerParticipant
                        )?.toFixed(1) || '0.0'}
                      </Text>
                    </View>
                    
                    {/* Only for semester summary */}
                    {reportType === 'Semester Summary' && (
                      <>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Completed</Text>
                          <Text style={styles.summaryValue}>
                            {displayData.summary.completedCampaigns || 0}
                          </Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Ongoing</Text>
                          <Text style={styles.summaryValue}>
                            {displayData.summary.ongoingCampaigns || 0}
                          </Text>
                        </View>
                        <View style={styles.summaryItem}>
                          <Text style={styles.summaryLabel}>Upcoming</Text>
                          <Text style={styles.summaryValue}>
                            {displayData.summary.upcomingCampaigns || 0}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
                
                {/* Insights Section */}
                {displayData.insights && displayData.insights.length > 0 && (
                  <View style={styles.reportSection}>
                    <Text style={styles.sectionTitle}>💡 Key Insights</Text>
                    {displayData.insights.map((insight, index) => (
                      <View key={index} style={styles.insightItem}>
                        <Text style={styles.insightBullet}>•</Text>
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Recommendations Section */}
                {displayData.recommendations && displayData.recommendations.length > 0 && (
                  <View style={styles.reportSection}>
                    <Text style={styles.sectionTitle}>🎯 Recommendations</Text>
                    {displayData.recommendations.map((recommendation, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Text style={styles.recommendationNumber}>{index + 1}.</Text>
                        <Text style={styles.recommendationText}>{recommendation}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Footer */}
                <View style={styles.reportFooter}>
                  <Text style={styles.footerText}>
                    UTM ReMerit Analytics • {reportFormat === 'PDF' ? 'PDF Report Generated' : 'Report saved to database'}
                  </Text>
                  <Text style={styles.footerNote}>
                    Report Format: {reportFormat} • Report Type: {reportType}
                  </Text>
                  {reportFormat === 'PDF' && pdfUrl && (
                    <TouchableOpacity 
                      style={styles.pdfLinkButton}
                      onPress={() => Linking.openURL(pdfUrl)}
                    >
                      <Text style={styles.pdfLinkText}>📥 Download PDF Report</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
            
            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.primaryButton]}
                onPress={shareReport}
              >
                <Text style={styles.primaryButtonText}>Share Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {reportType === 'Semester Summary' ? 'Generate Semester Report' : 
             reportType === 'Comparative analysis' ? 'Generate Comparison Report' : 
             'Generate Campaign Report'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {reportType === 'Single campaign' ? 'Single Campaign Analysis' : 
             reportType === 'Comparative analysis' ? 'Campaign Comparison Analysis' : 
             'Comprehensive Semester Analytics'}
          </Text>
        </View>
        
        {/* Report Information */}
        {renderReportInfo()}
        
        {/* Format Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Report Format</Text>
          <Text style={styles.sectionSubtitle}>Choose the format for your report</Text>
          
          <View style={styles.formatContainer}>
            {['JSON', 'PDF'].map(format => (
              <TouchableOpacity
                key={format}
                style={[
                  styles.formatCard,
                  reportFormat === format && styles.formatCardActive
                ]}
                onPress={() => setReportFormat(format)}
              >
                <Text style={[
                  styles.formatIcon,
                  reportFormat === format && styles.formatIconActive
                ]}>
                  {format === 'JSON' ? '📄' : '📕'}
                </Text>
                <Text style={styles.formatName}>{format}</Text>
                <Text style={styles.formatDescription}>
                  {format === 'JSON' ? 'Save to database & view in app' : 'Downloadable PDF document'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Generate Button */}
        <View style={styles.generateSection}>
          <TouchableOpacity 
            style={[styles.generateButton, (generating || generatingPDF) && styles.generateButtonDisabled]}
            onPress={generateReport}
            disabled={generating || generatingPDF}
          >
            {(generating || generatingPDF) ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.generateIcon}>
                  {reportFormat === 'PDF' ? '📕' : '📄'}
                </Text>
                <View style={styles.generateTextContainer}>
                  <Text style={styles.generateButtonText}>
                    {reportFormat === 'PDF' ? 'Generate PDF Report' : 'Generate & Save Report'}
                  </Text>
                  <Text style={styles.generateButtonSubtext}>
                    {reportFormat === 'PDF' 
                      ? 'Create downloadable PDF document' 
                      : 'Save JSON report to database'}
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Report Preview Modal */}
      {renderReportPreview()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A5F7A',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#5D6D7E',
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A5F7A',
    marginBottom: 15,
  },
  infoDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoLabel: {
    width: '40%',
    fontSize: 14,
    color: '#78909C',
    marginBottom: 8,
    fontWeight: '500',
  },
  infoValue: {
    width: '60%',
    fontSize: 14,
    color: '#1A5F7A',
    marginBottom: 8,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 10,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A5F7A',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#78909C',
    marginBottom: 20,
  },
  formatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formatCard: {
    width: '48%',
    backgroundColor: '#F8FDFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0F2F1',
  },
  formatCardActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  formatIcon: {
    fontSize: 28,
    marginBottom: 8,
    color: '#5D6D7E',
  },
  formatIconActive: {
    color: '#2E7D32',
  },
  formatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A5F7A',
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 16,
  },
  generateSection: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  generateButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  generateIcon: {
    fontSize: 24,
    color: 'white',
    marginRight: 12,
  },
  generateTextContainer: {
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  generateButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D6D7E',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A5F7A',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#5D6D7E',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0F2F1',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: '#5D6D7E',
    fontWeight: '600',
    fontSize: 15,
  },
  reportPreview: {
    backgroundColor: 'white',
  },
  reportHeader: {
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#E0F2F1',
  },
  reportMainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A5F7A',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  reportSubtitle: {
    fontSize: 16,
    color: '#5D6D7E',
    textAlign: 'center',
    marginBottom: 12,
  },
  reportDate: {
    fontSize: 14,
    color: '#78909C',
    textAlign: 'center',
  },
  reportSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A5F7A',
    marginBottom: 15,
  },
  campaignSummary: {
    backgroundColor: '#F8FDFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  campaignSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A5F7A',
    marginBottom: 10,
  },
  campaignDetails: {
    flexDirection: 'column',
  },
  campaignDetail: {
    fontSize: 14,
    color: '#5D6D7E',
    marginBottom: 5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#F8FDFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#78909C',
    marginBottom: 5,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A5F7A',
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  insightBullet: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 10,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    color: '#5D6D7E',
    lineHeight: 22,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  recommendationNumber: {
    fontSize: 15,
    color: '#2196F3',
    marginRight: 10,
    fontWeight: '600',
    minWidth: 25,
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    color: '#5D6D7E',
    lineHeight: 22,
  },
  reportFooter: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0F2F1',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#B0BEC5',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  pdfLinkButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  pdfLinkText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});