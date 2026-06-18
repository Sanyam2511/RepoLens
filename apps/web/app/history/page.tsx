"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, MoreVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2, Eye, Download } from "lucide-react";
import { AnalysisHistoryRecord } from "shared";
import { AUTH_CHANGED_EVENT, clearAuthSession, getStoredAuthUser, workerFetch } from "../../lib/auth";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useRouter } from "next/navigation";

// For PDF
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ArchitectureOverview from "../../components/ArchitectureOverview";
import ArchitectureDetail from "../../components/ArchitectureDetail";
import { ReactFlowProvider } from "@xyflow/react";

const getRepoName = (repoUrl: string) => {
  try {
    const parsed = new URL(repoUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[1]?.replace(/\.git$/i, "") || parts[0] || repoUrl;
  } catch {
    return repoUrl;
  }
};

type ToastMessage = {
  id: string;
  message: string;
  type: 'success' | 'error';
};

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [authUser, setAuthUser] = useState(getStoredAuthUser());

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [exportItem, setExportItem] = useState<AnalysisHistoryRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedToCompare, setSelectedToCompare] = useState<string[]>([]);
  const router = useRouter();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const syncAuth = () => setAuthUser(getStoredAuthUser());
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    if (!authUser) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const response = await workerFetch("/history");
      if (!response.ok) {
        if (response.status === 401) {
          clearAuthSession();
          setAuthUser(null);
          setHistory([]);
          return;
        }
        throw new Error(`History request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const items = Array.isArray(payload.history) ? (payload.history as AnalysisHistoryRecord[]) : [];
      setHistory(items);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load analysis history right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [authUser]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const visibleHistory = useMemo(() => {
    const text = query.trim().toLowerCase();

    return history.filter((item) => {
      const repoName = getRepoName(item.repoUrl).toLowerCase();
      return (
        text.length === 0 ||
        repoName.includes(text) ||
        item.repoUrl.toLowerCase().includes(text) ||
        item.commitSha?.toLowerCase().includes(text) === true
      );
    });
  }, [history, query]);

  const sortedHistory = useMemo(() => {
    return [...visibleHistory].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }, [visibleHistory]);

  const totalPages = Math.max(1, Math.ceil(sortedHistory.length / rowsPerPage));
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedHistory.slice(start, start + rowsPerPage);
  }, [sortedHistory, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      const res = await workerFetch(`/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        addToast("History record deleted.", "success");
      } else {
        addToast("Failed to delete history.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error deleting history.", "error");
    }
  };

  const handleExport = async (item: AnalysisHistoryRecord) => {
    setExportItem(item);
    setIsExporting(true);
    
    // Give react-flow a moment to render in the hidden container
    setTimeout(async () => {
      try {
        const element = document.getElementById("pdf-export-container");
        if (!element) return;
        
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${getRepoName(item.repoUrl)}-analysis.pdf`);
      } catch (err) {
        console.error("PDF generation failed", err);
        addToast("Failed to generate PDF. Make sure the graph is not too large.", "error");
      } finally {
        setExportItem(null);
        setIsExporting(false);
      }
    }, 1500);
  };

  const emptyState = !loading && visibleHistory.length === 0;
  const tableMessage = error || (authUser ? "No searches yet. Run an analysis to populate this table." : "Sign in to view your saved searches.");

  return (
    <div className="min-h-screen page-shell">
      <Header />

      <main className="px-4 py-8 max-w-[1200px] mx-auto w-full">
        <div className="border border-[var(--color-border-subtle)] rounded-xl bg-white overflow-visible shadow-sm relative">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] px-4 py-3 bg-white rounded-t-xl">
            <label className="flex items-center gap-2 border border-[var(--color-border-subtle)] rounded-md px-3 py-1.5 w-[260px] focus-within:border-[var(--color-accent)] transition-colors">
              <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search repo, commit..."
                className="w-full bg-transparent outline-none border-0 p-0 shadow-none focus:shadow-none text-sm text-[var(--color-text-primary)]"
              />
            </label>
            <div className="flex items-center gap-2">
              {isCompareMode && selectedToCompare.length === 2 && (
                <Link
                  href={`/analyze?compareA=${selectedToCompare[0]}&compareB=${selectedToCompare[1]}`}
                  className="px-3 py-1.5 rounded-md text-sm font-semibold transition bg-indigo-600 text-white hover:bg-indigo-700 mr-2"
                >
                  View Diff
                </Link>
              )}
              <button
                onClick={() => {
                  setIsCompareMode(!isCompareMode);
                  setSelectedToCompare([]);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${isCompareMode ? "bg-[var(--color-accent)] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {isCompareMode ? "Cancel Compare" : "Compare Scans"}
              </button>
            </div>
          </div>

          <div className="overflow-visible min-h-[400px]">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[minmax(220px,2fr)_120px_90px_90px_160px_60px] items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[#F8FAFC] px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-2">
                  {isCompareMode && <div className="w-4" />}
                  Repository
                </div>
                <div>Commit</div>
                <div>Nodes</div>
                <div>Edges</div>
                <div>Updated</div>
                <div className="text-right"></div>
              </div>

              {loading ? (
                <div className="flex min-h-[340px] items-center justify-center bg-white px-4 data-mono text-[var(--color-text-tertiary)]">
                  Loading history...
                </div>
              ) : emptyState ? (
                <div className="flex min-h-[340px] items-center justify-center bg-white px-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {authUser ? "No searches yet" : "Sign in to view saved searches"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{tableMessage}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {!authUser ? (
                        <Link href="/login" className="btn-primary text-sm">Login</Link>
                      ) : (
                        <Link href="/#analyze" className="btn-primary text-sm">Start analysis</Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-b-xl pb-[100px]">
                  {paginatedHistory.map((item) => {
                    const repoName = getRepoName(item.repoUrl);
                    const statusLabel = item.edgeCount > 0 ? "Connected" : "Needs review";

                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-[minmax(220px,2fr)_120px_90px_90px_160px_60px] items-center gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 transition relative ${isCompareMode && selectedToCompare.includes(item.id) ? "bg-[var(--color-accent-subtle)]" : "hover:bg-slate-50"}`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          {isCompareMode && (
                            <input
                              type="checkbox"
                              className="w-4 h-4 cursor-pointer"
                              checked={selectedToCompare.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedToCompare.length < 2) {
                                    setSelectedToCompare([...selectedToCompare, item.id]);
                                  } else {
                                    addToast("You can only compare 2 scans at a time.", "error");
                                  }
                                } else {
                                  setSelectedToCompare(selectedToCompare.filter(id => id !== item.id));
                                }
                              }}
                            />
                          )}
                          <div>
                            <div className="truncate font-semibold text-sm text-[var(--color-text-primary)]">{repoName}</div>
                            <div className="truncate text-xs text-[var(--color-text-tertiary)] mt-0.5">{item.repoUrl}</div>
                          </div>
                        </div>

                        <div className="truncate font-mono text-xs text-[var(--color-text-secondary)]">
                          {item.commitSha ? item.commitSha.slice(0, 7) : "—"}
                        </div>

                        <div className="text-sm font-medium text-[var(--color-text-primary)]">{item.nodeCount}</div>

                        <div className="text-sm font-medium text-[var(--color-text-primary)]">{item.edgeCount}</div>

                        <div className="text-sm text-[var(--color-text-secondary)]">
                           {new Date(item.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </div>

                        <div className="flex justify-end pr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              setDropdownOpen(dropdownOpen === item.id ? null : item.id);
                            }}
                            className="text-[var(--color-text-tertiary)] hover:text-[#232F72] transition p-1"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {dropdownOpen === item.id && (
                            <div 
                              className="absolute right-8 top-10 mt-2 w-56 bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-[var(--color-border-subtle)] z-[100] py-2 flex flex-col overflow-hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                              }}
                            >
                              <div className="px-4 py-2 text-sm font-bold text-[var(--color-text-primary)]">Actions</div>
                              
                              <Link 
                                href={`/analyze?repoUrl=${encodeURIComponent(item.repoUrl)}`}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-slate-50 transition"
                              >
                                <Eye className="h-4 w-4" /> View repo graph
                              </Link>
                              
                              <button 
                                onClick={() => { setDropdownOpen(null); handleExport(item); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-slate-50 transition w-full text-left"
                              >
                                <Download className="h-4 w-4" /> Export graph & summary
                              </button>
                              
                              <button 
                                onClick={() => { setDropdownOpen(null); setConfirmDeleteId(item.id); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#E11D48] hover:bg-[#FFF1F2] transition w-full text-left"
                              >
                                <Trash2 className="h-4 w-4" /> Delete history
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {!emptyState && !loading && (
            <div className="flex items-center justify-end px-4 py-3 text-sm text-[var(--color-text-secondary)] bg-white border-t border-[var(--color-border-subtle)] rounded-b-xl">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select 
                    value={rowsPerPage} 
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="border-0 rounded py-1 px-1 bg-transparent font-medium text-[var(--color-text-primary)] outline-none hover:bg-slate-50 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div>
                  Page {currentPage} of {totalPages}
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 rounded border border-[var(--color-border-subtle)] disabled:opacity-40 hover:bg-slate-50 transition"><ChevronsLeft className="h-4 w-4" /></button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded border border-[var(--color-border-subtle)] disabled:opacity-40 hover:bg-slate-50 transition"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded border border-[var(--color-border-subtle)] disabled:opacity-40 hover:bg-slate-50 transition"><ChevronRight className="h-4 w-4" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1 rounded border border-[var(--color-border-subtle)] disabled:opacity-40 hover:bg-slate-50 transition"><ChevronsRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Hidden PDF Renderer */}
      {exportItem && (
        <div style={{ position: "fixed", left: -9999, top: 0, width: 1200, height: 1800, background: "white", zIndex: -9999 }} id="pdf-export-container">
          <div className="p-8 pb-4 border-b border-[var(--color-border-subtle)]">
             <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{getRepoName(exportItem.repoUrl)}</h1>
             <p className="text-[var(--color-text-secondary)] mt-2">Repository Analysis Report</p>
          </div>
          <ReactFlowProvider>
            <div className="p-8 h-[700px]">
               <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">Architecture Overview</h2>
               <div className="h-[600px] w-full border border-[var(--color-border-subtle)] rounded-lg overflow-hidden bg-[var(--color-bg-surface)] relative">
                  <ArchitectureOverview graphData={exportItem.graphJson as any} />
               </div>
            </div>
          </ReactFlowProvider>
          <ReactFlowProvider>
            <div className="p-8 h-[700px]">
               <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">Detailed View</h2>
               <div className="h-[600px] w-full border border-[var(--color-border-subtle)] rounded-lg overflow-hidden bg-[var(--color-bg-surface)] relative">
                  <ArchitectureDetail graphData={exportItem.graphJson as any} />
               </div>
            </div>
          </ReactFlowProvider>
        </div>
      )}
      
      {/* Exporting Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/20 z-[9999] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
            <div className="h-8 w-8 rounded-full border-4 border-[#232F72] border-t-transparent animate-spin" />
            <div className="font-semibold text-[var(--color-text-primary)]">Generating PDF Report...</div>
            <div className="text-sm text-[var(--color-text-secondary)]">Please wait while the graphs are captured.</div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/30 z-[9999] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Delete Analysis History</h3>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
              Are you sure you want to permanently delete this repository analysis? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-slate-100 rounded-md transition"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#E11D48] hover:bg-[#BE123C] rounded-md transition shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`px-4 py-3 min-w-[280px] shadow-lg text-sm font-medium transition-all duration-300 ${
              toast.type === 'error' 
                ? 'bg-white border-l-4 border-[#E11D48] text-[#E11D48]' 
                : 'bg-white border-l-4 border-[var(--color-accent)] text-[var(--color-text-primary)]'
            }`}
            style={{ animation: 'slideIn 0.3s ease-out forwards' }}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {isCompareMode && selectedToCompare.length === 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-white border border-[var(--color-border-strong)] shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            2 scans selected
          </div>
          <button
            onClick={() => {
              const scan1 = history.find(h => h.id === selectedToCompare[0]);
              const scan2 = history.find(h => h.id === selectedToCompare[1]);
              if (scan1 && scan2 && scan1.repoUrl !== scan2.repoUrl) {
                addToast("You can only compare scans from the same repository.", "error");
                return;
              }
              router.push(`/analyze?compareA=${selectedToCompare[0]}&compareB=${selectedToCompare[1]}`);
            }}
            className="btn-primary text-sm px-6 py-2"
          >
            Compare Scans
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
