import {getBasicAuthHeaders} from "../utils/auth";
import React, { useState } from 'react';

const BROWSER_OPTIONS = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'webkit', label: 'WebKit' },
  { value: 'mobile-chrome', label: 'Mobile Chrome' },
  { value: 'mobile-safari', label: 'Mobile Safari' }
];

const TEST_NAMES = [
  {
    value: 'studio-feed-performance-tests', label: 'Studio Feed Performance Tests',
  },
  {
    value: 'canvas-feed-performance-tests', label: 'Canvas Feed Performance Tests',
  }
];

function ScriptExecutionSection() {
  const [appUrl, setAppUrl] = useState('');
  const [testName, setTestName] = useState(null);
  const [browser, setBrowser] = useState('chromium');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExecute = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://ec2-54-209-103-199.compute-1.amazonaws.com/api/run-performance-test', {
        method: 'POST',
        headers: {
          ...getBasicAuthHeaders(),
        },
        body: JSON.stringify({ baseUrl: appUrl, browser, testName }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute script');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-opacity-70 bg-blue-300 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Script Execution</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Name
            </label>
            <select
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              {TEST_NAMES.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App URL
            </label>
            <input
              type="url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="Enter application URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Browser
            </label>
            <select
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              {BROWSER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        <button
          onClick={handleExecute}
          disabled={!appUrl ||  ! testName || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600
                   rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2
                   focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50
                   disabled:cursor-not-allowed"
        >
          {loading ? 'Executing...' : 'Execute Script'}
        </button>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <pre className="text-sm font-mono overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

export default ScriptExecutionSection;