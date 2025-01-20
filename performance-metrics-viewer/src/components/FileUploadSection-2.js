import React, { useState } from 'react';

function FileUploadSection({ label, onDataUpload }) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    const jsonData = [];
    setError('');

    for (const file of files) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        jsonData.push(data);
      } catch (error) {
        setError(`Error reading file ${file.name}: ${error.message}`);
        return;
      }
    }

    if (jsonData.length > 0) {
      onDataUpload(jsonData);
      event.target.value = ''; // Reset file input
    }
  };

  const handleJsonTextChange = (event) => {
    setJsonText(event.target.value);
    setError('');
  };

  const handleJsonTextSubmit = () => {
    if (!jsonText.trim()) {
      return;
    }

    try {
      // Split the text by double newlines to separate multiple JSON objects
      const jsonStrings = jsonText.split(/\n\s*\n/).filter(text => text.trim());
      const jsonData = jsonStrings.map(jsonString => JSON.parse(jsonString.trim()));

      if (jsonData.length > 0) {
        onDataUpload(jsonData);
        setJsonText(''); // Clear textarea after successful upload
        setError('');
      }
    } catch (error) {
      setError(`Invalid JSON format: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">{label}</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload JSON Files
          </label>
          <input
            type="file"
            multiple
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0 file:text-sm file:font-medium
                     file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100
                     cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Or Paste JSON Text
          </label>
          <p className="text-xs text-gray-500 mb-2">
            (Separate multiple JSON objects with empty lines)
          </p>
          <textarea
            value={jsonText}
            onChange={handleJsonTextChange}
            placeholder="Paste JSON here..."
            className="w-full h-32 px-3 py-2 text-sm font-mono border border-gray-300
                     rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            rows="4"
          />
          <button
            onClick={handleJsonTextSubmit}
            disabled={!jsonText.trim()}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-primary-600
                     rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50
                     disabled:cursor-not-allowed"
          >
            Submit JSON
          </button>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUploadSection;