import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import AlertBanner from "../components/AlertBanner";
import useLocationUpdater from "../hooks/useLocationUpdater";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Update this user's location in DB continuously
  // Works for BOTH volunteers and users — fixes the geo query
  useLocationUpdater(user);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AlertBanner />

      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <span className="text-red-600 font-bold text-lg">🚨 CERN</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Hello, <span className="font-medium">{user?.name}</span>
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              user?.role === "volunteer"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-sm mb-8">
          What do you need help with today?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => navigate("/sos")}
            className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md hover:border-red-400 transition"
          >
            <span className="text-4xl">🆘</span>
            <h3 className="font-semibold text-red-700">SOS Alert</h3>
            <p className="text-xs text-center text-red-500">
              Trigger an emergency alert for yourself or others
            </p>
            <span className="text-xs bg-red-600 text-white px-3 py-1 rounded-full">
              Tap to activate
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition">
            <span className="text-4xl">🩺</span>
            <h3 className="font-semibold text-blue-700">Symptom Checker</h3>
            <p className="text-xs text-center text-blue-500">
              AI-guided triage for your symptoms
            </p>
            <span className="text-xs bg-blue-100 text-blue-400 px-3 py-1 rounded-full">
              Coming in Phase 3
            </span>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:shadow-md transition">
            <span className="text-4xl">📋</span>
            <h3 className="font-semibold text-green-700">Health Records</h3>
            <p className="text-xs text-center text-green-500">
              Store and share your medical records securely
            </p>
            <span className="text-xs bg-green-100 text-green-400 px-3 py-1 rounded-full">
              Coming in Phase 4
            </span>
          </div>
        </div>

        {/* Volunteer status indicator */}
        {user?.role === "volunteer" && (
          <div className="mt-8 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <p className="text-green-700 font-semibold text-sm">
                  You are active as a volunteer
                </p>
                <p className="text-green-500 text-xs">
                  Your location is being shared. You will receive SOS alerts
                  within 5km.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/volunteer/history")}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-gray-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-700 text-sm">
                    SOS History
                  </p>
                  <p className="text-gray-400 text-xs">
                    Manage and resolve past alerts
                  </p>
                </div>
              </div>
              <span className="text-gray-300 text-lg">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
