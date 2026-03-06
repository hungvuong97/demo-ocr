import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API_BASE = "/api";

type PageBlock = { page: number; content: string };

type StreamState = {
    page: number;
    total: number;
    pages: PageBlock[];
    done: boolean;
    error: string | null;
    finalMarkdown: string | null;
};

export default function OcrPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<StreamState | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(1);
    const [viewerFormat, setViewerFormat] = useState<"markdown" | "html">("markdown");
    const [viewerContent, setViewerContent] = useState("");
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const streamSessionRef = useRef(0);
    const ocrStartRef = useRef<number | null>(null);

    const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        setFile(f ?? null);
        setError(null);
        setStream(null);
        setCurrentPageIndex(1);
        setViewerFormat("markdown");
        setViewerContent("");
        setElapsedMs(null);
    }, []);

    const submit = useCallback(async () => {
        if (!file) {
            setError("Vui lòng chọn file ảnh hoặc PDF.");
            return;
        }
        abortRef.current = new AbortController();
        streamSessionRef.current += 1;
        const session = streamSessionRef.current;
        ocrStartRef.current = performance.now();
        setElapsedMs(null);
        setLoading(true);
        setError(null);
        setStream(null);
        setCurrentPageIndex(1);
        setViewerFormat("markdown");
        setViewerContent("");
        setStream({
            page: 0,
            total: 1,
            pages: [],
            done: false,
            error: null,
            finalMarkdown: null,
        });
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(`${API_BASE}/ocr`, {
                method: "POST",
                body: form,
                signal: abortRef.current.signal,
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || res.statusText);
            }
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No response body");
            let buffer = "";
            const pagesAcc: PageBlock[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.error) {
                            setStream((s) => {
                                if (!s || streamSessionRef.current !== session) return s;
                                return { ...s, error: data.error, done: true };
                            });
                            setError(data.error);
                            break;
                        }
                        if (data.page != null && data.total != null) {
                            const block: PageBlock = { page: data.page, content: data.content || "" };
                            const nextPages = [...pagesAcc];
                            const idx = nextPages.findIndex((p) => p.page === data.page);
                            if (idx >= 0) nextPages[idx] = block;
                            else nextPages.push(block);
                            pagesAcc.length = 0;
                            pagesAcc.push(...nextPages);
                            setStream((s) => {
                                if (!s || streamSessionRef.current !== session) return s;
                                return {
                                    ...s,
                                    page: data.page,
                                    total: data.total,
                                    pages: [...nextPages],
                                    finalMarkdown: null,
                                };
                            });
                        }
                        if (data.done === true) {
                            setStream((s) => {
                                if (!s || streamSessionRef.current !== session) return s;
                                return { ...s, done: true, finalMarkdown: data.markdown ?? null };
                            });
                        }
                    } catch (_) {
                        /* skip malformed line */
                    }
                }
            }
            if (buffer.trim()) {
                try {
                    const data = JSON.parse(buffer);
                    if (data.done === true) {
                        setStream((s) => {
                            if (!s || streamSessionRef.current !== session) return s;
                            return { ...s, done: true, finalMarkdown: data.markdown ?? null };
                        });
                    }
                } catch (_) { }
            }
        } catch (err) {
            if ((err as Error).name === "AbortError") return;
            setError(err instanceof Error ? err.message : "Lỗi khi gọi API OCR.");
            setStream((s) => {
                if (!s || streamSessionRef.current !== session) return s;
                return { ...s, done: true, error: String(err) };
            });
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    }, [file]);

    const handleStop = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    }, []);

    const updateViewerForCurrentPage = useCallback(
        (format: "html" | "markdown") => {
            if (!stream) return;
            const totalPages = stream.pages.length;
            if (!totalPages) return;
            const idx = Math.min(totalPages - 1, Math.max(0, currentPageIndex - 1));
            const pageMd = stream.pages[idx]?.content || "";
            if (!pageMd.trim()) {
                setViewerContent("");
                return;
            }
            (async () => {
                try {
                    const res = await fetch(`${API_BASE}/export`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ format, markdown: pageMd }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const text = await res.text();
                    setViewerContent(text);
                } catch (e) {
                    setError(e instanceof Error ? e.message : "Lỗi xem nội dung");
                }
            })();
        },
        [stream, currentPageIndex]
    );

    const handleView = useCallback(
        (format: "html" | "markdown") => {
            setViewerFormat(format);
            setViewerContent("");
            updateViewerForCurrentPage(format);
        },
        [updateViewerForCurrentPage]
    );

    const handleDownloadDoc = useCallback(() => {
        const md =
            stream?.pages.map((p) => p.content).join("\n\n") ??
            stream?.finalMarkdown ??
            "";
        if (!md) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/export`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ format: "doc", markdown: md }),
                });
                if (!res.ok) throw new Error(await res.text());
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "document.docx";
                a.click();
                URL.revokeObjectURL(url);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Lỗi tải DOC");
            }
        })();
    }, [stream]);

    useEffect(() => {
        if (viewerFormat && stream?.pages?.length) {
            updateViewerForCurrentPage(viewerFormat);
        }
    }, [currentPageIndex, viewerFormat, stream?.pages?.length, updateViewerForCurrentPage]);

    useEffect(() => {
        if (stream?.done && ocrStartRef.current != null && elapsedMs == null) {
            setElapsedMs(performance.now() - ocrStartRef.current);
        }
    }, [stream?.done, elapsedMs]);

    const hasContent = stream && (stream.pages.length > 0 || stream.finalMarkdown);
    const showResult = stream && (stream.done || stream.pages.length > 0);
    const totalPages = stream?.pages.length ?? 0;
    const canPrev = totalPages > 1 && currentPageIndex > 1;
    const canNext = totalPages > 1 && currentPageIndex < totalPages;

    return (
        <div className="app">
            <header className="header">
                <div className="header-inner">
                    <Link to="/" className="back-link">← Về trang chủ</Link>
                    <h1 className="logo">OCR</h1>
                    <p className="tagline">Ảnh hoặc PDF → Markdown, HTML, DOC</p>
                </div>
            </header>

            <main className="main">
                <section className="card upload-card">
                    <h2 className="card-title">Tài liệu cần nhận dạng</h2>
                    <div className="upload-zone">
                        <label className="upload-label">
                            <input
                                type="file"
                                accept="image/*,.pdf,application/pdf"
                                onChange={onFileChange}
                                className="file-input"
                            />
                            <span className="upload-text">
                                {file ? file.name : "Chọn file ảnh hoặc PDF"}
                            </span>
                        </label>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={submit}
                            disabled={loading || !file}
                        >
                            {loading ? "Đang xử lý…" : "Chạy OCR"}
                        </button>
                        {loading && (
                            <button
                                type="button"
                                className="btn btn-outline btn-danger"
                                onClick={handleStop}
                            >
                                Dừng
                            </button>
                        )}
                    </div>
                </section>

                {error && (
                    <div className="alert alert-error" role="alert">
                        {error}
                    </div>
                )}

                {loading && stream && (
                    <div className="card progress-card">
                        <div className="progress-info">
                            <span className="progress-label">
                                Trang {stream.page} / {stream.total}
                            </span>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${stream.total ? (stream.page / stream.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {showResult && (
                    <section className="card result-card">
                        <div className="result-header">
                            <h2 className="card-title">Kết quả</h2>
                            <div className="result-actions">
                                {elapsedMs != null && (
                                    <span className="elapsed-label">
                                        Thời gian OCR: {(elapsedMs / 1000).toFixed(1)} giây
                                    </span>
                                )}
                                <div className="export-buttons">
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => handleView("markdown")}
                                        disabled={!hasContent}
                                    >
                                        Xem Markdown
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => handleView("html")}
                                        disabled={!hasContent}
                                    >
                                        Xem HTML
                                    </button>
                                    {stream?.done && hasContent && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={handleDownloadDoc}
                                        >
                                            Tải DOC
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="result-content result-content-single">
                            {stream.pages.length === 0 && !stream.done && (
                                <p className="result-placeholder">Đang tải…</p>
                            )}
                            {totalPages > 0 && (
                                <>
                                    <div className="pager">
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-pager"
                                            onClick={() => setCurrentPageIndex((i) => Math.max(1, i - 1))}
                                            disabled={!canPrev}
                                        >
                                            ← Trang trước
                                        </button>
                                        <span className="pager-label">
                                            Trang {currentPageIndex} / {totalPages}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-pager"
                                            onClick={() =>
                                                setCurrentPageIndex((i) => Math.min(totalPages, i + 1))
                                            }
                                            disabled={!canNext}
                                        >
                                            Trang sau →
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        {viewerFormat && (
                            <section className="viewer-block">
                                <h3 className="viewer-title">
                                    {viewerFormat === "markdown" ? "Toàn bộ Markdown" : "Toàn bộ HTML"}
                                </h3>
                                {viewerFormat === "markdown" ? (
                                    <pre className="markdown-raw viewer-raw">
                                        {viewerContent || "—"}
                                    </pre>
                                ) : (
                                    <div
                                        className="viewer-html"
                                        dangerouslySetInnerHTML={{ __html: viewerContent || "" }}
                                    />
                                )}
                            </section>
                        )}
                    </section>
                )}
            </main>

            <footer className="footer">
                Kết nối API OCR (vLLM / olmOCR). Cấu hình qua <code>OCR_API_BASE</code>.
            </footer>
        </div>
    );
}
