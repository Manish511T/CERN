import { useEffect, useRef, useState } from "react";
import socket from "../socket/socket";
import api from "../api/axios";
import { useTracking } from "../context/useTracking";

const AlertBanner = () => {
  const { startTracking } = useTracking();
  const [alert, setAlert] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const alertRef = useRef(null);

  useEffect(() => {
    alertRef.current = alert;
  }, [alert]);

  useEffect(() => {
    socket.on("sos:alert", (data) => {
      setAlert(data);
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } catch {}
    });

    socket.on("sos:accepted", (data) => {
      if (data.openMap) {
        startTracking({
          sosId: data.sosId,
          role: "victim",
          volunteerId: data.volunteerId,
          volunteerName: data.volunteerName,
          // Use location from server payload — don't rely on alertRef
          victimLocation:
            data.victimLocation ||
            (alertRef.current?.location
              ? {
                  latitude: alertRef.current.location.coordinates[1],
                  longitude: alertRef.current.location.coordinates[0],
                  address: alertRef.current.location.address,
                }
              : null),
        });
        setAlert(null);
      }
    });

    return () => {
      socket.off("sos:alert");
      socket.off("sos:accepted");
    };
  }, []);

  const handleAccept = async () => {
    if (!alert || accepting) return;
    setAccepting(true);
    try {
      const res = await api.patch(`/sos/accept/${alert.sosId}`);
      // Save to global tracking context for volunteer
      startTracking({
        sosId: alert.sosId,
        role: "volunteer",
        victimId: res.data.victimId,
        victimName: res.data.victimName,
        volunteerName: res.data.volunteerName,
        victimLocation: res.data.victimLocation,
      });
      setAlert(null);
    } catch {
      window.alert("Could not accept — it may have already been taken.");
    } finally {
      setAccepting(false);
    }
  };

  const getEmergencyLabel = (type) =>
    ({
      accident: "🚗 Road Accident",
      cardiac: "❤️ Cardiac Arrest",
      snake_bite: "🐍 Snake Bite",
      rabies: "⚠️ Rabies",
      other: "🆘 Emergency",
    })[type] || "🆘 Emergency";

  if (!alert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="bg-white border-2 border-red-500 rounded-2xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-red-600 font-bold text-sm flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping mr-1" />
            EMERGENCY NEARBY
          </span>
          <button
            onClick={() => setAlert(null)}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-gray-800 font-semibold text-base mb-1">
          {getEmergencyLabel(alert.emergencyType)}
        </p>

        {alert.location?.address && (
          <p className="text-gray-500 text-xs mb-2">{alert.location.address}</p>
        )}

        {alert.photoUrl && (
          <img
            src={`${import.meta.env.VITE_API_URL?.replace("/api", "")}${alert.photoUrl}`}
            alt="Emergency"
            className="w-full h-32 object-cover rounded-xl mb-3"
          />
        )}

        <div className="flex gap-2 mt-2">
          {alert.isVolunteer && (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
            >
              {accepting ? "Accepting..." : "Accept & Respond"}
            </button>
          )}
          <button
            onClick={() => setAlert(null)}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            {alert.isVolunteer ? "Decline" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
