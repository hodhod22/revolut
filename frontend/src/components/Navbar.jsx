// src/components/Navbar.jsx
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { resetPortfolio } from "../features/portfolio/portfolioSlice";
import { FiLogOut, FiHome, FiTrendingUp, FiUser } from "react-icons/fi";
import logo from "../assets/ahmed.svg";

const Navbar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetPortfolio());
  };

  return (
    <nav className="bg-[#0F1222] border-b border-gray-800 px-4 py-3 flex flex-wrap justify-between items-center">
      <Link to="/" className="flex items-center">
        <img src={logo} alt="CrypCoin" className="h-14 md:h-16 w-auto" /><b className="text-lime-500">CrypCoin</b>
      </Link>
      <div className="flex gap-4 md:gap-6 text-gray-300">
        <Link
          to="/"
          className="flex items-center gap-1 hover:text-cyan-300 transition"
        >
          <FiHome size={20} />
          <span className="hidden md:inline">Hem</span>
        </Link>
        <Link
          to="/markets"
          className="flex items-center gap-1 hover:text-cyan-300 transition"
        >
          <FiTrendingUp size={20} />
          <span className="hidden md:inline">Marknad</span>
        </Link>
        <Link
          to="/portfolio"
          className="flex items-center gap-1 hover:text-cyan-300 transition"
        >
          <FiUser size={20} />
          <span className="hidden md:inline">Portfölj</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 hover:text-cyan-300 transition"
        >
          <FiLogOut size={20} />
          <span className="hidden md:inline">Logga ut</span>
        </button>
      </div>
      <div className="text-white text-sm bg-gray-800 px-2 py-1 rounded-full hidden md:block">
        👋 {user?.name || "Användare"}
      </div>
    </nav>
  );
};

export default Navbar;
