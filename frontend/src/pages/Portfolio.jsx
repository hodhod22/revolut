// src/pages/Portfolio.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCryptoMarket } from '../features/crypto/cryptoSlice';
import { sellCrypto, fetchHistory, sellAllOfCoin, sellAllPortfolio, fetchPortfolio } from '../features/portfolio/portfolioSlice';
import { FiArrowUpCircle, FiArrowDownCircle, FiX, FiTrash2, FiXCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const Portfolio = () => {
  const dispatch = useDispatch();
  const { portfolio, balance, transactions } = useSelector(state => state.portfolio);
  const { coins } = useSelector(state => state.crypto);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    dispatch(fetchCryptoMarket());
    dispatch(fetchPortfolio());
    dispatch(fetchHistory());
  }, [dispatch]);

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  // Sälj hela innehavet av en specifik valuta (från portfolio)
  const handleSellCoin = async (coinId, amount) => {
    if (window.confirm(`Sälj alla dina ${amount} ${coinId.toUpperCase()}?`)) {
      try {
        await dispatch(sellCrypto({ coinId, amount })).unwrap();
        showNotification(`Sålt alla ${coinId.toUpperCase()}`, 'success');
        dispatch(fetchPortfolio());
        dispatch(fetchHistory());
      } catch (err) {
        showNotification(err.message || 'Kunde inte sälja', 'error');
      }
    }
  };

  // Sälj hela portföljen
  const handleSellAllPortfolio = async () => {
    if (portfolio.length === 0) {
      showNotification('Du har inga innehav att sälja', 'error');
      return;
    }
    if (window.confirm('⚠️ VARNING: Detta kommer att sälja ALLA dina kryptotillgångar. Är du säker?')) {
      try {
        await dispatch(sellAllPortfolio()).unwrap();
        showNotification('Hela portföljen såld!', 'success');
        dispatch(fetchPortfolio());
        dispatch(fetchHistory());
      } catch (err) {
        showNotification(err.message || 'Kunde inte sälja hela portföljen', 'error');
      }
    }
  };

  // Beräkna aktuellt värde och P/L för varje innehav
  const portfolioWithPrices = portfolio.map(item => {
    const coin = coins.find(c => c.id === item.coinId);
    const currentPrice = coin?.current_price || 0;
    const value = currentPrice * item.amount;
    const profitLoss = (currentPrice - item.buyPrice) * item.amount;
    const profitLossPercent = item.buyPrice > 0 ? (profitLoss / (item.buyPrice * item.amount)) * 100 : 0;
    return { ...item, currentPrice, value, profitLoss, profitLossPercent };
  });

  const totalPortfolioValue = portfolioWithPrices.reduce((sum, item) => sum + item.value, 0);

  const toggleExpand = (coinId) => {
    setExpandedGroups(prev => ({ ...prev, [coinId]: !prev[coinId] }));
  };

  const formatPrice = (price, coinId) => {
    if (price === undefined || price === null) return '...';
    if (coinId === 'bitcoin') return Math.floor(price).toLocaleString();
    if (coinId === 'ethereum' || coinId === 'solana') return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto relative">
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}

      {/* Saldoöversikt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-linear-to-r from-cyan-400 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
          <p className="text-sm opacity-80">Tillgängligt saldo</p>
          <h2 className="text-3xl font-bold">{balance.toLocaleString()} SEK</h2>
        </div>
        <div className="bg-[#1E1F2E] rounded-2xl p-6">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <p className="text-gray-400">Portföljvärde</p>
              <h2 className="text-3xl font-bold text-white">{totalPortfolioValue.toLocaleString()} SEK</h2>
            </div>
            {portfolio.length > 0 && (
              <button
                onClick={handleSellAllPortfolio}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"
              >
                <FiXCircle /> Sälj allt
              </button>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-white mb-4">📦 Mina kryptotillgångar</h3>

      {portfolio.length === 0 ? (
        <p className="text-gray-400 bg-[#1E1F2E] rounded-xl p-4 text-center">
          Du har inga kryptotillgångar. <a href="/markets" className="text-cyan-400 hover:underline">Handla här →</a>
        </p>
      ) : (
        <div className="space-y-4">
          {portfolioWithPrices.map(item => (
            <div key={item.coinId} className="bg-[#1E1F2E] rounded-xl overflow-hidden shadow-lg">
              {/* Huvudrad */}
              <div
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-[#2A2C3E] transition"
                onClick={() => toggleExpand(item.coinId)}
              >
                <div>
                  <p className="font-bold text-white text-lg">{item.coinId.toUpperCase()}</p>
                  <p className="text-sm text-gray-400">{item.amount} st</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSellCoin(item.coinId, item.amount); }}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition"
                    title="Sälj alla"
                  >
                    <FiX size={18} />
                  </button>
                  {expandedGroups[item.coinId] ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                </div>
              </div>
              {/* Expanderad info */}
              {expandedGroups[item.coinId] && (
                <div className="p-4 border-t border-gray-700 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Inköpspris:</span>
                    <span>{formatPrice(item.buyPrice, item.coinId)} SEK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nuvarande pris:</span>
                    <span>{formatPrice(item.currentPrice, item.coinId)} SEK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Värde:</span>
                    <span>{item.value.toLocaleString()} SEK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vinst/förlust:</span>
                    <span className={item.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {item.profitLoss >= 0 ? '+' : ''}{item.profitLoss.toLocaleString()} SEK ({item.profitLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transaktionshistorik */}
      <h3 className="text-xl font-semibold text-white mt-8 mb-4">📜 Transaktionshistorik</h3>
      {transactions.length === 0 ? (
        <p className="text-gray-400 bg-[#1E1F2E] rounded-xl p-4 text-center">Inga transaktioner än.</p>
      ) : (
        <div className="bg-[#1E1F2E] rounded-xl p-4 overflow-x-auto">
          {transactions.map(tx => (
            <div key={tx._id} className="flex justify-between items-center border-b border-gray-700 py-3 last:border-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {tx.type === 'buy' ? (
                  <FiArrowUpCircle className="text-green-400 text-xl" />
                ) : (
                  <FiArrowDownCircle className="text-red-400 text-xl" />
                )}
                <span className="text-white font-medium">{tx.coinId.toUpperCase()}</span>
                <span className="text-gray-300">{tx.type === 'buy' ? 'köpt' : 'sålt'} {tx.amount} st</span>
              </div>
              <div className="text-gray-300 text-sm">
                {tx.price.toLocaleString()} SEK/st • Totalt {tx.total.toLocaleString()} SEK
              </div>
              <div className="text-gray-500 text-xs">{new Date(tx.date).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Portfolio;