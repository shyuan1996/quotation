import React, { useState } from 'react';
import { Lock, User, ArrowRight, Loader2 } from './Icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // UX improvement: Allow user to type just "admin"
      // If no @ symbol is found, append a default domain to satisfy Firebase Email requirement
      const emailToAuth = username.includes('@') ? username : `${username}@shyuan.com`;
      
      await signInWithEmailAndPassword(auth, emailToAuth, password);
      // Login successful
      onLogin();
    } catch (err: any) {
      console.error("Login failed:", err);
      // Provide user-friendly error messages
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('帳號或密碼錯誤');
      } else if (err.code === 'auth/too-many-requests') {
        setError('嘗試次數過多，請稍後再試');
      } else {
        setError('登入失敗，請檢查網路連線');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-[Noto_Sans_TC]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header Section */}
        <div className="bg-gray-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg text-white">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">系統登入</h2>
          <p className="text-gray-400 text-sm mt-2">祥鉞餐飲設備 - 雲端報價系統</p>
        </div>

        {/* Form Section */}
        <div className="p-8 pt-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1 block">帳號 Account</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
                  placeholder="請輸入帳號"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1 block">密碼 Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
                  placeholder="請輸入密碼"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-center animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg shadow-md hover:shadow-lg transition duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed font-medium text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> 驗證中...
                </>
              ) : (
                <>
                  登 入 <ArrowRight className="ml-2" size={20} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
           <p className="text-xs text-gray-400">© {new Date().getFullYear()} Shyuan Food Equipment</p>
        </div>
      </div>
    </div>
  );
};