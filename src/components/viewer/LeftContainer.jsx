import React, { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import AiNote from "./ai/AiNote";
import PartDetail from "../part/PartDetail";
import PartList from "../part/PartList";
import AiBriefing from "./ai/AiBriefing";
import AnimationPlayer from "./AnimationPlayer";
import AnimationSlider from "./AnimationSlider";
import AiBriefingIcon from "../../assets/icons/icon-ai-breifing.svg";
import AiNotBriefingIcon from "../../assets/icons/icon-ai-notbreifing.svg";
import { mapModelData } from "../../utils/modelMapper";

function SinglePartModel({ modelPath }) {
  if (!modelPath) return null;

  try {
    const { scene } = useGLTF(modelPath);
    return <primitive object={scene.clone()} />;
  } catch (error) {
    console.error("❌ GLTFLoader error:", error);
    return null;
  }
}

const LeftContainer = ({
  apiData,
  showAiNote,
  setShowAiNote,
  onMaximize,
  floatingMessages,
  setFloatingMessages,
}) => {
  const [transformedParts, setTransformedParts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [showAssembly, setShowAssembly] = useState(true);

  // 👇 애니메이션 상태 - isPlaying 제거
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames] = useState(100);

  // async 데이터 변환
  useEffect(() => {
    const loadParts = async () => {
      const mapped = await mapModelData(apiData);
      setTransformedParts(mapped);

      if (mapped.length > 0 && !selectedId) {
        setSelectedId(mapped[0].id);
      }
    };

    if (apiData) {
      loadParts();
    }
  }, [apiData]);

  const currentPart = transformedParts.find((p) => p.id === selectedId);
  const assemblyPart = transformedParts.find((p) => p.isAssembly);

  // 👇 리셋만 남김
  const handleReset = () => {
    setCurrentFrame(0);
  };

  // 👇 슬라이더 변경
  const handleFrameChange = (frame) => {
    setCurrentFrame(frame);
  };

  const handlePartSelect = (partId) => {
    setSelectedId(partId);
    const part = transformedParts.find((p) => p.id === partId);

    if (part?.isAssembly) {
      setShowAssembly(true);
    } else {
      setShowAssembly(true);
    }
  };

  return (
    <div className="bg-white w-full h-full flex flex-row p-4 gap-1 relative overflow-hidden">
      {showAiNote && (
        <AiNote
          onClose={() => setShowAiNote(false)}
          onMaximize={onMaximize}
          messages={floatingMessages}
          setMessages={setFloatingMessages}
        />
      )}

      {/* 1. 부품 리스트 */}
      <div className="w-[110px] h-full flex flex-col shrink-0 z-20 pt-2">
        <PartList
          parts={transformedParts}
          selectedId={selectedId}
          onSelect={handlePartSelect}
        />
      </div>
      {/* 3. [오른쪽 섹션] 3D 뷰어와 상세 정보 (위아래로 배치) */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* 2. 3D 캔버스 영역 */}
        <div className="flex-[7.5] bg-white rounded-2xl relative overflow-hidden flex flex-col">
          {showBriefing && (
            <AiBriefing
              className="absolute left-4 bottom-20 z-50"
              onClose={() => setShowBriefing(false)}
            />
          )}

          {/* 👇 AI 브리핑 토글 버튼 수정 */}
          <button
            onClick={() => setShowBriefing(!showBriefing)}
            className="absolute bottom-8 left-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all z-50 hover:scale-105 active:scale-95"
            title="AI 브리핑 토글"
          >
            <img
              // 👇 showBriefing 상태에 따라 아이콘 파일 교체
              src={showBriefing ? AiBriefingIcon : AiNotBriefingIcon}
              alt="AI Briefing Icon"
              className="w-8 h-8"
            />
          </button>

          {/* 3D 캔버스 본체 */}
          <div className="flex-1 relative min-h-0">
            {assemblyPart?.model && showAssembly ? (
              <Canvas shadows camera={{ position: [4, 0, 4], fov: 50 }}>
                <Suspense fallback={null}>
                  <Stage
                    environment="city"
                    intensity={0.6}
                    contactShadow={false}
                  >
                    <AnimationPlayer
                      url={assemblyPart.model}
                      currentFrame={currentFrame}
                      totalFrames={totalFrames}
                      selectedPartMesh={
                        currentPart?.isAssembly ? null : currentPart?.meshName
                      }
                    />
                  </Stage>
                </Suspense>
                <OrbitControls makeDefault />
              </Canvas>
            ) : currentPart?.model ? (
              <Canvas shadows camera={{ position: [4, 0, 4], fov: 50 }}>
                <Suspense fallback={null}>
                  <Stage
                    environment="city"
                    intensity={0.6}
                    contactShadow={false}
                  >
                    <SinglePartModel modelPath={currentPart.model} />
                  </Stage>
                </Suspense>
                <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
              </Canvas>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                3D 모델을 불러올 수 없습니다.
              </div>
            )}
          </div>

          {/* 👇 여기가 핵심! 설명창 바로 위에 붙는 슬라이더 영역 */}
          {assemblyPart?.model && showAssembly && (
            <div className="w-full bg-white py-3 px-6 shrink-0">
              <AnimationSlider
                currentFrame={currentFrame}
                totalFrames={totalFrames}
                onFrameChange={handleFrameChange}
                onReset={handleReset}
                modelUrl={assemblyPart.model}
              />
            </div>
          )}
        </div>

        {/* 2-B. 하단: 부품 상세 정보 */}
        <div className="flex-[2.5] min-h-[160px] pt-2">
          <PartDetail selectedPart={currentPart} />
        </div>
      </div>
    </div>
  );
};

export default LeftContainer;
