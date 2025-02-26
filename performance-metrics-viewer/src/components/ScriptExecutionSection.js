import React, { useEffect, useState } from 'react';
import { getBasicAuthHeaders } from "../utils/auth";

const BROWSER_OPTIONS = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'webkit', label: 'WebKit' },
  { value: 'mobile-chrome', label: 'Mobile Chrome' },
  { value: 'mobile-safari', label: 'Mobile Safari' }
];

const DATA_SIZE_OPTIONS = [
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: '500', label: '500' },
  { value: '1000', label: '1000' },
  { value: '1500', label: '1500' }
];

// You can move this to a configuration file or fetch from API
const APP_URLS = [
  { name: 'Production App', url: 'https://app.rendernet.ai' },
  { name: 'Staging App', url: 'https://rendernet-stg.web.app' },
  { name: 'App for testing generations', url: 'https://rendernet-stg--pr1698-update-refactor-for-4fvmb5a0.web.app' },
  { name: 'Base App Unoptimized', url: 'https://rendernet-stg--pr1552-testing-studio-loadi-wymr9vwi.web.app' },
  { name: 'App with Canvas Optimized with Low res images', url: 'https://rendernet-stg--pr1606-testing-canvas-loadi-cb3xvbv0.web.app' },
  // Add more URLs as needed
];

function ScriptExecutionSection() {
  const [appUrl, setAppUrl] = useState('');
  const [testName, setTestName] = useState(null);
  const [browser, setBrowser] = useState('chromium');
  const [dataSize, setDataSize] = useState('500');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState({});
  const [testNameList, setTestNameList] = useState([]);

  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        const response = await fetch('/api/tests', {
          headers: {
            ...getBasicAuthHeaders(),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch test names');
        }

        const data = await response.json();
        setTestNameList(data);
      } catch (err) {
        console.error('Failed to fetch test names:', err);
      }
    };

    fetchTestNames();
  }, []);

  const handleCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus(prev => ({ ...prev, [url]: true }));

      // Reset copy status after 2 seconds
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [url]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleUrlClick = (url) => {
    setAppUrl(url);
  };

  const handleExecute = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/run-performance-test', {
        method: 'POST',
        headers: {
          ...getBasicAuthHeaders(),
        },
        body: JSON.stringify({ 
          baseUrl: appUrl, 
          browser, 
          testName,
          feedSize: parseInt(dataSize, 10)
        }),
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
        <h2 className="text-xl font-semibold text-gray-900">Run Performance Tests</h2>
      </div>
      <div className="px-6 py-4 border-b border-gray-200 bg-blue-200 bg-opacity-70">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Available App URLs</h3>
        <div className="grid gap-2">
          {APP_URLS.map(({name, url}) => (
            <div
              key={url}
              className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {name}
                </p>
                <p
                  className="text-sm text-gray-500 truncate cursor-pointer hover:text-primary-600"
                  onClick={() => handleUrlClick(url)}
                >
                  {url}
                </p>
              </div>
              <button
                onClick={() => handleCopy(url)}
                className={`ml-4 px-3 py-1 text-xs font-medium rounded-md 
                  ${copyStatus[url]
                  ? 'bg-green-50 text-green-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                } transition-colors duration-200`}
              >
                {copyStatus[url] ? (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                    </svg>
                    Copy
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <option value="">Select a test reading</option>
              {testNameList.map(option => (
                <option key={option} value={option}>
                  {option}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Size
            </label>
            <select
              value={dataSize}
              onChange={(e) => setDataSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              {DATA_SIZE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleExecute}
          disabled={!appUrl || !testName?.length || loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600
                   rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2
                   focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50
                   disabled:cursor-not-allowed"
        >
          {loading ? 'Running...' : 'Run performance Test'}
        </button>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span>Failed to start test: {error}</span>
          </div>
        )}

        {result && (
          <div className="mt-4">
            {result.status === 'started' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span className="text-green-700 font-medium">Test started successfully!</span>
                  </div>
                  <button
                    onClick={() => setResult(prev => ({ ...prev, showDetails: !prev.showDetails }))}
                    className="text-green-600 hover:text-green-700"
                  >
                    {result.showDetails ? '▼' : '▶'}
                  </button>
                </div>

                {result.showDetails && (
                  <div className="border-t border-green-200 px-4 py-3 bg-green-50">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Test Details:</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Test File:</span> {result.test}
                          </div>
                          <div>
                            <span className="font-medium">Browser:</span> {result.browser}
                          </div>
                          <div>
                            <span className="font-medium">Base URL:</span> {result.baseUrl}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Command:</h4>
                        <pre className="text-xs bg-white p-2 rounded border border-green-100 overflow-x-auto">
                          {result.command.command} {result.command.args.join(' ')}
                        </pre>
                      </div>

                      <div className="text-xs text-gray-500">
                        Process ID: {result.processId}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  <span className="text-red-700 font-medium">Failed to start test</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default ScriptExecutionSection;