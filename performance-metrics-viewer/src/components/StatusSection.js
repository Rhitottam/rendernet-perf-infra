import React, { useState } from 'react';
import { getBasicAuthHeaders } from "../utils/auth";

function StatusSection() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedProcesses, setExpandedProcesses] = useState(new Set());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/status',{
        headers: getBasicAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProcessExpand = (processId) => {
    const newExpanded = new Set(expandedProcesses);
    if (newExpanded.has(processId)) {
      newExpanded.delete(processId);
    } else {
      newExpanded.add(processId);
    }
    setExpandedProcesses(newExpanded);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return (
          <div className="flex items-center">
            <div className="animate-pulse w-2.5 h-2.5 rounded-full bg-green-500 mr-2"></div>
            <span className="text-green-700">Running</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="text-green-700">Completed</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span className="text-red-700">Failed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400 mr-2"></div>
            <span className="text-gray-700">{status}</span>
          </div>
        );
    }
  };

  const extractBaseUrl = (args) => {
    const baseUrlArg = args.find(arg => arg.startsWith('BASE_URL='));
    return baseUrlArg ? baseUrlArg.split('=')[1] : null;
  };

  const extractTestName = (args) => {
    const testArg = args.find(arg => arg.endsWith('.spec.js'));
    return testArg ? testArg.split('/').pop() : null;
  };

  return (
    <section className="bg-opacity-70 bg-red-200 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">View Test Logs</h2>
      </div>
      <div className="p-6 space-y-4">
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600
                   rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2
                   focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50
                   disabled:cursor-not-allowed"
        >
          {loading ? 'Fetching...' : 'Fetch Status'}
        </button>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {status?.status && (
          <div className="space-y-4">
            {status.status.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 14h.01M12 16h.01M12 18h.01M12 20h.01M12 22h.01" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tests running</h3>
                <p className="mt-1 text-sm text-gray-500">No active test processes found.</p>
              </div>
            ) : (
              status.status.map((process) => {
                const baseUrl = extractBaseUrl(process.command.args);
                const testName = extractTestName(process.command.args);
                const isExpanded = expandedProcesses.has(process.processId);

                return (
                  <div
                    key={process.processId}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleProcessExpand(process.processId)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          {testName || 'Unknown Test'}
                        </div>
                        {baseUrl && (
                          <div className="text-sm text-gray-500">
                            {baseUrl}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusIcon(process.status)}
                        <span className="text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200">
                        <div className="p-4 space-y-3">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Command:</h4>
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {process.command.command} {process.command.args.join(' ')}
                            </pre>
                          </div>
                          
                          {process.logs && process.logs.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Logs:</h4>
                              <div className="bg-gray-50 rounded p-2">
                                {process.logs.map((log, index) => (
                                  <div key={index} className="text-xs text-gray-600">
                                    {log}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {process.exitCode !== null && (
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Exit Code: </span>
                              <span className={process.exitCode === 0 ? 'text-green-600' : 'text-red-600'}>
                                {process.exitCode}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default StatusSection;