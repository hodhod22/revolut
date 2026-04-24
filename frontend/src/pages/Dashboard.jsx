import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCryptoMarket } from "../features/crypto/cryptoSlice";
import { fetchMe } from "../features/auth/authSlice";
import {
  fetchPortfolio,
  fetchHistory,
} from "../features/portfolio/portfolioSlice";
import { FiTrendingUp, FiTrendingDown, FiDollarSign } from "react-icons/fi";
import axios from "axios";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { coins, loading } = useSelector((state) => state.crypto);
  const { balance, portfolio } = useSelector((state) => state.portfolio);

  useEffect(() => {
    dispatch(fetchCryptoMarket());
    dispatch(fetchMe());
    dispatch(fetchPortfolio());
    dispatch(fetchHistory());
  }, [dispatch]);

  const addTestFunds = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Du är inte inloggad");
        return;
      }
      const response = await axios.post(
        "/api/auth/set-balance",
        {},
        {
          headers: { "x-auth-token": token },
        },
      );
      if (response.data.balance) {
        dispatch(fetchPortfolio());
        dispatch(fetchMe());
        alert(
          `Du har fått 100 000 SEK! Nytt saldo: ${response.data.balance.toLocaleString()} SEK`,
        );
      }
    } catch (err) {
      console.error("Testbalansfel:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.msg ||
        "Kunde inte sätta testbalans";
      alert(errorMsg);
    }
  };

  const totalCryptoValue = portfolio.reduce((sum, item) => {
    const coin = coins.find((c) => c.id === item.coinId);
    return sum + (coin ? coin.current_price * item.amount : 0);
  }, 0);

  const totalBalance = balance + totalCryptoValue;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-linear-to-r from-cyan-400 to-cyan-600 rounded-2xl p-6 text-white shadow-xl mb-8">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-80">Totalt saldo (SEK)</p>
            <h2 className="text-4xl font-bold">
              {totalBalance.toLocaleString()} SEK
            </h2>
            <div className="flex justify-between mt-4 text-sm gap-4">
              <div>
                <span className="opacity-70">Tillgängligt:</span>{" "}
                {balance.toLocaleString()} SEK
              </div>
              <div>
                <span className="opacity-70">Kryptovärde:</span>{" "}
                {totalCryptoValue.toLocaleString()} SEK
              </div>
            </div>
          </div>
          <button
            onClick={addTestFunds}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition"
          >
            <FiDollarSign /> Få 100 000 kr (test)
          </button>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-white mb-4">
        🔥 Populära kryptovalutor
      </h3>
      {loading ? (
        <p className="text-gray-400">Laddar marknadsdata...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coins.slice(0, 6).map((coin) => (
            <div
              key={coin.id}
              className="bg-[#1E1F2E] rounded-xl p-4 flex justify-between items-center hover:scale-105 transition-transform"
            >
              <div className="flex items-center gap-3">
                <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                <div>
                  <p className="text-white font-medium">{coin.name}</p>
                  <p className="text-gray-400 text-sm">
                    {coin.symbol.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white">
                  {coin.current_price.toLocaleString()} SEK
                </p>
                <p
                  className={`text-sm flex items-center gap-1 ${coin.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {coin.price_change_percentage_24h >= 0 ? (
                    <FiTrendingUp />
                  ) : (
                    <FiTrendingDown />
                  )}
                  {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
