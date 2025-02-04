import {getBasicAuthHeaders} from "performance-metrics-viewer/src/utils/auth";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ListReportsPage() {
  const [testData, setTestData] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestReadings();
  }, []);

  const fetchTestReadings = async () => {
    try {
      const response = await fetch('/api/test-readings', {
        headers: {
          ...getBasicAuthHeaders(),
        }
      });
      const data = await response.json();
      const organizedData = organizeTestData(data);
      setTestData(organizedData);
    } catch (error) {
      console.error('Error fetching test readings:', error);
    }
  };

  const organizeTestData = (data) => {
    const organized = {};
    
    Object.keys(data).forEach(key => {
      const [prefix, testName, testUrl, testDate, testTime] = key.split('|');
      if (prefix === 'test-data') {
        if (!organized[testDate]) {
          organized[testDate] = {};
        }
        if (!organized[testDate][testName]) {
          organized[testDate][testName] = [];
        }
        organized[testDate][testName].push({
          url: testUrl,
          time: testTime,
          title: `${testName} - ${new Date(testDate + ' ' + testTime).toLocaleTimeString()}`,
          data: data[key],
          key
        });
      }
    });

    return organized;
  };

  const toggleExpand = (key) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const navigateToReport = (date, testKey, compareKeys = []) => {
    const params = new URLSearchParams();
    params.append('mainTest', testKey);
    if (compareKeys.length > 0) {
      params.append('compareWith', compareKeys.join(','));
    }
    navigate(`/report/${date}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Test Reports
      </h2>
      
      {Object.entries(testData).sort((a, b) => b[0].localeCompare(a[0])).map(([date, tests]) => (
        <div key={date} className="bg-opacity-65 bg-blue-300 rounded-lg shadow-sm p-4">
          <div className="flex items-center mb-2">
            <button
              onClick={() => toggleExpand(date)}
              className="text-lg font-medium text-gray-900 flex items-center"
            >
              <span className="mr-2">
                {expandedItems[date] ? '▼' : '▶'}
              </span>
              {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </button>
          </div>
          
          {expandedItems[date] && (
            <div className="ml-6 mt-2 space-y-4">
              {Object.entries(tests).map(([testName, runs]) => (
                <div key={testName} className="border-l-2 border-gray-200 pl-4">
                  <button
                    onClick={() => toggleExpand(`${date}-${testName}`)}
                    className="font-medium text-gray-700 flex items-center"
                  >
                    <span className="mr-2">
                      {expandedItems[`${date}-${testName}`] ? '▼' : '▶'}
                    </span>
                    {testName}
                    <span className="ml-2 text-sm text-gray-500">
                      ({runs.length} runs)
                    </span>
                  </button>
                  
                  {expandedItems[`${date}-${testName}`] && (
                    <div className="mt-2 space-y-2">
                      {runs.map((run, index) => (
                        <div key={index} className="ml-4 p-2 bg-gray-50 rounded">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-mono text-gray-600 text-sm">URL: {run.url}</div>
                              <div className="text-gray-500 text-sm">Time: {run.time}</div>
                              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(run.data, null, 2)}
                              </pre>
                            </div>
                            <div className="ml-4 flex flex-col space-y-2">
                              <button
                                onClick={() => navigateToReport(date, run.key)}
                                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
                              >
                                View Report
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ListReportsPage;