import { Link } from "react-router-dom";
import "./WelcomePage.css";

// ── URL hệ thống LLM – cập nhật khi có URL thực ──
const LLM_URL: string | null = null; // Đặt URL tại đây, ví dụ: "http://192.168.1.100:8000"

export default function WelcomePage() {
    return (
        <div className="welcome-page">
            <div className="welcome-content">
                {/* Logo */}
                <div className="welcome-logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>

                {/* Heading */}
                <h1 className="welcome-title">
                    Hệ thống <span className="accent">AI Platform</span>
                </h1>
                <p className="welcome-subtitle">
                    Nền tảng trí tuệ nhân tạo tích hợp — nhận dạng tài liệu và trợ lý ngôn ngữ lớn, triển khai nội bộ.
                </p>

                {/* Cards */}
                <div className="welcome-cards">
                    {/* OCR Card */}
                    <Link to="/ocr" className="welcome-card welcome-card--ocr">
                        <div className="welcome-card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M7 7h4" />
                                <path d="M7 12h10" />
                                <path d="M7 17h6" />
                            </svg>
                        </div>
                        <h2 className="welcome-card-title">Nhận dạng tài liệu (OCR)</h2>
                        <p className="welcome-card-desc">
                            Chuyển đổi ảnh và PDF thành văn bản Markdown, HTML hoặc DOCX với mô hình AI chuyên dụng.
                        </p>
                        <span className="welcome-card-arrow">
                            Truy cập
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="M12 5l7 7-7 7" />
                            </svg>
                        </span>
                    </Link>

                    {/* LLM Card */}
                    {LLM_URL ? (
                        <a href={LLM_URL} className="welcome-card welcome-card--llm" target="_blank" rel="noopener noreferrer">
                            <div className="welcome-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                            </div>
                            <h2 className="welcome-card-title">Trợ lý LLM</h2>
                            <p className="welcome-card-desc">
                                Hệ thống hỏi đáp và xử lý ngôn ngữ tự nhiên, hỗ trợ phân tích và tổng hợp thông tin.
                            </p>
                            <span className="welcome-card-arrow">
                                Truy cập
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="M12 5l7 7-7 7" />
                                </svg>
                            </span>
                        </a>
                    ) : (
                        <div className="welcome-card welcome-card--llm" style={{ cursor: "default" }}>
                            <div className="welcome-card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                            </div>
                            <h2 className="welcome-card-title">Trợ lý LLM</h2>
                            <span className="welcome-badge">Sắp ra mắt</span>
                            <p className="welcome-card-desc">
                                Hệ thống hỏi đáp và xử lý ngôn ngữ tự nhiên, hỗ trợ phân tích và tổng hợp thông tin.
                            </p>
                            <span className="welcome-card-arrow" style={{ opacity: 0.5 }}>
                                Đang triển khai
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="M12 5l7 7-7 7" />
                                </svg>
                            </span>
                        </div>
                    )}
                </div>

                <p className="welcome-footer">
                    Triển khai nội bộ — Không kết nối internet
                </p>
            </div>
        </div>
    );
}
