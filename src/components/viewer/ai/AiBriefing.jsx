import React from "react";
import { X } from "lucide-react";

const AiBriefing = ({ onClose, className = "", data }) => {
  console.log("AiBriefing에 들어온 데이터:", data);
  // 데이터가 없거나 형식이 맞지 않을 때 방어 코드
  let parsedData = null;
  try {
    if (typeof data?.summary === "string") {
      parsedData = JSON.parse(data.summary);
    } else {
      parsedData = data?.summary;
    }
  } catch (e) {
    console.error("JSON 파싱 에러:", e);
  }

  // 2. 파싱된 데이터가 없거나 items가 없으면 방어 처리
  if (!parsedData || !parsedData.items) {
    console.log("파싱된 데이터에 items가 없습니다.", parsedData);
    return null;
  }

  return (
    <div
      className={`w-[320px] backdrop-blur-md rounded-2xl shadow-xl border border-ai-gradient p-5 animate-in fade-in zoom-in duration-300 ${className}`}
      style={{ backgroundColor: "rgba(237, 242, 246, 0.85)" }}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-gray-800 text-sm tracking-tight">
            지난 학습 AI 브리핑
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-full"
        >
          <X size={18} />
        </button>
      </div>

      {/* 날짜 (오늘 날짜 반영) */}
      <p className="text-[11px] text-gray-400 font-medium mb-4 ml-1">
        {new Date().toLocaleDateString()} 학습 기준
      </p>

      {/* 본문 영역 */}
      <div className="text-xs text-gray-600 space-y-4 leading-relaxed max-h-[300px] overflow-y-auto thin-scrollbar pr-2">
        {/* 상단 타이틀 요약 */}
        <p className="font-medium text-gray-700 leading-normal">
          {parsedData.title}
        </p>

        {/* 세부 항목 리스트 */}
        <ul className="space-y-4">
          {parsedData.items.map((item, index) => (
            <li key={index} className="flex gap-2 items-start">
              <span className="text-blue-500 mt-1 shrink-0">•</span>
              <span className="flex flex-col gap-0.5">
                {/* 부품명 강조 */}
                <span className="font-bold text-gray-800">{item.name}:</span>
                {/* 부품 설명 */}
                <span className="text-gray-600">{item.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AiBriefing;
