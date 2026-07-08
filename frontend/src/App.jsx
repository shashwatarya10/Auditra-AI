import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ShieldCheck, AlertTriangle, FileText, Volume2, Download } from "lucide-react";

// Animates a number from its previous value to a new target whenever the
// target changes. Purely presentational — does not touch any app state.
function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(target) || 0;
    const start = performance.now();

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en");

  const speakReport = () => {
    if (!result) return;

    const speech = new SpeechSynthesisUtterance(
      `
    ${result.summary || ""}

    Risk score ${result.risk_score}.

    Amount at risk ${result.amount_at_risk} rupees.

    ${result.anomalies.length} issues detected.
    `
    );

    const voiceMap = {
      en: "en-IN",
      hi: "hi-IN",
      mr: "mr-IN",
      gu: "gu-IN",
      ta: "ta-IN",
      te: "te-IN",
    };

    speech.lang =
      voiceMap[language] || "en-IN";

    window.speechSynthesis.speak(
      speech
    );
  };

  const downloadReport = async () => {
    if (!result) return;

    try {
      const response = await axios.post(
        "https://auditra-backend.onrender.com",
        {
          result,
          language,
        },
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");

      link.href = url;
      link.download = "Auditra_Report.pdf";

      document.body.appendChild(link);

      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to download report.");
    }
  };

  const analyzeFile = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      setLoading(true);

      const response = await axios.post(
        "https://auditra-backend.onrender.com",
        formData
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const data = result || {
    risk_score: 0,
    amount_at_risk: 0,
    confidence_score: 0,
    risk_level: "",
    summary: "",
    recommendations: [],
    anomalies: [],
  };

  // Shared tone logic — single source of truth for risk-based color
  const riskTone =
    data.risk_score > 70
      ? { text: "text-rose-400", bar: "bg-rose-400", chip: "bg-rose-400/10 text-rose-400 border-rose-400/20" }
      : data.risk_score > 40
        ? { text: "text-amber-400", bar: "bg-amber-400", chip: "bg-amber-400/10 text-amber-400 border-amber-400/20" }
        : { text: "text-emerald-400", bar: "bg-emerald-400", chip: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" };

  const severityTone = (severity) => {
    const s = severity?.toLowerCase();
    if (s === "high") return "bg-rose-400/10 text-rose-400 border-rose-400/20";
    if (s === "medium") return "bg-amber-400/10 text-amber-400 border-amber-400/20";
    return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
  };

  // Stronger per-severity styling for anomaly cards: left-border accent,
  // icon color, and a faint background tint so high-severity issues pull
  // the eye first, instead of relying on the small chip alone.
  const severityCardStyle = (severity) => {
    const s = severity?.toLowerCase();
    if (s === "high")
      return {
        card: "border-rose-400/25 bg-rose-400/[0.04] border-l-2 border-l-rose-400",
        icon: "text-rose-400",
      };
    if (s === "medium")
      return {
        card: "border-amber-400/20 bg-amber-400/[0.03] border-l-2 border-l-amber-400",
        icon: "text-amber-400",
      };
    return {
      card: "border-white/[0.06] border-l-2 border-l-emerald-400/40",
      icon: "text-emerald-400/80",
    };
  };

  // Animated values — count up toward the latest result whenever it changes.
  const animatedRiskScore = useCountUp(data.risk_score);
  const animatedAmountAtRisk = useCountUp(data.amount_at_risk);
  const animatedConfidence = useCountUp(data.confidence_score);
  const animatedIssueCount = useCountUp(data.anomalies.length, 500);

  const fmtInt = (n) => Math.round(n).toLocaleString("en-IN");

  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e5e7eb] [font-feature-settings:'tnum'] antialiased">
      <div className="max-w-6xl mx-auto px-6 py-10 md:px-10 md:py-14">

        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-12 pb-8 border-b border-white/[0.06]">

          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
              <ShieldCheck size={24} className="text-[#5b8def]" strokeWidth={1.75} />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Auditra
              </h1>

              <p className="text-[13px] text-slate-500 mt-1">
                AI-powered financial audit & anomaly detection
              </p>

      
            </div>
          </div>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#5b8def]/50 focus:border-[#5b8def]/50"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
            <option value="gu">Gujarati</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
          </select>

        </div>

        {/* Upload + Risk */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5">

          <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.08] rounded-xl p-7">

            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-base font-medium text-slate-200">
                Upload financial document
              </h2>
              <p className="text-[12px] text-slate-500">
                PDF · Scanned PDF · JPG · PNG
              </p>
            </div>

            <label
              htmlFor="file-upload"
              className="block border border-dashed border-white/[0.12] hover:border-[#5b8def]/40 rounded-lg p-10 text-center cursor-pointer transition-colors"
            >
              <FileText
                size={32}
                className="mx-auto mb-3 text-slate-500"
                strokeWidth={1.5}
              />

              <p className="text-sm text-slate-400">
                {file ? "Choose a different file" : "Click to choose a file, or drag it here"}
              </p>

              <input
                id="file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const selected =
                    e.target.files?.[0];

                  if (!selected) return;

                  setFile(selected);
                }}
              />

              {file && (
                <div className="mt-4 inline-flex flex-col items-center">
                  <p className="text-sm text-[#5b8def]">
                    {file.name}
                  </p>

                  <p className="text-slate-500 text-[12px] mt-0.5">
                    {file.type}
                  </p>
                </div>
              )}

            </label>

            <button
              onClick={analyzeFile}
              disabled={loading}
              className="mt-5 w-full sm:w-auto bg-[#5b8def] hover:bg-[#4a7adf] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              {loading
                ? "Analyzing..."
                : "Analyze invoice"}
            </button>

          </div>

          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-7 flex flex-col">

            <h2 className="text-base font-medium text-slate-200 mb-6">
              Risk assessment
            </h2>

            {/* Signature element: ledger-style segmented risk meter, replaces circular gauge */}
            <div className="flex items-end justify-between mb-2">
              <span className={`text-4xl font-semibold tabular-nums ${riskTone.text}`}>
                {fmtInt(animatedRiskScore)}
              </span>
              <span className="text-[12px] text-slate-500 mb-1.5">/ 100</span>
            </div>

            <div className="flex gap-[3px] h-1.5 mb-1">
              {Array.from({ length: 20 }).map((_, i) => {
                const filled = i < Math.round(animatedRiskScore / 5);
                return (
                  <span
                    key={i}
                    className={`flex-1 rounded-[1px] transition-colors duration-150 ${filled ? riskTone.bar : "bg-white/[0.06]"}`}
                  />
                );
              })}
            </div>

            <p className={`inline-flex self-start mt-4 px-2.5 py-1 rounded-md border text-[12px] font-medium ${riskTone.chip}`}>
              {data.risk_level || "Unknown"}
            </p>

            <div className="mt-auto pt-6 border-t border-white/[0.06] mt-6 flex items-center justify-between">
              <span className="text-[13px] text-slate-500">
                AI confidence
              </span>

              <span className="text-lg font-semibold tabular-nums text-slate-200">
                {fmtInt(animatedConfidence)}%
              </span>
            </div>

          </div>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">

          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-[12px] text-slate-500 mb-2">
              Risk score
            </h3>
            <p className={`text-2xl font-semibold tabular-nums ${riskTone.text}`}>
              {fmtInt(animatedRiskScore)}
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-[12px] text-slate-500 mb-2">
              Amount at risk
            </h3>
            <p className="text-2xl font-semibold tabular-nums text-slate-100">
              ₹{fmtInt(animatedAmountAtRisk)}
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-[12px] text-slate-500 mb-2">
              Issues found
            </h3>
            <p className="text-2xl font-semibold tabular-nums text-slate-100">
              {fmtInt(animatedIssueCount)}
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-[12px] text-slate-500 mb-2">
              Confidence
            </h3>
            <p className="text-2xl font-semibold tabular-nums text-slate-100">
              {fmtInt(animatedConfidence)}%
            </p>
          </div>

        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 mb-5">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/10 border-t-[#5b8def]" />
              <span className="text-sm text-slate-400">
                AI reviewing financial records...
              </span>
            </div>
          </div>
        )}

        {/* Audit Summary */}
        {result && (
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-7 mb-5">

            <h2 className="text-base font-medium text-slate-200 mb-4">
              Audit summary
            </h2>

            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <div>
                <dt className="text-[12px] text-slate-500">Risk score</dt>
                <dd className={`tabular-nums font-medium mt-0.5 ${riskTone.text}`}>{fmtInt(animatedRiskScore)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-slate-500">Amount at risk</dt>
                <dd className="tabular-nums font-medium mt-0.5 text-slate-200">₹{fmtInt(animatedAmountAtRisk)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-slate-500">Issues found</dt>
                <dd className="tabular-nums font-medium mt-0.5 text-slate-200">{fmtInt(animatedIssueCount)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-slate-500">Confidence</dt>
                <dd className="tabular-nums font-medium mt-0.5 text-slate-200">{fmtInt(animatedConfidence)}%</dd>
              </div>
              <div>
                <dt className="text-[12px] text-slate-500">Risk level</dt>
                <dd className={`font-medium mt-0.5 ${riskTone.text}`}>{data.risk_level || "Unknown"}</dd>
              </div>
            </dl>

            {data.summary && (
              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <h3 className="text-[12px] text-slate-500 mb-2">
                  Executive summary
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.summary}
                </p>
              </div>
            )}

          </div>
        )}

        {/* Issues */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-7 mb-5">

          <h2 className="text-base font-medium text-slate-200 mb-5">
            Detected issues
          </h2>

          {data.anomalies.length === 0 ? (
            <p className="text-sm text-slate-500">
              No issues detected yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.anomalies.map((item, index) => {
                const style = severityCardStyle(item.severity);
                return (
                  <div
                    key={index}
                    className={`border rounded-lg pl-4 pr-4 py-4 ${style.card}`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <AlertTriangle size={15} className={style.icon} strokeWidth={1.75} />

                      <span
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${severityTone(item.severity)}`}
                      >
                        {item.severity}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-200">
                      {item.issue}
                    </p>

                    <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                      {item.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {result && (
          <div className="flex gap-3 mb-5">
            <button
              onClick={speakReport}
              className="inline-flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-200 px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              <Volume2 size={15} strokeWidth={1.75} />
              Listen to report
            </button>

            <button
              onClick={downloadReport}
              className="inline-flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-200 px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              <Download size={15} strokeWidth={1.75} />
              Download report
            </button>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-7">

          <h2 className="text-base font-medium text-slate-200 mb-4">
            AI recommendations
          </h2>

          <ul className="space-y-2.5">

            {data.recommendations?.length > 0 ? (

              data.recommendations.map(
                (rec, index) => (
                  <li key={index} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
                    <span className="text-[#5b8def] mt-0.5">—</span>
                    <span>{rec}</span>
                  </li>
                )
              )

            ) : (

              <li className="text-sm text-slate-500">
                No recommendations available.
              </li>

            )}

          </ul>

        </div>

      </div>
    </div>
  );
}
