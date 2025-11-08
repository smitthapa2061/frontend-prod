import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";


// Interface for user data from the API
interface UserData {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  sessionId?: string;
  sessionCookie?: string | null;
}


const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const navigate = useNavigate();
  


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    setLoading(true);
    setError("");
    setDebugInfo("");
    
    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login with:", { email });

      const response = await api.post("/users/login", { email, password });
      const responseData = response.data;

      console.log("Login successful:", responseData);

      // Store user data and session ID in localStorage
      if (responseData.user && responseData.user._id) {
        const { _id, username, email, isAdmin } = responseData.user;

        localStorage.setItem("user", JSON.stringify({
          _id,
          username,
          email,
          isAdmin
        }));

        if (responseData.sessionId) {
          localStorage.setItem("sessionId", responseData.sessionId);
        }

        // Navigate to dashboard on success
        navigate("/dashboard");
      } else {
        throw new Error("Invalid response format from server");
      }
      
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Enhanced error handling
      let errorMessage = "Login failed. Please try again.";
      
      if (err.response) {
        // Server responded with an error status
        errorMessage = err.response.data?.message || 
                      err.response.statusText || 
                      `Error: ${err.response.status}`;
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = "No response from server. Please check your connection.";
      } else {
        // Something else happened
        errorMessage = err.message || "An unexpected error occurred.";
      }
      
      setError(errorMessage);
      
      // Debug info for development
      if (process.env.NODE_ENV !== 'production') {
        setDebugInfo(JSON.stringify({
          error: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        }, null, 2));
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-medium">Login Failed</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        {/* Debug information - can be toggled or removed in production */}
        {process.env.NODE_ENV !== 'production' && debugInfo && (
          <div className="mt-6 p-3 bg-gray-100 rounded-md text-xs overflow-auto max-h-40">
            <details>
              <summary className="font-medium cursor-pointer text-gray-700">Debug Information</summary>
              <pre className="mt-2 whitespace-pre-wrap">{debugInfo}</pre>
            </details>
          </div>
        )}
        
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Don't have an account?{' '}
            <a href="/register" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
