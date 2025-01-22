import ScriptExecutionSection from "./components/ScriptExecutionSection";
import StatusSection from "./components/StatusSection";
import React from 'react';
import MetricsSection from './components/MetricsSection';

function App() {
  return (
    <div className="min-h-screen bg-dotted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
              App Performance Metrics Infra
            </span>
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            View/Compare performance metrics and web vitals for different test runs.
          </p>
        </div>
        <div className="space-y-8">
          <ScriptExecutionSection />
          <StatusSection />
          <MetricsSection
            title="Studio Feed Load"
            type="studio"
          />
          <MetricsSection
            title="Canvas Feed Load"
            type="canvas"
          />
        </div>
      </div>
    </div>
  );
}

export default App;