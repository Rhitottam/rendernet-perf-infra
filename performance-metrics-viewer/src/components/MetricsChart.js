import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';
import React from 'react';
import { Bar } from 'react-chartjs-2';

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
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 11
          }
        }
      },
      title: {
        display: true,
        text: [title, description],
        font: {
          size: 13,
          weight: 'normal'
        },
        padding: {
          bottom: 10
        }
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
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return (value / 1000).toFixed(3) + 's';
          },
          font: {
            size: 11
          }
        }
      }
    },
    barPercentage: 0.8,
    categoryPercentage: 0.9
  };

  // Convert milliseconds to seconds with 3 decimal places
  const formatValue = (value) => (description?.includes('FPS') || description?.includes('Frames'))
    ? Number(value).toFixed(2) : (String(description ?? '').toLowerCase().includes('percentage'))
      ? `${Number(value).toFixed(2)}%` : (value / 1000).toFixed(3) + 's';

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 min-h-0">
        <Bar options={options} data={data} />
      </div>
      <div className="mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-600">
              <th className="text-left py-1">Type</th>
              <th className="text-right py-1">Initial</th>
              <th className="text-right py-1">Reload</th>
            </tr>
          </thead>
          <tbody>
            {data.datasets.map((dataset, index) => (
              <tr key={index} className="border-t border-gray-100">
                <td className="py-1 text-left max-w-40">{dataset.label}</td>
                <td className="py-1 text-right font-mono">{formatValue(dataset.data[0])}</td>
                <td className="py-1 text-right font-mono">{formatValue(dataset.data[1])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MetricsChart;