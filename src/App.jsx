import { useState, useEffect, useRef, useCallback } from "react";

function useLivePrice() {
  const [price, setPrice] = useState(5026.4);
  const [prev, setPrev] = useState(5026.4);
  const [history, setHistory] = useState(() => {
    const base = 5026.4;
    return Array.from({ length: 48 }, (_, i) => ({
      time: i,
      price: base + (Math.random() - 0.49) * 40 - (48 - i) * 0.3,
    }));
  });
  useEffect(() => {
    const iv = setInterval(() => {
      setPrice((p) => {
        const next = +(p + (Math.random() - 0.495) * 1.8).toFixed(2);
        setPrev(p);
        setHistory((h) => [...h.slice(-47), { time: Date.now(), price: next }]);
        return next;
      });
    }, 2000);
    return () => clearInterval(iv);
  }, []);
  return { price, prev, history };
}

function Sparkline({ data, color = "#D4A843", width = 760, height = 80 }) {
  if (!data.length) return null;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const fillPts = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Gauge({ value, label, color }) {
  const toXY = (deg, r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  };
  const arcPath = (startDeg, endDeg, r) => {
    const [sx, sy] = toXY(startDeg, r);
    const [ex, ey] = toXY(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };
  const angle = -120 + (value / 100) * 240;
  const [nx, ny] = toXY(angle, 28);
  return (
    <svg viewBox="0 0 100 60" style={{ width: 90, height: 54 }}>
      <path d={arcPath(-120, 120, 36)} fill="none" stroke="#2a2010" strokeWidth="6" strokeLinecap="round" />
      <path d={arcPath(-120, angle, 36)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="50" x2={nx} y2={ny} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="3" fill={color} />
      <text x="50" y="58" textAnchor="middle" fill={color} fontSize="8" fontFamily="Georgia">{label}</text>
    </svg>
  );
}

function AIChat({ price }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `您好！当前黄金报价 $${price.toFixed(2)}。我是您的黄金交易AI助手，可以帮您分析行情、计算风险、解读信号。请问有什么需要？` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const history = [...messages, userMsg];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `你是一位专业的黄金交易顾问AI助手，服务中国散户投资者。当前黄金现货价格：$${price.toFixed(2)} (XAU/USD)。
请用简洁、专业的中文回答交易相关问题，包括：行情分析、技术面解读、止损止盈建议、仓位管理。
回答控制在150字以内，直接给出结论和建议，避免冗长。`,
          messages: history.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.map((c) => c.text || "").join("") || "抱歉，暂时无法获取回复。";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "连接失败，请稍后重试。" }]);
    }
    setLoading(false);
  }, [input, loading, messages, price]);

  const quickQ = ["现在适合买入吗？", "今日关键支撑位？", "如何设置止损？", "黄金趋势判断"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px",
              background: m.role === "user" ? "#2a1e08" : "#161208",
              border: `1px solid ${m.role === "user" ? "#D4A84340" : "#2a2010"}`,
              fontSize: 13, lineHeight: 1.65,
              color: m.role === "user" ? "#e8d5a3" : "#c8b882",
              borderRadius: 2,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "10px 14px", background: "#161208", border: "1px solid #2a2010", fontSize: 12, color: "#7a6030" }}>
              ◈ 分析中…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {quickQ.map((q) => (
          <button key={q} onClick={() => setInput(q)}
            style={{ padding: "4px 10px", background: "transparent", border: "1px solid #2a2010", color: "#7a6030", fontSize: 11, cursor: "pointer", borderRadius: 2 }}>
            {q}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="输入您的问题…"
          style={{
            flex: 1, background: "#0d0b04", border: "1px solid #2a2010", color: "#e8d5a3",
            padding: "9px 12px", fontSize: 13, outline: "none", borderRadius: 2,
            fontFamily: "Georgia, serif",
          }} />
        <button onClick={send} disabled={loading}
          style={{
            padding: "0 18px", background: loading ? "#1a1408" : "#D4A843",
            color: loading ? "#5a4820" : "#0d0b04",
            border: "none", cursor: loading ? "default" : "pointer",
            fontSize: 13, fontWeight: "bold", borderRadius: 2,
          }}>发送</button>
      </div>
    </div>
  );
}

export default function App() {
  const { price, prev, history } = useLivePrice();
  const up = price >= prev;
  const change24h = +(price - 4986.1).toFixed(2);
  const changePct = +((change24h / 4986.1) * 100).toFixed(2);

  const [alerts, setAlerts] = useState([]);
  const [alertInput, setAlertInput] = useState("");
  const [alertType, setAlertType] = useState("above");
  const [triggered, setTriggered] = useState([]);
  useEffect(() => {
    alerts.forEach((a) => {
      const hit = a.type === "above" ? price >= a.value : price <= a.value;
      if (hit && !triggered.includes(a.id)) setTriggered((t) => [...t, a.id]);
    });
  }, [price, alerts, triggered]);

  const [calcMode, setCalcMode] = useState("long");
  const [entry, setEntry] = useState("");
  const [slPct, setSlPct] = useState("1.5");
  const [tpRatio, setTpRatio] = useState("2");
  const [capital, setCapital] = useState("50000");
  const [riskPct, setRiskPct] = useState("2");

  const entryN = parseFloat(entry) || price;
  const slPctN = parseFloat(slPct) || 1.5;
  const tpRatioN = parseFloat(tpRatio) || 2;
  const capitalN = parseFloat(capital) || 50000;
  const riskPctN = parseFloat(riskPct) || 2;
  const slPrice = calcMode === "long" ? +(entryN * (1 - slPctN / 100)).toFixed(2) : +(entryN * (1 + slPctN / 100)).toFixed(2);
  const slDist = Math.abs(entryN - slPrice);
  const tpPrice = calcMode === "long" ? +(entryN + slDist * tpRatioN).toFixed(2) : +(entryN - slDist * tpRatioN).toFixed(2);
  const maxRiskAmount = capitalN * (riskPctN / 100);
  const lotSize = +(maxRiskAmount / slDist).toFixed(4);
  const potentialProfit = +(lotSize * slDist * tpRatioN).toFixed(2);

  const signals = [
    { label: "趋势方向", value: "多头", detail: "价格高于200MA，上升通道完整", color: "#4aba7a", icon: "▲" },
    { label: "RSI (14)", value: "52.4", detail: "中性区间，无超买超卖", color: "#D4A843", icon: "◎" },
    { label: "MACD", value: "金叉", detail: "MACD线上穿信号线，看涨信号", color: "#4aba7a", icon: "▲" },
    { label: "布林带", value: "中轨附近", detail: "价格在中轨上方运行，偏强", color: "#D4A843", icon: "◎" },
    { label: "支撑位", value: "$4,994", detail: "近期低点及20MA支撑", color: "#7EB8F7", icon: "▣" },
    { label: "阻力位", value: "$5,080", detail: "前高及心理整数关口", color: "#F7A07E", icon: "▣" },
  ];

  const [tab, setTab] = useState("price");
  const tabs = [
    { id: "price", label: "实时金价" },
    { id: "calc", label: "止损止盈" },
    { id: "signals", label: "技术信号" },
    { id: "ai", label: "AI助手" },
  ];

  const inputStyle = {
    background: "#0d0b04", border: "1px solid #2a2010", color: "#e8d5a3",
    padding: "8px 12px", fontSize: 13, outline: "none", width: "100%",
    fontFamily: "Georgia, serif", borderRadius: 2, boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, color: "#5a4820", letterSpacing: 1, marginBottom: 4, display: "block" };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0a04", fontFamily: "Georgia, 'STSong', serif", color: "#e8d5a3", display: "flex", flexDirection: "column" }}>
      {/* Top Bar */}
      <div style={{ background: "#0d0b04", borderBottom: "1px solid #1e1808", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 10, letterSpacing: 5, color: "#5a4020", marginRight: 16 }}>XAU · GOLD</span>
          <span style={{ fontSize: 26, color: "#D4A843", fontWeight: "bold", letterSpacing: 1 }}>${price.toFixed(2)}</span>
          <span style={{ marginLeft: 12, fontSize: 13, color: up ? "#4aba7a" : "#c05050" }}>
            {up ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)} ({changePct > 0 ? "+" : ""}{changePct}%)
          </span>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            { l: "今日开盘", v: "$4,986.10" },
            { l: "24H最高", v: "$5,031.40" },
            { l: "24H最低", v: "$4,968.20" },
            { l: "人民币/克", v: `¥${(price * 7.24 / 31.1).toFixed(2)}` },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#5a4020", letterSpacing: 1 }}>{s.l}</div>
              <div style={{ fontSize: 13, color: "#c8b882" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e1808", background: "#0d0b04" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "12px 24px", background: "transparent", border: "none",
              borderBottom: tab === t.id ? "2px solid #D4A843" : "2px solid transparent",
              color: tab === t.id ? "#D4A843" : "#5a4820",
              cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif", transition: "color 0.2s",
            }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "24px 28px", maxWidth: 900, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* PRICE TAB */}
        {tab === "price" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#0f0d06", border: "1px solid #1e1808", padding: "20px 24px" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a4020", marginBottom: 16 }}>近48次更新走势（每2秒刷新）</div>
              <Sparkline data={history} color={up ? "#D4A843" : "#c05050"} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "#3a2e10" }}>
                <span>较早</span><span>当前</span>
              </div>
            </div>
            <div style={{ background: "#0f0d06", border: "1px solid #1e1808", padding: "20px 24px" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a4020", marginBottom: 16 }}>价格预警设置</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <select value={alertType} onChange={(e) => setAlertType(e.target.value)}
                  style={{ ...inputStyle, width: "auto", padding: "8px 10px" }}>
                  <option value="above">突破上方</option>
                  <option value="below">跌破下方</option>
                </select>
                <input value={alertInput} onChange={(e) => setAlertInput(e.target.value)}
                  placeholder={`输入价格，如 $5050`} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                <button onClick={() => {
                  const v = parseFloat(alertInput);
                  if (!v) return;
                  setAlerts((a) => [...a, { id: Date.now(), value: v, type: alertType }]);
                  setAlertInput("");
                }} style={{ padding: "8px 18px", background: "#D4A843", color: "#0d0b04", border: "none", cursor: "pointer", fontSize: 13, fontWeight: "bold", borderRadius: 2 }}>
                  添加
                </button>
              </div>
              {alerts.length === 0 && <div style={{ fontSize: 12, color: "#3a2e10" }}>暂无预警 — 输入价格后点击添加</div>}
              {alerts.map((a) => {
                const hit = triggered.includes(a.id);
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", marginBottom: 6, background: hit ? "#1a0a04" : "#131006", border: `1px solid ${hit ? "#c05050" : "#1e1808"}`, borderRadius: 2 }}>
                    <span style={{ fontSize: 12, color: hit ? "#c05050" : "#c8b882" }}>
                      {hit ? "🔔 " : ""}{a.type === "above" ? "突破 $" : "跌破 $"}{a.value.toFixed(2)}{hit && " — 已触发！"}
                    </span>
                    <button onClick={() => setAlerts((al) => al.filter((x) => x.id !== a.id))}
                      style={{ background: "transparent", border: "none", color: "#5a4020", cursor: "pointer", fontSize: 18 }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CALCULATOR TAB */}
        {tab === "calc" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "#0f0d06", border: "1px solid #1e1808", padding: "20px 24px" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a4020", marginBottom: 18 }}>参数设置</div>
              <div style={{ display: "flex", gap: 0, marginBottom: 18 }}>
                {["long", "short"].map((m) => (
                  <button key={m} onClick={() => setCalcMode(m)}
                    style={{ flex: 1, padding: "8px", background: calcMode === m ? (m === "long" ? "#0d1f0d" : "#1f0d0d") : "transparent", border: `1px solid ${calcMode === m ? (m === "long" ? "#4aba7a" : "#c05050") : "#2a2010"}`, color: calcMode === m ? (m === "long" ? "#4aba7a" : "#c05050") : "#5a4020", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}>
                    {m === "long" ? "▲ 做多" : "▼ 做空"}
                  </button>
                ))}
              </div>
              {[
                { l: "入场价格 (USD)", val: entry, set: setEntry, ph: `当前 $${price.toFixed(2)}` },
                { l: "止损幅度 (%)", val: slPct, set: setSlPct, ph: "默认 1.5%" },
                { l: "盈亏比 (TP:SL)", val: tpRatio, set: setTpRatio, ph: "默认 2" },
                { l: "账户资金 (CNY ¥)", val: capital, set: setCapital, ph: "50000" },
                { l: "单笔风险 (%)", val: riskPct, set: setRiskPct, ph: "建议 1~2%" },
              ].map((f) => (
                <div key={f.l} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{f.l}</label>
                  <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ background: "#0f0d06", border: "1px solid #1e1808", padding: "20px 24px" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a4020", marginBottom: 18 }}>计算结果</div>
              {[
                { l: "入场价", v: `$${entryN.toFixed(2)}`, c: "#e8d5a3" },
                { l: "止损价", v: `$${slPrice.toFixed(2)}`, c: "#c05050" },
                { l: "止盈价", v: `$${tpPrice.toFixed(2)}`, c: "#4aba7a" },
                { l: "止损距离", v: `$${slDist.toFixed(2)}`, c: "#D4A843" },
                { l: "建议仓位 (盎司)", v: `${lotSize} oz`, c: "#7EB8F7" },
                { l: "最大风险金额", v: `¥${maxRiskAmount.toFixed(0)}`, c: "#c05050" },
                { l: "预期利润", v: `¥${potentialProfit.toFixed(0)}`, c: "#4aba7a" },
                { l: "盈亏比", v: `1 : ${tpRatioN}`, c: tpRatioN >= 2 ? "#4aba7a" : "#c05050" },
              ].map((r) => (
                <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1a1508" }}>
                  <span style={{ fontSize: 12, color: "#7a6030" }}>{r.l}</span>
                  <span style={{ fontSize: 14, color: r.c }}>{r.v}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "12px", background: tpRatioN >= 2 ? "#081a0e" : "#1a0808", border: `1px solid ${tpRatioN >= 2 ? "#4aba7a30" : "#c0505030"}`, fontSize: 11, color: tpRatioN >= 2 ? "#4aba7a" : "#c05050", lineHeight: 1.7 }}>
                {tpRatioN >= 2
                  ? `✓ 盈亏比 1:${tpRatioN} 符合标准。每次风险 ¥${maxRiskAmount.toFixed(0)}，赢时收益 ¥${potentialProfit.toFixed(0)}。`
                  : `⚠ 盈亏比低于 1:2，建议调整止盈目标，否则长期容易亏损。`}
              </div>
            </div>
          </div>
        )}

        {/* SIGNALS TAB */}
        {tab === "signals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#0f0d06", border: "1px solid #1e1808", padding: "20px 24px", display: "flex", alignItems: "center", gap: 32 }}>
              <Gauge value={72} label="综合评分" color="#D4A843" />
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a4020", marginBottom: 6 }}>综合技术评分</div>
                <div style={{ fontSize: 36, color: "#D4A843" }}>72<span style={{ fontSize: 14, color: "#7a6030" }}>/100</span></div>
                <div style={{ fontSize: 12, color: "#4aba7a", marginTop: 4 }}>▲ 偏多 — 技术面整体向好</div>
                <div style={{ fontSize: 11, color: "#5a4020", marginTop: 6 }}>短、中、长三周期多头一致</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {signals.map((s) => (
                <div key={s.label} style={{ background: "#0f0d06", border: "1px solid #1e1808", padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#5a4020", letterSpacing: 2 }}>{s.label}</span>
                    <span style={{ fontSize: 14, color: s.color }}>{s.icon} {s.value}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#7a6840", lineHeight: 1.6 }}>{s.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0a0d0a", border: "1px solid #1a2a1a", padding: "16px 20px", fontSize: 12, color: "#6a9a7a", lineHeight: 1.8 }}>
              <span style={{ color: "#4aba7a", letterSpacing: 2, fontSize: 10 }}>AI综合判断 · </span>
              当前黄金处于多头格局，MACD金叉叠加价格在均线上方运行，短线偏多操作。关注 $4,994 支撑——若跌破则多头结构转弱；上方 $5,080 为近期目标，突破可关注 $5,150。建议在支撑附近轻仓做多，严格止损。
            </div>
          </div>
        )}

        {/* AI TAB */}
        {tab === "ai" && (
          <div style={{ background: "#0f0d06", border: "1px solid #1e1808", padding: "20px 24px", height: 520, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#5a4020", marginBottom: 14 }}>
              AI 交易助手 · 实时金价 ${price.toFixed(2)}
            </div>
            <AIChat price={price} />
          </div>
        )}
      </div>

      <div style={{ padding: "12px 28px", borderTop: "1px solid #1a1408", fontSize: 10, color: "#3a2e10", textAlign: "center" }}>
        本工具仅供参考，不构成投资建议。黄金交易有风险，请量力而行。
      </div>
    </div>
  );
}
