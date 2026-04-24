import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const LiveUpdatingChart = ({ coinId }) => {
  const [data, setData] = useState([]);

  const fetchLatest = async () => {
    const res = await axios.get(`/api/crypto/history/${coinId}?seconds=30`);
    const formatted = res.data.map((p) => ({
      time: new Date(p.timestamp).toLocaleTimeString(),
      price: p.price,
    }));
    setData(formatted);
  };

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 5000); // uppdatera var 5:e sekund
    return () => clearInterval(interval);
  }, [coinId]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="price"
          stroke="#22d3ee"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
