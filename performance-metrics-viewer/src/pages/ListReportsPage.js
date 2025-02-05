import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBasicAuthHeaders } from "../utils/auth";

function ListReportsPage() {
  const [testData, setTestData] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [searchParams] = useSearchParams();
  const [, setAvailableDates] = useState([]);
  const [dateError, setDateError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestReadings();
  }, [searchParams]);

  const isValidDate = (dateStr) => {
    if (!dateStr) return false;
    
    // Check format DD-MM-YYYY
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (!regex.test(dateStr)) return false;

    const [, day, month, year] = dateStr.match(regex);
    const date = new Date(year, month - 1, day);
    
    return date.getDate() === parseInt(day) && 
           date.getMonth() === parseInt(month) - 1 && 
           date.getFullYear() === parseInt(year);
  };

  const formatDateForPicker = (dateStr) => {
    if (!dateStr) return '';
    const [month, day, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  const formatDateFromPicker = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}-${day}-${year}`;
  };

  const handleDateChange = (event) => {
    const pickerDate = event.target.value; // YYYY-MM-DD
    if (!pickerDate) {
      navigate('/reports');
      return;
    }
    
    const formattedDate = formatDateFromPicker(pickerDate);
    if (isValidDate(formattedDate)) {
      setDateError('');
      navigate(`/reports?date=${formattedDate}`);
    }
  };

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

      // Extract and sort available dates
      const dates = Object.keys(organizedData).sort((a, b) => b.localeCompare(a));
      setAvailableDates(dates);

      const dateParam = searchParams.get('date');
      if (dateParam) {
        if (!isValidDate(dateParam)) {
          setDateError('Please use the format MM-DD-YYYY (e.g., 02-04-2024)');
          return;
        }
        setDateError('');
        
        if (organizedData[dateParam]) {
          setExpandedItems(prev => ({
            ...prev,
            [dateParam]: true,
            ...Object.keys(organizedData[dateParam]).reduce((acc, testName) => ({
              ...acc,
              [`${dateParam}-${testName}`]: true
            }), {})
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching test readings:', error);
    }
  };

  const organizeTestData = (data) => {
    const organized = {};
    
    Object.keys(data).forEach(key => {
      const [prefix, testName, testUrl, testDate, testTime, dataSize = '500'] = key.split('|');
      if (prefix === 'test-data') {
        if (!organized[testDate]) {
          organized[testDate] = {};
        }
        if (!organized[testDate][testName]) {
          organized[testDate][testName] = [];
        }
        organized[testDate][testName].push({
          url: testUrl,
          time: testTime?.replaceAll('-', ':'),
          title: `${testName} - ${new Date(testDate + ' ' + testTime).toLocaleTimeString()}`,
          data: data[key],
          dataSize: dataSize?.length > 0 ? dataSize : 500,
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

  const dateParam = searchParams.get('date');
  const filteredData = dateParam ? { [dateParam]: testData[dateParam] } : testData;

  if (dateError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <svg className="w-16 h-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900">Invalid Date Format</h3>
        <p className="mt-1 text-sm text-gray-500 text-center">
          {dateError}
        </p>
        <button
          onClick={() => navigate('/reports')}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100"
        >
          View All Reports
        </button>
      </div>
    );
  }

  if (dateParam && (!testData[dateParam] || Object.keys(testData[dateParam] || {}).length === 0)) {
    console.log(testData, dateParam);
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900">No Test Readings Available</h3>
        <p className="mt-1 text-sm text-gray-500">
          No test readings were found for {new Date(dateParam).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        <button
          onClick={() => navigate('/reports')}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100"
        >
          View All Reports
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {dateParam ? `Test Reports for ${new Date(dateParam).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}` : 'Test Reports'}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="datePicker" className="text-sm font-medium text-gray-700">
              Select Date:
            </label>
            <input
              type="date"
              id="datePicker"
              value={dateParam ? formatDateForPicker(dateParam) : ''}
              onChange={handleDateChange}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          {dateParam && (
            <button
              onClick={() => navigate('/reports')}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100"
            >
              View All Reports
            </button>
          )}
        </div>
      </div>
      
      {Object.entries(filteredData).sort((a, b) => b[0].localeCompare(a[0])).map(([date, tests]) => (
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
                              <div className="text-gray-500 text-sm">Data Size: {run.dataSize}</div>
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