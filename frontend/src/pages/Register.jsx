import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { register } from "../features/auth/authSlice";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(register({ name, email, password }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E1A] px-4">
      <div className="bg-[#1E1F2E] rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold text-white text-center mb-2">
          Skapa konto
        </h2>
        <p className="text-gray-400 text-center mb-6">
          Börja handla krypto direkt
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Fullständigt namn"
            className="w-full p-3 rounded-lg bg-gray-800 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="E-postadress"
            className="w-full p-3 rounded-lg bg-gray-800 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Lösenord"
            className="w-full p-3 rounded-lg bg-gray-800 text-white mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 p-3 rounded-full text-white font-semibold hover:bg-green-700 transition"
          >
            Registrera
          </button>
        </form>
        <p className="text-center text-gray-400 mt-6">
          Har du redan ett konto?{" "}
          <Link to="/login" className="text-blue-400 hover:underline">
            Logga in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
