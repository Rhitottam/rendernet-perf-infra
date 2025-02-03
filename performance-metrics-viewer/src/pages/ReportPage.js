import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function ReportPage() {
  const { date } = useParams();
  const [searchParams] = useSearchParams();
  const [testData, setTestData] = useState({
    main: null,
    comparisons: []
  });
  const [loading, setLoading] = useState(true);

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
      const comparisons = compareWithKeys
        .map(key => ({
          data: data[key],
          key,
          title: createTestTitle(key)
        }))
        .filter(test => test.data); // Filter out any missing data
      
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

  const createTestTitle = (key) => {
    const [, testName, , , time] = key.split('|');
    return `${testName} - ${date}, ${time}`;
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Performance Report for {new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {allTests.map((test) => (
            <div
              key={test.key}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              style={{ backgroundColor: `${testColors[test.key]}20`, color: testColors[test.key] }}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: testColors[test.key] }}></div>
              {test.title}
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-8">

      </div>
    </div>
  );
}

export default ReportPage; 