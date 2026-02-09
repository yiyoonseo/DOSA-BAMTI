import React, { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Stage,
  useGLTF,
  GizmoHelper,
  GizmoViewport,
  Center,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";

import AiNote from "./ai/AiNote";
import PartDetail from "../part/PartDetail";
import PartList from "../part/PartList";
import AiBriefing from "./ai/AiBriefing";
import AnimationPlayer from "./AnimationPlayer";
import AnimationSlider from "./AnimationSlider";

import AiBriefingIcon from "../../assets/icons/icon-ai-breifing.svg";
import AiNotBriefingIcon from "../../assets/icons/icon-ai-notbreifing.svg";

import { mapModelData } from "../../utils/modelMapper";
import { fetchAiBriefing } from "../../api/aiAPI";
import { getChatsByModel } from "../../api/aiDB";

import LightOnIcon from "../../assets/icons/icon-light-on.svg";
import LightOffIcon from "../../assets/icons/icon-light-off.svg";

function SinglePartModel({
  modelPath,
  overrideMaterial,
  isLightOn,
  setIsLightOn,
}) {
  if (!modelPath) return null;

  try {
    const { scene } = useGLTF(modelPath);

    useEffect(() => {
      if (!overrideMaterial) return;
      scene.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          if (overrideMaterial.color)
            child.material.color.set(overrideMaterial.color);
          if (overrideMaterial.metalness !== undefined)
            child.material.metalness = overrideMaterial.metalness;
          if (overrideMaterial.roughness !== undefined)
            child.material.roughness = overrideMaterial.roughness;
          child.material.needsUpdate = true;
        }
      });
    }, [overrideMaterial, scene]);

    return (
      <Center>
        <primitive object={scene.clone()} />
      </Center>
    );
  } catch (error) {
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
  modelId,
  isLightOn,
  setIsLightOn,
}) => {
  const [transformedParts, setTransformedParts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showAssembly, setShowAssembly] = useState(true);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames] = useState(100);

  const [activeMaterial, setActiveMaterial] = useState(null);

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

  const [briefingData, setBriefingData] = useState(null);
  useEffect(() => {
    const loadBriefing = async () => {
      if (!modelId || briefingData) return;

      try {
        const modelChats = await getChatsByModel(String(modelId));
        if (!modelChats || modelChats.length === 0) return;

        const sortedChats = [...modelChats].sort(
          (a, b) => b.lastUpdated - a.lastUpdated,
        );

        const allMessages = sortedChats.reduce((acc, chat) => {
          return [...acc, ...(chat.messages || [])];
        }, []);

        const meaningfulMessages = allMessages.filter((msg) => {
          const content = msg.content || msg.text || "";
          const trimmed = content.trim();

          const isLongEnough = trimmed.length >= 5;

          const isNotGreeting =
            !/^(안녕|안녕하세요|반가워|ㅎㅇ|hi|hello|반갑다)/i.test(trimmed);

          return isLongEnough && isNotGreeting;
        });

        console.log(
          `📊 [모델 ${modelId}] 분석된 의미 있는 메시지: ${meaningfulMessages.length}개`,
        );

        if (meaningfulMessages.length >= 8) {
          const result = await fetchAiBriefing(meaningfulMessages.slice(-20));
          if (result && result.data) {
            setBriefingData(result.data);
          } else {
            setBriefingData(result);
          }
          setShowBriefing(true);
          console.log("✅ 조건 충족: AI 브리핑 생성 성공");
        }
      } catch (error) {
        console.error("❌ 브리핑 로드 실패:", error);
      }
    };

    loadBriefing();
  }, [modelId]);

  const currentPart = transformedParts.find((p) => p.id === selectedId);
  const assemblyPart = transformedParts.find((p) => p.isAssembly);

  const handleReset = () => setCurrentFrame(0);
  const handleFrameChange = (frame) => setCurrentFrame(frame);

  const handlePartSelect = (partId) => {
    setSelectedId(partId);
  };

  const handleMaterialSelect = (materialProps) => {
    setActiveMaterial(materialProps);
  };

  return (
    <div className="bg-white w-full h-full flex flex-row p-4 gap-1 relative overflow-hidden">
      {showAiNote && (
        <AiNote
          onClose={() => setShowAiNote(false)}
          onMaximize={onMaximize}
          messages={floatingMessages}
          setMessages={setFloatingMessages}
          modelId={modelId}
        />
      )}

      <div className="w-[110px] h-full flex flex-col shrink-0 z-20 pt-2">
        <PartList
          parts={transformedParts}
          selectedId={selectedId}
          onSelect={handlePartSelect}
        />
      </div>

      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex-[7.5] bg-white rounded-2xl relative overflow-hidden flex flex-col">
          {/* 💡 여기에 조명 버튼 배치 (좌표축 근처) */}
          <div className="absolute -top-4 right-2 z-50 flex flex-col gap-2">
            <button
              onClick={() => setIsLightOn(!isLightOn)}
              className="w-14 h-14 mt-1 flex items-center justify-center hover:bg-white transition-all"
              title={isLightOn ? "조명 끄기" : "조명 켜기"}
            >
              <img
                src={isLightOn ? LightOnIcon : LightOffIcon}
                alt="Light Toggle"
                className="w-15 h-15"
              />
            </button>
          </div>

          {showBriefing && (
            <AiBriefing
              className="absolute left-4 bottom-20 z-50"
              onClose={() => setShowBriefing(false)}
              data={briefingData}
            />
          )}

          <button
            onClick={() => setShowBriefing(!showBriefing)}
            className="absolute bottom-8 left-4 w-10 h-10 rounded-xl cursor-pointer  flex items-center justify-center transition-all z-50"
          >
            <img
              src={showBriefing ? AiBriefingIcon : AiNotBriefingIcon}
              alt="AI Briefing"
              className="w-8 h-8"
            />
          </button>

          <div className="flex-1 relative min-h-0">
            {assemblyPart?.model && showAssembly ? (
              <Canvas
                shadows={isLightOn}
                camera={{ position: [4, 0, 4], fov: 50 }}
              >
                <Suspense fallback={null}>
                  <Stage
                    environment="city"
                    /* 💡 조명이 꺼지면 강도를 0으로, 켜지면 0.6으로 설정 */
                    intensity={isLightOn ? 0.6 : 0}
                    /* 💡 shadows가 false면 그림자가 생성되지 않음 */
                    shadows={isLightOn ? "contact" : false}
                    contactShadow={false}
                    adjustCamera={true}
                  >
                    <Center>
                      <AnimationPlayer
                        url={assemblyPart.model}
                        currentFrame={currentFrame}
                        totalFrames={totalFrames}
                        selectedPartMesh={
                          currentPart?.isAssembly ? null : currentPart?.meshName
                        }
                        overrideMaterial={activeMaterial}
                      />
                    </Center>
                  </Stage>
                </Suspense>
                <OrbitControls
                  makeDefault
                  enablePan={true}
                  panSpeed={1}
                  screenSpacePanning={true}
                />
                <GizmoHelper alignment="top-right" margin={[80, 80]}>
                  <GizmoViewport
                    axisColors={["#68A2FF", "#84EBAD", "#FF9191"]}
                    labelColor="white"
                  />
                </GizmoHelper>
              </Canvas>
            ) : currentPart?.model ? (
              <Canvas
                shadows={isLightOn}
                camera={{ position: [4, 0, 4], fov: 50 }}
              >
                <Suspense fallback={null}>
                  <Stage
                    environment="city"
                    intensity={isLightOn ? 0.6 : 0}
                    shadows={isLightOn ? "contact" : false}
                    contactShadow={false}
                  >
                    <SinglePartModel
                      modelPath={currentPart.model}
                      overrideMaterial={activeMaterial}
                    />
                  </Stage>
                </Suspense>
                <OrbitControls
                  makeDefault
                  autoRotate
                  autoRotateSpeed={0.5}
                  enablePan={true}
                  panSpeed={1}
                  screenSpacePanning={true}
                />
                <GizmoHelper alignment="top-right" margin={[80, 80]}>
                  <GizmoViewport
                    axisColors={["#68A2FF", "#84EBAD", "#FF9191"]}
                    labelColor="white"
                  />
                </GizmoHelper>
              </Canvas>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                모델을 불러오는 중...
              </div>
            )}
          </div>

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

        <div className="flex-[2.5] min-h-[160px] pt-2">
          <PartDetail
            selectedPart={currentPart}
            onMaterialSelect={handleMaterialSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default LeftContainer;
