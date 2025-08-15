import React, { useState, useRef, useEffect } from "react";
import YouTube from "react-youtube";
import axios from "axios";

const App = () => {
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("00:00");
  const [end, setEnd] = useState("00:00");
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState("");
  const [warning, setWarning] = useState("");
  const [progressStep, setProgressStep] = useState(0); // 0: idle, 1: request sent, 2: processing, 3: ready
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  // Convert mm:ss to seconds, returns NaN if invalid
  const timeToSeconds = (str) => {
    if (!/^\d{2}:\d{2}$/.test(str)) return NaN;
    const [mm, ss] = str.split(":").map(Number);
    if (isNaN(mm) || isNaN(ss) || mm < 0 || ss < 0 || ss > 59) return NaN;
    return mm * 60 + ss;
  };

  // Extract videoId from YouTube URL
  const extractVideoId = (url) => {
    const match = url.match(/[?&]v=([\w-]{11})/);
    if (match) return match[1];
    // Try youtu.be short links
    const short = url.match(/youtu\.be\/([\w-]{11})/);
    if (short) return short[1];
    return "";
  };

  // Validate all fields
  const validTimes = () => {
    const s = timeToSeconds(start);
    const e = timeToSeconds(end);
    return extractVideoId(url) && !isNaN(s) && !isNaN(e) && s < e;
  };

  // Timer for progress bar and looping
  useEffect(() => {
    if (!validTimes() || !playerRef.current) return;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      const p = playerRef.current;
      if (!p || !p.getCurrentTime) return;
      const t = await p.getCurrentTime();
      setCurrent(t);
      const s = timeToSeconds(start);
      const e = timeToSeconds(end);
      const ratio = Math.max(0, Math.min(1, (t - s) / (e - s)));
      setProgress(ratio * 100);
      if (t >= e - 0.05) {
        await p.seekTo(s, true);
        await p.playVideo();
      }
    }, 100);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line
  }, [url, start, end]);

  // Clean up timer on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  // Backend integration
  const handleSubmit = async () => {
    setLoading(true);
    setWarning("");
    setDownloadLink("");
    setProgressStep(1); // Step 1: Request sent
    try {
      setProgressStep(2); // Step 2: Processing
      const response = await axios.post("https://backendyt-lypc.onrender.com/clip", {
        url,
        start: timeToSeconds(start),
        end: timeToSeconds(end),
      });
      setDownloadLink(response.data.downloadUrl);
      setProgressStep(3); // Step 3: Ready
      if (response.data.warning) setWarning(response.data.warning);
    } catch (error) {
      setWarning("Error creating clip. Please try again.");
      setProgressStep(0);
    } finally {
      setLoading(false);
    }
  };

  // Removed timer countdown effect

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #e0eafc 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ color: "#fff", textShadow: "0 2px 8px #0007" }}>
        YouTube Video Clipper
      </h1>
      <input
        type="text"
        placeholder="Enter YouTube URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{
          padding: 8,
          margin: 8,
          borderRadius: 4,
          border: "1px solid #ccc",
          width: 300,
        }}
      />
      {/* Video Preview */}
      <div style={{ width: 480, margin: 16 }}>
        {validTimes() && (
          <YouTube
            videoId={extractVideoId(url)}
            ref={playerRef}
            opts={{
              width: "100%",
              height: "270px",
              playerVars: {
                start: Math.floor(timeToSeconds(start)),
                end: Math.floor(timeToSeconds(end)),
                controls: 1,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                disablekb: 0,
              },
            }}
            onReady={(e) => {
              playerRef.current = e.target;
              e.target.seekTo(timeToSeconds(start), true);
              e.target.playVideo();
            }}
            onStateChange={(e) => {
              // 1 = playing, 2 = paused, 0 = ended
              if (e.data === 2) clearInterval(intervalRef.current);
            }}
            className="w-full h-full"
            iframeClassName="w-full h-full"
          />
        )}
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              height: 8,
              background: "#eee",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: 8,
                background: "#2a5298",
              }}
            />
          </div>
          <div style={{ color: "#fff", fontSize: 12, marginTop: 4 }}>
            Time left: {Math.max(0, timeToSeconds(end) - current).toFixed(1)}s
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Start time (mm:ss)"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          maxLength={5}
          style={{
            padding: 8,
            borderRadius: 4,
            border: "1px solid #ccc",
            width: 120,
          }}
        />
        <input
          type="text"
          placeholder="End time (mm:ss)"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          maxLength={5}
          style={{
            padding: 8,
            borderRadius: 4,
            border: "1px solid #ccc",
            width: 120,
          }}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !validTimes()}
        style={{
          padding: "10px 24px",
          borderRadius: 6,
          border: "none",
          background: "#1e3c72",
          color: "#fff",
          fontWeight: "bold",
          fontSize: 16,
          boxShadow: "0 2px 8px #0002",
          cursor: loading || !validTimes() ? "not-allowed" : "pointer",
          marginBottom: 16,
          position: "relative",
        }}
      >
        {loading ? "Processing..." : "Create Clip"}
        {loading && (
          <span
            style={{
              position: "absolute",
              right: -40,
              top: "50%",
              transform: "translateY(-50%)",
              display: "inline-block",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 24,
                height: 24,
                border: "3px solid #fff",
                borderTop: "3px solid #2a5298",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </span>
        )}
      </button>
      {warning && <p style={{ color: "orange" }}>{warning}</p>}
      {/* Small text message during processing */}
      {loading && (
        <div style={{ marginTop: 12 }}>
          <span style={{ color: "#fff", fontSize: 14, opacity: 0.8 }}>
            it might take a couple of minutes !
          </span>
        </div>
      )}
      {/* Show download link only when ready */}
      {downloadLink && progressStep === 3 && (
        <div style={{ marginTop: 16 }}>
          <a
            href={downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#fff",
              background: "#2a5298",
              padding: 10,
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Download Clip
          </a>
        </div>
      )}
      {/* Spinner animation keyframes */}
      <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    </div>
  );
};

export default App;
