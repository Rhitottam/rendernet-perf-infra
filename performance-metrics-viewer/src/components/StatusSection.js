import {getBasicAuthHeaders} from "../utils/auth";
import React, { useState } from 'react';

function StatusSection() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://ec2-54-209-103-199.compute-1.amazonaws.com/api/status',{
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

        {status && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <pre className="text-sm font-mono overflow-auto">
              {JSON.stringify(status, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

export default StatusSection;