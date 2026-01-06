import React from 'react';
import { View, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const ChartComponent = ({ type = 'bar', data, height = 220, width }) => {
  if (!data || !data.labels || !data.values) {
    return null;
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: () => '#2E7D32',
    labelColor: () => '#555',
    propsForLabels: {
      fontSize: 10,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2E7D32',
    },
    propsForBackgroundLines: {
      stroke: '#eee',
    },
  };

  // =========================
  // BAR CHART
  // =========================
  if (type === 'bar') {
    return (
      <BarChart
        data={chartData}
        width={width || screenWidth - 64}
        height={height}
        fromZero
        withInnerLines={false}
        verticalLabelRotation={-45}
        chartConfig={chartConfig}
        style={{ borderRadius: 12 }}
      />
    );
  }

  // =========================
  // HORIZONTAL BAR
  // =========================
  if (type === 'horizontal-bar') {
    return (
      <BarChart
        data={chartData}
        width={width || screenWidth - 64}
        height={height}
        fromZero
        horizontal
        withInnerLines={false}
        chartConfig={chartConfig}
        style={{ borderRadius: 12 }}
      />
    );
  }

  // =========================
  // ✅ LINE CHART (FIX)
  // =========================
  if (type === 'line') {
    return (
      <LineChart
        data={chartData}
        width={width || screenWidth - 64}
        height={height}
        fromZero
        bezier
        chartConfig={chartConfig}
        style={{ borderRadius: 12 }}
      />
    );
  }

  return null;
};

export default ChartComponent;
