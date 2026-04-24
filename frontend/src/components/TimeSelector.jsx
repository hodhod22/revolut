import React from "react";

const timeOptions = [
  { label: "10s", value: "10s" },
  { label: "30s", value: "30s" },
  { label: "1m", value: "1m" },
  { label: "2m", value: "2m" },
  { label: "3m", value: "3m" },
  { label: "5m", value: "5m" },
  { label: "10m", value: "10m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "2h", value: "2h" },
  { label: "5h", value: "5h" },
  { label: "10h", value: "10h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "6m", value: "6m" },
  { label: "1y", value: "1y" },
];

const TimeSelector = ({ selected, onSelect }) => {
  const shortIntervals = timeOptions.slice(0, 8);
  const longIntervals = timeOptions.slice(8);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {shortIntervals.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option)}
            className={`px-2 py-1 rounded text-xs transition ${
              selected === option.value
                ? "bg-cyan-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {longIntervals.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option)}
            className={`px-2 py-1 rounded text-xs transition ${
              selected === option.value
                ? "bg-cyan-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeSelector;
