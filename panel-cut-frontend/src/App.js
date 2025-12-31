import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Line, Text, Group } from 'react-konva';

// --- MOCK DATA ---
const mockData = [
  {
    sheet: { w: 2800, h: 2100, id: 1 },
    layout: [
      { partId: 3, x: 0, y: 0, w: 1000, h: 500, finishedAtStep: 2 },
      { partId: 1, x: 0, y: 504, w: 800, h: 600, finishedAtStep: 4 }
    ],
    steps: [
      { stepNumber: 1, description: "Tabaka 1: Başlangıç...", axis: null, cutValue: 0 },
      { stepNumber: 2, description: "Yatay Kesim...", axis: "y", cutValue: 504 }
    ]
  }
];

const App = () => {
  // --- THEME STATE ---
  const [darkMode, setDarkMode] = useState(false);

  // --- UI STATE ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const canvasContainerRef = useRef(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });

  // --- APP STATE ---
  const [optimizationResult, setOptimizationResult] = useState(mockData);
  const [sheetSteps, setSheetSteps] = useState({ 0: 0 });
  const [parts, setParts] = useState([]);
  const [newPart, setNewPart] = useState({ width: '', height: '', count: 1 });
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [sheetWidth, setSheetWidth] = useState(2800);
  const [sheetHeight, setSheetHeight] = useState(2100);

  // --- RESIZE LISTENER ---
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- CANVAS SIZING LOGIC ---
  useLayoutEffect(() => {
    if (canvasContainerRef.current) {
      const { offsetWidth, offsetHeight } = canvasContainerRef.current;
      setCanvasDimensions({ width: offsetWidth - 20, height: offsetHeight - 20 });
    }
  }, [windowSize, isSidebarOpen, optimizationResult]);

  // --- HISTORY LOGIC ---
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = () => {
    fetch('/api/Optimization/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error("History fetch failed:", err));
  };

  const loadHistoryItem = (id) => {
    fetch(`/api/Optimization/history/${id}`)
      .then(res => res.json())
      .then(item => {
        if (!item) return;

        const normalizeKeys = (obj) => {
          if (Array.isArray(obj)) return obj.map(v => normalizeKeys(v));
          if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
              const newKey = key.charAt(0).toLowerCase() + key.slice(1);
              acc[newKey] = normalizeKeys(obj[key]);
              return acc;
            }, {});
          }
          return obj;
        };

        let request = JSON.parse(item.inputJson);
        let result = JSON.parse(item.resultJson);

        request = normalizeKeys(request);
        result = normalizeKeys(result);

        setSheetWidth(request.sheet.width);
        setSheetHeight(request.sheet.height);

        const uiParts = request.parts.map((p, index) => ({
          id: Date.now() + index,
          width: p.width,
          height: p.height,
          count: p.count
        }));
        setParts(uiParts);

        setOptimizationResult(result);

        const initialSteps = {};
        result.forEach((_, idx) => initialSteps[idx] = 0);
        setSheetSteps(initialSteps);
      })
      .catch(err => console.error("Load history failed:", err));
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Kaydı silmek istediğinize emin misiniz?")) {
      fetch(`/api/Optimization/history/${id}`, { method: 'DELETE' })
        .then(res => {
          if (res.ok) {
            fetchHistory();
          }
        })
        .catch(err => console.error("Delete failed:", err));
    }
  };

  // --- APP LOGIC ---
  const handleSavePart = () => {
    if (newPart.width && newPart.height && newPart.count) {
      if (editingId) {
        setParts(parts.map(p => p.id === editingId ? { ...newPart, id: editingId } : p));
        setEditingId(null);
      } else {
        setParts([...parts, { ...newPart, id: Date.now() }]);
      }
      setNewPart({ width: '', height: '', count: 1 });
    }
  };

  const handleEditClick = (part) => {
    setNewPart({ width: part.width, height: part.height, count: part.count });
    setEditingId(part.id);
  };

  const handleCancelEdit = () => {
    setNewPart({ width: '', height: '', count: 1 });
    setEditingId(null);
  };

  const handleCalculate = () => {
    const payload = {
      parts: parts.map(p => ({
        width: Number(p.width),
        height: Number(p.height),
        count: Number(p.count),
        id: 0
      })),
      sheet: {
        width: Number(sheetWidth),
        height: Number(sheetHeight),
        kerfSize: 3
      }
    };

    fetch('/api/Optimization/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Calculation failed");
        return res.json();
      })
      .then(data => {
        setOptimizationResult(data);
        const initialSteps = {};
        data.forEach((_, idx) => initialSteps[idx] = 0);
        setSheetSteps(initialSteps);
      })
      .catch(err => console.error("Error:", err));
  };

  const handleManualSave = () => {
    if (!saveName.trim()) return;

    const payload = {
      name: saveName,
      request: {
        parts: parts.map(p => ({
          width: Number(p.width),
          height: Number(p.height),
          count: Number(p.count),
          id: 0
        })),
        sheet: {
          width: Number(sheetWidth),
          height: Number(sheetHeight),
          kerfSize: 3
        }
      }
    };

    fetch('/api/Optimization/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Save failed");
        return res.json();
      })
      .then(data => {
        setOptimizationResult(data);
        const initialSteps = {};
        data.forEach((_, idx) => initialSteps[idx] = 0);
        setSheetSteps(initialSteps);
        fetchHistory();
        setSaveName("");
      })
      .catch(err => console.error("Error:", err));
  };

  // --- THEME DEFINITION ---
  const theme = {
    bg: darkMode ? '#121212' : '#f0f2f5',
    text: darkMode ? '#e0e0e0' : '#333333',
    panelBg: darkMode ? '#1e1e1e' : '#ffffff',
    panelBorder: darkMode ? '#333' : '#ddd',
    inputBg: darkMode ? '#2d2d2d' : '#fff',
    inputBorder: darkMode ? '#555' : '#ccc',
    headerBg: darkMode ? '#1f1f1f' : '#ffffff',
    headerShadow: darkMode ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
    buttonPrimary: '#007bff',
    buttonText: '#ffffff',
    textMuted: darkMode ? '#aaaaaa' : '#666666',
    sheetFill: darkMode ? '#d4c6a1' : '#f4e6c1',
  };

  const isMobile = windowSize.width < 768;

  // --- STYLES ---
  const transition = 'background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease';

  const styles = {
    container: {
      height: '100vh',
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition
    },
    header: {
      height: '60px',
      flexShrink: 0,
      backgroundColor: theme.headerBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 20px',
      boxShadow: theme.headerShadow,
      position: 'relative',
      zIndex: 20,
      transition
    },
    headerTitle: {
      margin: 0,
      fontSize: '24px',
      fontWeight: '600',
      transition
    },
    themeToggle: {
      position: 'absolute',
      right: '20px',
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      padding: '5px',
      transition
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      overflow: 'hidden',
      position: 'relative',
      transition
    },
    leftPanel: {
      width: isMobile ? '100%' : '320px',
      flexShrink: 0,
      backgroundColor: theme.panelBg,
      borderRight: isMobile ? 'none' : `1px solid ${theme.panelBorder}`,
      borderBottom: isMobile ? `1px solid ${theme.panelBorder}` : 'none',
      padding: '20px',
      overflowY: 'auto',
      zIndex: 10,
      transition
    },
    centerPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.bg,
      overflow: 'hidden',
      position: 'relative',
      padding: '10px',
      transition
    },
    rightPanel: {
      flexShrink: 0,
      width: isSidebarOpen ? '250px' : '40px',
      backgroundColor: theme.panelBg,
      borderLeft: `1px solid ${theme.panelBorder}`,
      transition: `width 0.3s ease, ${transition}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 10
    },
    sidebarToggleBtn: {
      width: '100%',
      height: '40px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '20px',
      color: theme.text,
      borderBottom: `1px solid ${theme.panelBorder}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition
    },
    verticalTextContainer: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      writingMode: 'vertical-rl',
      transform: 'rotate(180deg)',
      cursor: 'pointer',
      transition
    },
    verticalText: {
      fontSize: '16px',
      fontWeight: 'bold',
      letterSpacing: '2px',
      whiteSpace: 'nowrap',
      transition
    },
    input: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: `1px solid ${theme.inputBorder}`,
      backgroundColor: theme.inputBg,
      color: theme.text,
      boxSizing: 'border-box',
      transition
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px',
      color: theme.text,
      transition
    },
    button: {
      padding: '10px 15px',
      fontSize: '14px',
      cursor: 'pointer',
      backgroundColor: theme.buttonPrimary,
      color: theme.buttonText,
      border: 'none',
      borderRadius: '4px',
      fontWeight: '500',
      transition: 'opacity 0.2s, background-color 0.4s ease'
    },
    listItem: {
      marginBottom: '0',
      padding: '10px',
      borderBottom: `1px solid ${theme.panelBorder}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      transition
    },
    canvasContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: darkMode ? '#121212' : '#e0e0e0',
      border: `1px solid ${theme.panelBorder}`,
      borderRadius: '4px',
      overflow: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Kesimci</h1>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={styles.themeToggle}
          title={darkMode ? "Aydınlık Moda Geç" : "Karanlık Moda Geç"}
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </header>

      {/* MAIN CONTENT ROW */}
      <div style={styles.mainContent}>

        {/* LEFT PANEL: INPUT FORM */}
        <div style={styles.leftPanel}>
          <h3 style={{ marginTop: 0 }}>Tabaka & Parça</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={styles.label}>Tabaka Genişlik (mm)</label>
            <input
              type="number"
              value={sheetWidth}
              onChange={e => setSheetWidth(Number(e.target.value))}
              style={styles.input}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Tabaka Yükseklik (mm)</label>
            <input
              type="number"
              value={sheetHeight}
              onChange={e => setSheetHeight(Number(e.target.value))}
              style={styles.input}
            />
          </div>

          <hr style={{ borderColor: theme.panelBorder, margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={styles.label}>Parça Genişlik</label>
              <input
                type="number"
                value={newPart.width}
                onChange={e => setNewPart({ ...newPart, width: e.target.value })}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Parça Yükseklik</label>
              <input
                type="number"
                value={newPart.height}
                onChange={e => setNewPart({ ...newPart, height: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={styles.label}>Adet</label>
            <input
              type="number"
              value={newPart.count}
              onChange={e => setNewPart({ ...newPart, count: e.target.value })}
              style={styles.input}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={handleSavePart}
              style={{ ...styles.button, flex: 1, backgroundColor: editingId ? '#ffc107' : '#28a745', color: editingId ? '#000' : '#fff' }}
            >
              {editingId ? 'Güncelle' : 'Ekle'}
            </button>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                style={{ ...styles.button, backgroundColor: '#dc3545' }}
              >
                İptal
              </button>
            )}
          </div>

          <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '20px', border: `1px solid ${theme.panelBorder}`, borderRadius: '4px', padding: '10px' }}>
            <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '5px' }}>
              Eklenen Parçalar ({parts.reduce((acc, p) => acc + Number(p.count), 0)}):
            </div>
            {parts.map(p => (
              <div
                key={p.id}
                onClick={() => handleEditClick(p)}
                style={{
                  padding: '4px 8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: editingId === p.id ? (darkMode ? '#333' : '#e9ecef') : 'transparent',
                  borderRadius: '2px',
                  marginBottom: '2px'
                }}
              >
                {p.count} adet - {p.width}x{p.height}mm {editingId === p.id && <b>(Dz)</b>}
              </div>
            ))}
          </div>

          <button onClick={handleCalculate} style={{ ...styles.button, width: '100%', marginBottom: '20px' }}>
            Maliyetlendir ve Çiz
          </button>

          <div style={{ borderTop: `1px solid ${theme.panelBorder}`, paddingTop: '15px' }}>
            <label style={styles.label}>Kayıt Adı:</label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input
                type="text"
                placeholder="Örn: Mutfak Dolabı"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleManualSave}
                disabled={!saveName.trim()}
                style={{ ...styles.button, backgroundColor: saveName.trim() ? '#17a2b8' : theme.panelBorder, cursor: saveName.trim() ? 'pointer' : 'not-allowed' }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: CANVAS AREA */}
        <div style={styles.centerPanel}>
          {optimizationResult.map((result, sheetIndex) => {
            const currentStepIdx = sheetSteps[sheetIndex] || 0;
            const currentInstruction = result.steps[currentStepIdx] || (result.steps && result.steps[0]) || {};

            // Maximize Draw Area
            const sW = result.sheet?.width || result.sheet?.w || sheetWidth;
            const sH = result.sheet?.height || result.sheet?.h || sheetHeight;

            // Scale logic based on AVAILABLE canvas size
            const scX = canvasDimensions.width / sW;
            const scY = canvasDimensions.height / sH;
            const SCALE = Math.min(scX, scY) * 0.9; // 90% fill to leave margin

            const handleSheetNext = () => {
              if (result.steps && currentStepIdx < result.steps.length - 1) {
                setSheetSteps(prev => ({ ...prev, [sheetIndex]: currentStepIdx + 1 }));
              }
            };
            const handleSheetPrev = () => {
              if (currentStepIdx > 0) {
                setSheetSteps(prev => ({ ...prev, [sheetIndex]: currentStepIdx - 1 }));
              }
            };

            return (
              <div key={sheetIndex} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Sheet Toolbar */}
                <div style={{ flexShrink: 0, padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.panelBorder}` }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Tabaka {sheetIndex + 1}</h3>
                  {result.steps && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button onClick={handleSheetPrev} disabled={currentStepIdx === 0} style={{ ...styles.button, padding: '5px 10px' }}>◀</button>
                      <span style={{ fontSize: '14px' }}>Adım {currentInstruction.stepNumber}</span>
                      <button onClick={handleSheetNext} disabled={currentStepIdx === result.steps.length - 1} style={{ ...styles.button, padding: '5px 10px' }}>▶</button>
                    </div>
                  )}
                </div>

                {/* Canvas Wrapper */}
                <div ref={canvasContainerRef} style={styles.canvasContainer}>
                  <div style={{ border: `2px solid ${theme.text}`, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
                    <Stage width={sW * SCALE} height={sH * SCALE}>
                      <Layer>
                        <Rect
                          x={0}
                          y={0}
                          width={sW * SCALE}
                          height={sH * SCALE}
                          fill={theme.sheetFill}
                          stroke={darkMode ? "#ccc" : "black"}
                          strokeWidth={2}
                        />
                        {result.layout.map((part, i) => {
                          const isFinished = currentStepIdx >= part.finishedAtStep;
                          return (
                            <Group key={i}>
                              <Rect
                                x={part.x * SCALE}
                                y={part.y * SCALE}
                                width={part.w * SCALE}
                                height={part.h * SCALE}
                                fill={isFinished ? "#86efac" : "transparent"}
                                stroke={darkMode ? "#333" : "#555"}
                                strokeWidth={1}
                                dash={isFinished ? [] : [5, 5]}
                              />
                              <Text
                                x={(part.x * SCALE) + 5}
                                y={(part.y * SCALE) + 5}
                                text={`P-${part.partId}\n${part.w}x${part.h}`}
                                fontSize={12 * (SCALE < 0.2 ? 0.5 : 1)}
                                fill="#333"
                              />
                            </Group>
                          );
                        })}

                        {/* CUT LINE */}
                        {currentInstruction.axis && (
                          <>
                            <Line
                              points={[
                                currentInstruction.axis === 'y' ? 0 : (currentInstruction.cutValue * SCALE),
                                currentInstruction.axis === 'y' ? (currentInstruction.cutValue * SCALE) : 0,
                                currentInstruction.axis === 'y' ? (sW * SCALE) : (currentInstruction.cutValue * SCALE),
                                currentInstruction.axis === 'y' ? (currentInstruction.cutValue * SCALE) : (sH * SCALE)
                              ]}
                              stroke="red"
                              strokeWidth={3}
                              dash={[10, 5]}
                            />
                          </>
                        )}
                      </Layer>
                    </Stage>
                  </div>
                </div>

                {/* Step Description Footer */}
                {result.steps && (
                  <div style={{ padding: '10px', backgroundColor: theme.panelBg, borderTop: `1px solid ${theme.panelBorder}`, textAlign: 'center', fontSize: '16px' }}>
                    {currentInstruction.description}
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* RIGHT PANEL: COLLAPSIBLE HISTORY */}
        <div style={styles.rightPanel}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={styles.sidebarToggleBtn}
            title={isSidebarOpen ? "Gizle" : "Göster"}
          >
            ⋮
          </button>

          {!isSidebarOpen ? (
            <div onClick={() => setIsSidebarOpen(true)} style={styles.verticalTextContainer}>
              <span style={styles.verticalText}>KAYDEDİLENLER</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h4 style={{ margin: '10px 0', textAlign: 'center' }}>Kaydedilenler</h4>
              <ul style={{ padding: 0, listStyle: 'none', flex: 1, overflowY: 'auto' }}>
                {history.map(h => (
                  <li
                    key={h.id}
                    style={styles.listItem}
                    onClick={() => loadHistoryItem(h.id)}
                  >
                    <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={h.summary}>
                      {h.summary}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, h.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', flexShrink: 0 }}
                      title="Sil"
                    >
                      <img src="/trash.png" alt="Sil" style={{ height: '18px', width: 'auto', opacity: 0.7 }} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;