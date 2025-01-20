import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function MetricsChart({ title, description, data }) {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: [title, description],
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const valueInSeconds = (context.parsed.y / 1000).toFixed(3);
            return `${label}: ${valueInSeconds}s`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return (value / 1000).toFixed(3) + 's';
          }
        }
      }
    },
    barPercentage: 0.8,
    categoryPercentage: 0.9
  };

  // Convert milliseconds to seconds with 3 decimal places
  const formatValue = (value) => description?.includes('FPS') ? value : (value / 1000).toFixed(3) + 's';

  return (
    <div className="chart-container">
      <Bar options={options} data={data} />
      <div className="values-table">
        <table>
          <thead>
          <tr>
            <th>Type</th>
            <th>Initial</th>
            <th>Reload</th>
          </tr>
          </thead>
          <tbody>
          {data.datasets.map((dataset, index) => (
            <tr key={index}>
              <td>{dataset.label}</td>
              <td>{formatValue(dataset.data[0])}</td>
              <td>{formatValue(dataset.data[1])}</td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MetricsChart;