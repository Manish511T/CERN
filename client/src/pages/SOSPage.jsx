import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import api from "../api/axios";
import socket from "../socket/socket";
import TrackingMap from "../components/TrackingMap";

const EMERGENCY_TYPES = [
  { value: "accident", label: "🚗 Road Accident" },
  { value: "cardiac", label: "❤️ Cardiac Arrest" },
  { value: "snake_bite", label: "🐍 Snake Bite" },
  { value: "rabies", label: "⚠️ Rabies" },
  { value: "other", label: "🆘 Other Emergency" },
];

const SOSPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [forSelf, setForSelf] = useState(true);
  const [emergencyType, setEmergencyType] = useState("other");
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [mapData, setMapData] = useState(null); // victim's map

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser");
      return;
    }

    setLocationError("");

    const options = {
      enableHighAccuracy: true, // use GPS chip, not IP/WiFi
      timeout: 15000, // wait up to 15 seconds
      maximumAge: 0, // never use cached position
    };

    // First do a one-time high-accuracy fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log(
          `GPS acquired: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`,
        );
        setLocation({ latitude, longitude, accuracy });

        // Save to DB immediately
        api.post("/sos/location", { latitude, longitude }).catch(() => {});
      },
      (err) => {
        setLocationError(
          "Could not get precise location. Please enable GPS and try again.",
        );
        console.error("GPS error:", err);
      },
      options,
    );
  }, []);

  // Listen for volunteer accepting — open map for victim
  const sentRef = useRef(null);
  const locationRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    sentRef.current = sent;
  }, [sent]);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Register socket listener ONCE — use refs inside to avoid stale closure
  useEffect(() => {
    socket.on("sos:accepted", (data) => {
      console.log("sos:accepted received on SOSPage:", data);
      if (data.openMap) {
        // Use refs so we always get the latest values
        // even if sent/location haven't re-triggered this effect
        setMapData({
          role: "victim",
          sosId: data.sosId,
          volunteerId: data.volunteerId,
          volunteerName: data.volunteerName,
          victimLocation: locationRef.current,
        });
      }
    });
    return () => socket.off("sos:accepted");
  }, []); // empty array — register once, refs handle latest values

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        setVoiceBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleSOSTrigger = () => {
    if (!location) {
      alert("Waiting for GPS location...");
      return;
    }
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      sendSOS();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const cancelCountdown = () => setCountdown(null);

  const sendSOS = async () => {
    if (!location?.latitude || !location?.longitude) {
      alert("GPS location not ready. Please wait a moment and try again.");
      setSending(false);
      setCountdown(null);
      return;
    }

    setSending(true);
    setCountdown(null);

    try {
      // Get a fresh position right at trigger time for maximum accuracy
      const freshPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const lat = freshPosition.coords.latitude;
      const lng = freshPosition.coords.longitude;

      // Update DB with the freshest coords before creating SOS
      await api.post("/sos/location", { latitude: lat, longitude: lng });

      const formData = new FormData();
      formData.append("latitude", lat);
      formData.append("longitude", lng);
      formData.append("forSelf", forSelf);
      formData.append("emergencyType", emergencyType);
      if (photo) formData.append("photo", photo);
      if (voiceBlob) formData.append("voice", voiceBlob, "voice.webm");

      const res = await api.post("/sos/trigger", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSent(res.data);

      // Store location for the map
      setLocation({ latitude: lat, longitude: lng });
    } catch (err) {
      if (err.code === err.TIMEOUT) {
        alert("GPS timed out. Make sure location is enabled and try again.");
      } else {
        alert(err.response?.data?.message || "Failed to send SOS");
      }
    } finally {
      setSending(false);
    }
  };

  // Victim's full screen map
  if (mapData) {
    return (
      <TrackingMap
        sosId={mapData.sosId}
        role="victim"
        victimLocation={mapData.victimLocation}
        volunteerName={mapData.volunteerName}
        onClose={() => {
          setMapData(null);
          navigate("/dashboard");
        }}
      />
    );
  }

  // Success / waiting screen
  if (sent) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4 animate-bounce">🚨</div>
        <h1 className="text-2xl font-bold text-red-700 mb-2">
          SOS Alert Sent!
        </h1>
        <p className="text-gray-600 mb-2">
          <span className="font-semibold text-red-600">
            {sent.notifiedVolunteers}
          </span>{" "}
          volunteer(s) notified nearby
        </p>
        <p className="text-gray-500 text-sm mb-2">
          Stay calm. Help is on the way.
        </p>

        {/* Pulsing waiting indicator */}
        <div className="flex items-center gap-2 bg-white border border-red-200 rounded-xl px-4 py-3 mb-8">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping inline-block" />
          <span className="text-sm text-gray-600">
            Waiting for a volunteer to accept — map will open automatically
          </span>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Go back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-gray-600"
        >
          ← Back
        </button>
        <span className="font-bold text-red-600 text-lg">🚨 SOS Alert</span>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {countdown !== null && (
          <div className="fixed inset-0 bg-red-600 bg-opacity-95 flex flex-col items-center justify-center z-50">
            <p className="text-white text-xl font-semibold mb-2">
              Sending SOS in
            </p>
            <p className="text-white text-8xl font-bold mb-8">{countdown}</p>
            <button
              onClick={cancelCountdown}
              className="bg-white text-red-600 px-10 py-3 rounded-2xl font-bold text-lg"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            location
              ? location.accuracy && location.accuracy < 20
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
              : locationError
                ? "bg-red-50 text-red-600"
                : "bg-yellow-50 text-yellow-700"
          }`}
        >
          {location
            ? `📍 Location ready ${location.accuracy ? `(±${Math.round(location.accuracy)}m accuracy)` : ""}`
            : locationError || "⏳ Getting your precise location..."}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Who needs help?
          </p>
          <div className="flex gap-3">
            {[
              { val: true, label: "👤 For me" },
              { val: false, label: "🧑‍🤝‍🧑 For someone else" },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                onClick={() => setForSelf(opt.val)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                  forSelf === opt.val
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Type of emergency
          </p>
          <div className="grid grid-cols-2 gap-2">
            {EMERGENCY_TYPES.map((et) => (
              <button
                key={et.value}
                onClick={() => setEmergencyType(et.value)}
                className={`py-2 px-3 rounded-xl text-sm border text-left transition-all ${
                  emergencyType === et.value
                    ? "bg-red-50 border-red-400 text-red-700 font-medium"
                    : "bg-white border-gray-200 text-gray-600 hover:border-red-200"
                }`}
              >
                {et.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Photo (optional)
          </p>
          {photoPreview && (
            <img
              src={photoPreview}
              alt="preview"
              className="w-full h-36 object-cover rounded-xl mb-2"
            />
          )}
          <label className="flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-xl py-3 cursor-pointer hover:border-red-300 transition text-sm text-gray-500">
            📷 {photo ? "Change photo" : "Add a photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
          </label>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Voice note (optional)
          </p>
          {voiceBlob ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <audio
                controls
                src={URL.createObjectURL(voiceBlob)}
                className="flex-1 h-8"
              />
              <button
                onClick={() => setVoiceBlob(null)}
                className="text-red-400 text-xs"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`w-full py-3 rounded-xl text-sm font-medium border transition ${
                recording
                  ? "bg-red-50 border-red-400 text-red-600 animate-pulse"
                  : "bg-white border-gray-200 text-gray-600 hover:border-red-300"
              }`}
            >
              {recording ? "⏹ Stop recording" : "🎙 Start recording"}
            </button>
          )}
        </div>

        <button
          onClick={handleSOSTrigger}
          disabled={sending || !location}
          className="w-full bg-red-600 text-white py-5 rounded-2xl text-xl font-bold hover:bg-red-700 active:scale-95 transition-all shadow-lg disabled:opacity-50 mt-4"
        >
          {sending ? "Sending..." : "🆘 SEND SOS ALERT"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Your location will be shared with nearby volunteers
        </p>
      </div>
    </div>
  );
};

export default SOSPage;
