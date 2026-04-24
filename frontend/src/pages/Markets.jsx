import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCryptoMarket,
  updatePricesOnly,
} from "../features/crypto/cryptoSlice";
import {
  buyWithAmount,
  shortCrypto,
} from "../features/portfolio/portfolioSlice";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import SimpleRealtimeChart from "../components/SimpleRealtimeChart";

const Markets = () => {
  const dispatch = useDispatch();
  const { coins, loading } = useSelector((state) => state.crypto);
  const { portfolio } = useSelector((state) => state.portfolio);
  const [amountsSEK, setAmountsSEK] = useState({});
  const [expandedCoin, setExpandedCoin] = useState(null);
  const [errorMsg, setErrorMsg] = useState({ coinId: null, message: "" });
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  useEffect(() => {
    dispatch(fetchCryptoMarket());
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(updatePricesOnly());
    }, 2000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "" }),
      4000,
    );
  };

  const getRawAmount = (coinId) => amountsSEK[coinId];

  const validateAndSetAmount = (coinId, value) => {
    let num;
    if (value === undefined || value === "" || isNaN(value)) {
      num = 5000;
    } else {
      num = Number(value);
      if (num < 300) {
        setErrorMsg({ coinId, message: "Minsta belopp är 300 SEK" });
        setTimeout(() => setErrorMsg({ coinId: null, message: "" }), 3000);
        num = 300;
      }
    }
    setAmountsSEK((prev) => ({ ...prev, [coinId]: num }));
    return num;
  };

  const handleAmountChange = (coinId, value) => {
    setAmountsSEK((prev) => ({
      ...prev,
      [coinId]: value === "" ? "" : Number(value),
    }));
  };

  const handleBlur = (coinId) => {
    const current = getRawAmount(coinId);
    if (current === undefined || current === "" || isNaN(current)) {
      setAmountsSEK((prev) => ({ ...prev, [coinId]: 5000 }));
    } else if (current < 300) {
      setErrorMsg({ coinId, message: "Minsta belopp är 300 SEK" });
      setTimeout(() => setErrorMsg({ coinId: null, message: "" }), 3000);
      setAmountsSEK((prev) => ({ ...prev, [coinId]: 300 }));
    }
  };

  // KÖP (long)
  const handleBuy = async (coinId) => {
    let amount = getRawAmount(coinId);
    if (amount === undefined || amount === "" || isNaN(amount)) {
      amount = 5000;
      setAmountsSEK((prev) => ({ ...prev, [coinId]: 5000 }));
    } else {
      amount = validateAndSetAmount(coinId, amount);
    }
    if (amount >= 300) {
      try {
        await dispatch(buyWithAmount({ coinId, amountSEK: amount })).unwrap();
        showNotification(`Köp av ${coinId} för ${amount} SEK`, "success");
      } catch (err) {
        const msg = err?.message || "Kunde inte genomföra köp";
        showNotification(msg, "error");
      }
    }
  };

  // SÄLJ (short)
  const handleSell = async (coinId) => {
    let amountSEK = getRawAmount(coinId);
    if (amountSEK === undefined || amountSEK === "" || isNaN(amountSEK)) {
      amountSEK = 5000;
      setAmountsSEK((prev) => ({ ...prev, [coinId]: 5000 }));
    } else {
      amountSEK = validateAndSetAmount(coinId, amountSEK);
    }
    if (amountSEK < 300) {
      showNotification("Minsta säljbelopp är 300 SEK", "error");
      return;
    }
    if (
      window.confirm(`Sälj ${coinId} för ${amountSEK} SEK (kort position)?`)
    ) {
      try {
        await dispatch(shortCrypto({ coinId, amountSEK })).unwrap();
        showNotification(
          `Sålt ${coinId} för ${amountSEK} SEK (kort)`,
          "success",
        );
      } catch (err) {
        const msg = err?.message || "Kunde inte genomföra försäljning";
        showNotification(msg, "error");
      }
    }
  };

  const toggleExpand = (coinId) => {
    setExpandedCoin(expandedCoin === coinId ? null : coinId);
  };

  const getDecimals = (coinId) => {
    if (coinId === "bitcoin") return 0;
    if (coinId === "ethereum" || coinId === "solana") return 2;
    return 6;
  };

  const formatPrice = (price, coinId) => {
    if (price === undefined || price === null) return "...";
    const decimals = getDecimals(coinId);
    return price.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatOwnedValue = (value, coinId) => {
    const decimals = getDecimals(coinId);
    return value.toFixed(decimals);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto relative">
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
        📊 Kryptomarknad
      </h2>
      {loading ? (
        <p className="text-gray-400 text-center py-10">
          Laddar marknadsdata...
        </p>
      ) : (
        <div>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto shadow-lg rounded-xl">
            <table className="w-full text-left text-gray-300">
              <thead className="bg-[#1E1F2E] text-sm uppercase tracking-wider">
                <tr>
                  <th className="p-4">Tillgång</th>
                  <th>KÖP</th>
                  
                  <th>24h %</th>
                  <th>Belopp (SEK)</th>
                  <th>Position</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coins.map((coin) => {
                  const ownedCoin = portfolio.find((p) => p.coinId === coin.id);
                  const ownedAmount = ownedCoin?.amount || 0;
                  const ownedValue = ownedAmount * coin.current_price;
                  return (
                    <React.Fragment key={coin.id}>
                      <tr className="border-b border-gray-800 hover:bg-[#1E1F2E]/50">
                        <td
                          className="p-4 flex items-center gap-3 cursor-pointer"
                          onClick={() => toggleExpand(coin.id)}
                        >
                          <img
                            src={coin.image}
                            className="w-8 h-8"
                            alt={coin.name}
                          />
                          <div>
                            <p className="font-semibold text-white">
                              {coin.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {coin.symbol.toUpperCase()}
                            </p>
                          </div>
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => handleBuy(coin.id)}
                            className="min-w-40 bg-green-600 hover:bg-green-700 text-white text-sm font-normal py-1 px-3 rounded-lg transition flex flex-col items-center w-32"
                          >
                            <span className="text-xs">KÖP</span>
                            <span className="text-sm font-normal">
                              {formatPrice(coin.bid_price, coin.id)} SEK
                            </span>
                          </button>
                        </td>

                        <td
                          className={
                            coin.price_change_percentage_24h >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          <div className="flex items-center gap-1">
                            {coin.price_change_percentage_24h >= 0 ? (
                              <FiTrendingUp />
                            ) : (
                              <FiTrendingDown />
                            )}
                            {Math.abs(coin.price_change_percentage_24h).toFixed(
                              2,
                            )}
                            %
                          </div>
                        </td>
                        <td className="p-2 relative group">
                          <input
                            type="number"
                            min="300"
                            step="50"
                            placeholder="Belopp"
                            value={
                              amountsSEK[coin.id] === undefined
                                ? ""
                                : amountsSEK[coin.id]
                            }
                            onChange={(e) =>
                              handleAmountChange(coin.id, e.target.value)
                            }
                            onBlur={() => handleBlur(coin.id)}
                            className="bg-gray-800 rounded-lg p-2 w-28 text-white border border-gray-700 focus:outline-none focus:border-cyan-500"
                          />
                          {errorMsg.coinId === coin.id && (
                            <div className="absolute z-10 mt-1 bg-red-600 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              {errorMsg.message}
                            </div>
                          )}
                          <div className="absolute z-20 hidden group-hover:block bg-cyan-500 text-white text-xs rounded px-2 py-1 whitespace-nowrap -top-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
                            min 300 kr
                          </div>
                        </td>
                        <td className="p-2 text-xs">
                          {ownedAmount !== 0 ? (
                            <div>
                              <div>
                                {ownedAmount.toFixed(6)}{" "}
                                {coin.symbol.toUpperCase()}
                              </div>
                              <div className="text-gray-400">
                                {formatOwnedValue(ownedValue, coin.id)} SEK
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td
                          className="text-center cursor-pointer"
                          onClick={() => toggleExpand(coin.id)}
                        >
                          {expandedCoin === coin.id ? (
                            <FiChevronUp size={20} />
                          ) : (
                            <FiChevronDown size={20} />
                          )}
                        </td>
                      </tr>
                      {expandedCoin === coin.id && (
                        <tr key={`${coin.id}-expanded`}>
                          <td colSpan="7" className="p-0 bg-[#0F1222]">
                            <SimpleRealtimeChart
                              coinId={coin.id}
                              coinName={coin.name}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil */}
          <div className="md:hidden space-y-4">
            {coins.map((coin) => {
              const ownedCoin = portfolio.find((p) => p.coinId === coin.id);
              const ownedAmount = ownedCoin?.amount || 0;
              const ownedValue = ownedAmount * coin.current_price;
              return (
                <div
                  key={coin.id}
                  className="bg-[#1E1F2E] rounded-xl overflow-hidden shadow-lg"
                >
                  <div className="p-4 flex items-center justify-between border-b border-gray-700">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleExpand(coin.id)}
                    >
                      <img
                        src={coin.image}
                        className="w-10 h-10"
                        alt={coin.name}
                      />
                      <div>
                        <p className="font-semibold text-white">{coin.name}</p>
                        <p className="text-xs text-gray-400">
                          {coin.symbol.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBuy(coin.id)}
                        className="min-w-40 bg-green-600 hover:bg-green-700 text-white text-xs font-normal py-1 px-2 rounded-lg flex flex-col items-center"
                      >
                        <span>KÖP</span>
                        <span>{formatPrice(coin.bid_price, coin.id)} SEK</span>
                      </button>
                    
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-400">24h %:</div>
                    <div
                      className={
                        coin.price_change_percentage_24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%{" "}
                      {coin.price_change_percentage_24h >= 0 ? (
                        <FiTrendingUp className="inline" />
                      ) : (
                        <FiTrendingDown className="inline" />
                      )}
                    </div>
                    <div className="text-gray-400">Belopp (SEK):</div>
                    <div className="relative group">
                      <input
                        type="number"
                        min="300"
                        step="50"
                        placeholder="Belopp"
                        value={
                          amountsSEK[coin.id] === undefined
                            ? ""
                            : amountsSEK[coin.id]
                        }
                        onChange={(e) =>
                          handleAmountChange(coin.id, e.target.value)
                        }
                        onBlur={() => handleBlur(coin.id)}
                        className="bg-gray-800 rounded-lg p-1 w-full text-white border border-gray-700 focus:outline-none focus:border-cyan-500"
                      />
                      {errorMsg.coinId === coin.id && (
                        <div className="absolute z-10 mt-1 bg-red-600 text-white text-xs rounded px-2 py-1">
                          {errorMsg.message}
                        </div>
                      )}
                      <div className="absolute z-20 hidden group-hover:block bg-cyan-500 text-white text-xs rounded px-2 py-1 whitespace-nowrap -top-1 left-1/2 transform -translate-x-1/2 pointer-events-none">
                        min 300 kr
                      </div>
                    </div>
                    <div className="text-gray-400">Position:</div>
                    <div>
                      {ownedAmount !== 0 ? (
                        <div>
                          {ownedAmount.toFixed(6)} {coin.symbol.toUpperCase()}
                          <br />
                          <span className="text-gray-400">
                            {formatOwnedValue(ownedValue, coin.id)} SEK
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                  <div
                    className="text-center py-2 cursor-pointer border-t border-gray-700"
                    onClick={() => toggleExpand(coin.id)}
                  >
                    {expandedCoin === coin.id ? (
                      <FiChevronUp size={20} className="inline" />
                    ) : (
                      <FiChevronDown size={20} className="inline" />
                    )}
                  </div>
                  {expandedCoin === coin.id && (
                    <div className="p-0 bg-[#0F1222]">
                      <SimpleRealtimeChart
                        coinId={coin.id}
                        coinName={coin.name}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Markets;
