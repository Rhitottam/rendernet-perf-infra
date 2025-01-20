import React, { useState } from 'react';
import FileUploadSection from './FileUploadSection';
import MetricsChart from './MetricsChart';
import { processMetricsData } from '../utils/dataProcessing';

function MetricsSection({ title }) {
  const [unoptimizedData, setUnoptimizedData] = useState(null);
  const [optimizedData, setOptimizedData] = useState(null);

  const handleDataUpload = (data, isOptimized) => {
    if (isOptimized) {
      setOptimizedData(data);
    } else {
      setUnoptimizedData(data);
    }
  };

  const metrics = unoptimizedData && optimizedData
    ? processMetricsData(unoptimizedData, optimizedData)
    : [];

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FileUploadSection
            label="Unoptimized Results"
            onDataUpload={(data) => handleDataUpload(data, false)}
          />
          <FileUploadSection
            label="Optimized Results"
            onDataUpload={(data) => handleDataUpload(data, true)}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {metrics.map((metric, index) => (
            <MetricsChart
              key={index}
              title={metric.title}
              description={metric.description}
              data={metric.data}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default MetricsSection;