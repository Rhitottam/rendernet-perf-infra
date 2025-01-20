export function processMetricsData(unoptimizedFiles, optimizedFiles) {
  const unoptimizedAvg = calculateAverages(unoptimizedFiles);
  const optimizedAvg = calculateAverages(optimizedFiles);

  return createMetricsConfig(unoptimizedAvg, optimizedAvg);
}

function calculateAverages(files) {
  const result = {
    initial: {},
    reload: {}
  };

  files.forEach(file => {
    // Process initial metrics
    Object.entries(file.initial).forEach(([key, value]) => {
      if (key === 'imageLoadTimeStats') {
        if (!result.initial[key]) result.initial[key] = 0;
        result.initial[key] += value.average;
      } else if (typeof value === 'number') {
        result.initial[key] = (result.initial[key] || 0) + value;
      }
    });

    // Process reload metrics
    Object.entries(file.reload).forEach(([key, value]) => {
      if (key === 'imageLoadTimeStats') {
        if (!result.reload[key]) result.reload[key] = 0;
        result.reload[key] += value.average;
      } else if (typeof value === 'number') {
        result.reload[key] = (result.reload[key] || 0) + value;
      }
    });
  });

  // Calculate averages
  const numFiles = files.length;
  Object.keys(result.initial).forEach(key => {
    result.initial[key] /= numFiles;
    result.reload[key] /= numFiles;
  });

  return result;
}

function createMetricsConfig(unoptimized, optimized) {
  const metrics = [];

  // Get all unique metric keys
  const metricKeys = new Set([
    ...Object.keys(unoptimized.initial),
    ...Object.keys(unoptimized.reload)
  ]);

  metricKeys.forEach(key => {
    let title, description;

    if (key === 'imageLoadTimeStats') {
      title = 'Average Image Load Time';
      description = 'Average time to load images in milliseconds';
    } else {
      title = formatTitle(key);
      description = `Comparison of ${key}`;
    }

    const chartData = {
      labels: ['Initial', 'Reload'],
      datasets: [
        {
          label: 'Unoptimized',
          data: [unoptimized.initial[key], unoptimized.reload[key]],
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
        {
          label: 'Optimized',
          data: [optimized.initial[key], optimized.reload[key]],
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgba(53, 162, 235, 1)',
          borderWidth: 1,
        }
      ]
    };

    metrics.push({
      title,
      description,
      data: chartData
    });
  });

  return metrics;
}

function formatTitle(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}