import React from 'react';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ScriptExecutionSection from "./components/ScriptExecutionSection";
import StatusSection from "./components/StatusSection";
import ReportPage from './pages/ReportPage';
import ListReportsPage from './pages/ListReportsPage';

function HomePage() {
  return (
    <div className="space-y-8">
      <ScriptExecutionSection />
      <StatusSection />
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dotted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              <Link to="/" className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600">
                App Performance Metrics Infra
              </Link>
            </h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              View/Compare performance metrics and web vitals for different test runs.
            </p>
            <nav className="mt-4 font-bold">
              <ul className="flex justify-center space-x-6 text-gray-300 bg-white rounded-2xl p-3">
                <li>
                  <Link to="/" className="text-gray-600 hover:text-primary-600">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/reports" className="text-gray-600 hover:text-primary-600">
                    Test Reports
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/report/:date" element={<ReportPage />} />
            <Route path="/reports" element={<ListReportsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;