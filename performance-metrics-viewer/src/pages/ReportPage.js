import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MetricsChart from '../components/MetricsChart';

function getTimeFromTimeString(dateString, timeString) {
  const [hours, minutes, seconds] = timeString.split('-');
  const [day, month, year] = dateString.split('-').map(Number);

  return `${year}-${month<10 ? '0' : ''}${month}-${day<10 ? '0' : ''}${day}T${hours}:${minutes}:${seconds}`;
}

function ReportPage() {
  const { date } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [testData, setTestData] = useState({
    main: null,
    comparisons: []
  });
  const [loading, setLoading] = useState(true);
  const [availableTests, setAvailableTests] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectedTests, setSelectedTests] = useState(new Set());
  const [urlFilter, setUrlFilter] = useState('');

  useEffect(() => {
    fetchTestData();
  }, [date, searchParams]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      const mainTestKey = searchParams.get('mainTest');
      const compareWithKeys = searchParams.get('compareWith')?.split(',') || [];
      
      const response = await fetch('/api/test-readings');
      const data = await response.json();
      
      const mainTest = data[mainTestKey];
      const [, mainTestName,] = mainTestKey.split('|');

      // Get all tests with the same test name
      const sameTypeTests = Object.keys(data)
        .filter(key => {
          const [prefix, testName] = key.split('|');
          return prefix === 'test-data' && testName === mainTestName && key !== mainTestKey;
        })
        .map(key => {
          const [, , testUrl, testDate, testTime, dataSize] = key.split('|');
          return {
            key,
            title: createTestTitle(key),
            url: testUrl,
            date: testDate,
            time: testTime,
            data: data[key],
            dataSize: dataSize?.length ? dataSize : '500',
            timestamp: new Date(getTimeFromTimeString(testDate, testTime)).getTime()
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by date/time, newest first

      setAvailableTests(sameTypeTests);
      setSelectedTests(new Set(compareWithKeys));
      
      const comparisons = compareWithKeys
        .map(key => ({
          data: data[key],
          key,
          title: createTestTitle(key)
        }))
        .filter(test => test.data);
      
      setTestData({
        main: {
          data: mainTest,
          key: mainTestKey,
          title: createTestTitle(mainTestKey)
        },
        comparisons
      });
    } catch (error) {
      console.error('Error fetching test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComparisonChange = (testKey) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testKey)) {
      newSelected.delete(testKey);
    } else {
      newSelected.add(testKey);
    }
    setSelectedTests(newSelected);

    // Update URL and reload data
    const params = new URLSearchParams(searchParams);
    if (newSelected.size > 0) {
      params.set('compareWith', Array.from(newSelected).join(','));
    } else {
      params.delete('compareWith');
    }
    navigate(`/report/${date}?${params.toString()}`);
  };

  const createTestTitle = (key) => {
    const [, testName, testUrl, testDate, testTime, dataSize = '500'] = key.split('|');
    const formattedDate = new Date(getTimeFromTimeString(testDate, testTime)).toLocaleString();
    const dataSizeValue = dataSize?.replaceAll(' ', '')?.length > 0 ? dataSize : '500';
    return {
      testName,
      testUrl,
      formattedDate,
      dataSize: dataSizeValue,
      date: testDate,
      time: testTime,
      // For the chart label, we want a shorter version
      shortLabel: `${testTime} (${dataSizeValue})`,
      // For the full label in the legend and comparison section
      fullLabel: `${formattedDate} - ${dataSizeValue} - ${testUrl}`
    };
  };

  const getMetricsForType = (tests) => {
    // Get all possible metrics from all test runs
    const metrics = new Set();
    tests.forEach(test => {
      if (test.data?.initial) {
        Object.keys(test.data.initial).forEach(metric => {
          // Include regular metrics and add imageLoadTimeStats average as a separate metric
          if (typeof test.data.initial[metric] !== 'object') {
            metrics.add(metric);
          }
        });
        // Add average image loading time if stats exist
        if (test.data.initial.imageLoadTimeStats?.average !== undefined) {
          metrics.add('averageImageLoadTime');
        }
      }
    });
    return Array.from(metrics);
  };

  const getMetricValue = (data, metric) => {
    if (metric === 'averageImageLoadTime') {
      return data?.imageLoadTimeStats?.average || 0;
    }
    return data?.[metric] || 0;
  };

  const formatMetricName = (name) => {
    if (name === 'averageImageLoadTime') {
      return 'Average Image Loading Time';
    }
    return name
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  const getFilteredTests = () => {
    return availableTests.filter(test => 
      !urlFilter || test.url.toLowerCase().includes(urlFilter.toLowerCase())
    );
  };

  const renderMetricTable = (metrics) => {
    if (!testData.main || metrics.length === 0) return null;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Initial
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reload
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics.map((metric) => {
              const initial = getMetricValue(testData.main.data?.initial, metric);
              const reload = getMetricValue(testData.main.data?.reload, metric);

              return (
                <tr key={metric}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatMetricName(metric)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                    {formatMetricValue(metric, initial)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">
                    {formatMetricValue(metric, reload)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const formatMetricValue = (metric, value) => {
    if (metric.toLowerCase().includes('fps')) {
      return value.toFixed(2);
    }
    return (value / 1000).toFixed(3) + 's';
  };

  const renderMetricsSection = () => {
    const metrics = getMetricsForType([testData.main, ...testData.comparisons]);
    
    if (metrics.length === 0) {
      return null;
    }

    // Group metrics by type
    const metricGroups = {
      timing: metrics.filter(m => m.toLowerCase().includes('time') || m.toLowerCase().includes('paint') || m.toLowerCase().includes('interactive')),
      fps: metrics.filter(m => m.toLowerCase().includes('fps')),
      other: metrics.filter(m => !m.toLowerCase().includes('time') && !m.toLowerCase().includes('paint') && !m.toLowerCase().includes('interactive') && !m.toLowerCase().includes('fps'))
    };

    // If no comparisons are selected, show tabular view
    if (testData.comparisons.length === 0) {
      return Object.entries(metricGroups).map(([group, groupMetrics]) => {
        if (groupMetrics.length === 0) return null;

        return (
          <div key={group} className="bg-amber-500 bg-opacity-40 rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {group === 'timing' ? 'Timing Metrics' : 
               group === 'fps' ? 'FPS Metrics' : 
               'Other Metrics'}
            </h3>
            {renderMetricTable(groupMetrics)}
          </div>
        );
      });
    }

    // Show charts view for comparisons
    return Object.entries(metricGroups).map(([group, groupMetrics]) => {
      if (groupMetrics.length === 0) return null;

      return (
        <div key={group} className="bg-amber-500 bg-opacity-40 rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {group === 'timing' ? 'Timing Metrics' : 
             group === 'fps' ? 'FPS Metrics' : 
             'Other Metrics'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {groupMetrics.map(metric => {
              const chartData = {
                labels: ['Initial', 'Reload'],
                datasets: [testData.main, ...testData.comparisons].map(test => {
                  const testInfo = createTestTitle(test.key);
                  return {
                    label: testInfo.shortLabel,
                    data: [
                      getMetricValue(test.data?.initial, metric),
                      getMetricValue(test.data?.reload, metric)
                    ],
                    backgroundColor: testColors[test.key],
                    borderColor: testColors[test.key],
                    borderWidth: 1
                  };
                })
              };

              const isFpsMetric = metric.toLowerCase().includes('fps');
              const description = isFpsMetric ? 'Frames per second' : 
                                metric.toLowerCase().includes('time') ? 'Time in milliseconds' : 
                                'Value';

              return (
                <div key={metric} className="bg-gray-50 rounded-lg p-4">
                  <MetricsChart
                    title={formatMetricName(metric)}
                    description={description}
                    data={chartData}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!testData.main) {
    return (
      <div className="text-center text-gray-600">
        No test data found for this date.
      </div>
    );
  }

  const getColorForIndex = (index) => {
    const colors = [
      'rgb(59, 130, 246)', // blue-500
      'rgb(16, 185, 129)', // green-500
      'rgb(239, 68, 68)',  // red-500
      'rgb(168, 85, 247)', // purple-500
      'rgb(245, 158, 11)'  // amber-500
    ];
    return colors[index % colors.length];
  };

  const allTests = [testData.main, ...testData.comparisons];
  const testColors = allTests.reduce((acc, test, index) => ({
    ...acc,
    [test.key]: getColorForIndex(index)
  }), {});

  // Get all test types from the data
  const testTypes = new Set();
  allTests.forEach(test => {
    Object.keys(test.data || {}).forEach(type => {
      if (typeof test.data[type] === 'object') {
        testTypes.add(type);
      }
    });
  });

  return (
    <div>
      <div className="mb-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">
            {testData.main && createTestTitle(testData.main.key).testName}
          </h2>
          <div className="text-sm text-gray-500 space-y-1">
            <div>
              Date: {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {testData.main && (
              <>
                <div>URL: {createTestTitle(testData.main.key).testUrl}</div>
                <div>Data Size: {createTestTitle(testData.main.key).dataSize}</div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {allTests.map((test) => {
            const testInfo = createTestTitle(test.key);
            return (
              <div
                key={test.key}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                style={{ backgroundColor: `${testColors[test.key]}20`, color: testColors[test.key] }}
                title={testInfo.fullLabel}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: testColors[test.key] }}></div>
                <div className="flex flex-col">
                  <span className="font-medium">{testInfo.fullLabel}</span>
                  <span className="text-xs truncate max-w-xs">{testInfo.testUrl}</span>
                </div>
              </div>
            );
          })}
        </div>

        {availableTests.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setIsCompareOpen(!isCompareOpen)}
              className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <span className="text-lg">
                {isCompareOpen ? '▼' : '▶'}
              </span>
              Compare with other test readings
            </button>
            
            {isCompareOpen && (
              <div className="mt-4 p-4 bg-blue-500 bg-opacity-40 rounded-lg border border-gray-200">
                <div className="mb-4">
                  <label htmlFor="urlFilter" className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by URL
                  </label>
                  <input
                    type="text"
                    id="urlFilter"
                    value={urlFilter}
                    onChange={(e) => setUrlFilter(e.target.value)}
                    placeholder="Enter URL to filter..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getFilteredTests().map((test) => (
                    <label
                      key={test.key}
                      className="flex flex-col gap-2 p-3 bg-white rounded border border-gray-200 cursor-pointer hover:border-primary-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTests.has(test.key)}
                          onChange={() => handleComparisonChange(test.key)}
                          className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(`${getTimeFromTimeString(test.date, test.time)}`).toLocaleString()}
                          {test.dataSize && ` (${test.dataSize})`}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 break-all pl-7">
                        {test.url}
                      </div>
                    </label>
                  ))}
                </div>

                {getFilteredTests().length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No test readings match the filter
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        {renderMetricsSection()}
      </div>
    </div>
  );
}

export default ReportPage; 