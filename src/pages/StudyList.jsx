import SideBar from "../components/studyList/SideBar";
import StudyCard from "../components/studyList/StudyCard";
import StudySection from "../components/studyList/StudySection";
import { ArrowRight } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { getModels } from "../api/modelAPI";

const StudyList = () => {
  const [allModels, setAllModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("홈");

  useEffect(() => {
    const loadAllData = async () => {
      const data = await getModels();
      setAllModels(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    loadAllData();
  }, []);

  // 🔖 북마크 데이터 로드 (localStorage)
  const bookmarkedIds = useMemo(() => {
    const saved = localStorage.getItem("bookmarked_models");
    return saved ? JSON.parse(saved) : [];
  }, [activeMenu]); // 메뉴 바뀔 때마다 다시 확인

  if (loading) return <div className="ml-[275px] p-10">로딩 중...</div>;

  // const inProgressModels = allModels.filter((m) => m.status === "IN_PROGRESS");
  const categories = [...new Set(allModels.map((item) => item.type))].filter(
    Boolean,
  );

  return (
    <div className="flex flex-row">
      <SideBar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <div className="ml-[275px] px-[60px] py-[46px] w-full bg-gray-50">
        <div className="mt-[46px] t-24-semi">{activeMenu}</div>
        <div className="mt-[40px] flex flex-col gap-[80px]">
          {/* 1. 홈: 기존 섹션별 노출 */}
          {activeMenu === "홈" && (
            <>
              {categories.map((catName) => (
                <StudySection
                  key={catName}
                  category={catName}
                  models={allModels.filter((m) => m.type === catName)}
                  filterType={activeMenu}
                />
              ))}
            </>
          )}

          {/* 2. 진행 중인 학습: StudySection 하나만 띄우고 내부 필터링 위임 */}
          {activeMenu === "진행 중인 학습" && (
            <StudySection
              category="진행 중인 학습"
              models={allModels} // 전체를 주면 StudySection 내부에서 DB 대조 후 필터링
              filterType="진행 중인 학습"
            />
          )}

          {/* 3. 북마크: 로컬스토리지 기반 필터링 */}
          {activeMenu === "북마크" && (
            <StudySection
              category="북마크된 학습"
              models={allModels.filter((m) =>
                bookmarkedIds.includes(m.objectId),
              )}
              filterType="북마크"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyList;
