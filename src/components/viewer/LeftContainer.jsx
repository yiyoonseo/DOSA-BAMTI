import React, { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import AiNote from './ai/AiNote';
import PartDetail from "../part/PartDetail";
import PartList from "../part/PartList";
import AiBriefing from "./ai/AiBriefing";
import AnimationDebugger from "../debug/AnimationDebugger"; // 👈 추가
import { mapModelData } from "../../utils/modelMapper";

function SinglePartModel({ modelPath }) {
  console.log('🔍 Loading model from:', modelPath);
  if (!modelPath) {
    console.warn('⚠️ modelPath is null or undefined');
    return null;
  }
  
  try {
    const { scene } = useGLTF(modelPath);
    return <primitive object={scene.clone()} />;
  } catch (error) {
    console.error('❌ GLTFLoader error:', error);
    return null;
  }
}

const LeftContainer = ({ 
  apiData,
  showAiNote, 
  setShowAiNote, 
  onMaximize, 
  floatingMessages, 
  setFloatingMessages 
}) => {
  const [transformedParts, setTransformedParts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showBriefing, setShowBriefing] = useState(true);

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

  return (
    <div className="bg-white rounded-lg w-full h-full flex flex-col p-6 relative">
      {showAiNote && (
        <AiNote 
          onClose={() => setShowAiNote(false)} 
          onMaximize={onMaximize}
          messages={floatingMessages}       
          setMessages={setFloatingMessages} 
        />
      )}
      
      <div className="flex flex-1 gap-6 min-h-0">
        {/* 1. 부품 리스트 */}
        <div className="h-full overflow-y-auto custom-scrollbar shrink-0 p-1">
          <PartList
            parts={transformedParts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* 2. 3D 캔버스 영역 */}
        <div className="flex-1 bg-white rounded-2xl relative overflow-hidden">
          {showBriefing && (
            <AiBriefing 
              className="absolute left-28 z-50" 
              onClose={() => setShowBriefing(false)} 
            />
          )}

          {currentPart?.model ? (
            <Canvas shadows camera={{ position: [4, 0, 4], fov: 50 }}>
              <Suspense fallback={null}>
                <Stage environment="city" intensity={0.6} contactShadow={false}>
                  {/* 👇 완성본이면 디버거, 아니면 일반 모델 */}
                  {currentPart.isAssembly ? (
                    <AnimationDebugger url={currentPart.model} />
                  ) : (
                    <SinglePartModel modelPath={currentPart.model} />
                  )}
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
      </div>

      <PartDetail selectedPart={currentPart} />
    </div>
  );
};

export default LeftContainer;