import React, { useRef, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function AnimationPlayer({
  url,
  currentFrame,
  totalFrames,
  selectedPartMesh,
  overrideMaterial,
}) {
  const gltf = useGLTF(url);
  const mixerRef = useRef(null);
  const actionsRef = useRef([]);
  const trueOriginalsRef = useRef(new Map()); // 모델의 순수 원본 재질 보관함
  const [availableMeshes, setAvailableMeshes] = useState([]);

  // 1. 초기 로드: 원본 재질을 영구 보관하고 각 메쉬를 독립화합니다.
  useEffect(() => {
    if (!gltf.scene) return;

    const meshNames = [];
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        meshNames.push(child.name);

        // 처음 로드될 때 딱 한 번만 진짜 원본 재질(백지 상태)을 저장합니다.
        if (!trueOriginalsRef.current.has(child)) {
          trueOriginalsRef.current.set(child, child.material.clone());
        }

        // 각 메쉬의 재질을 독립적으로 클론하여 다른 부품에 영향이 없도록 합니다.
        child.material = child.material.clone();
      }
    });
    setAvailableMeshes(meshNames);

    // 애니메이션 설정
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(gltf.scene);
      mixerRef.current = mixer;
      actionsRef.current = gltf.animations.map((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
        action.paused = true;
        return action;
      });
    }

    return () => {
      if (mixerRef.current) mixerRef.current.stopAllAction();
    };
  }, [gltf]);

  // 2. 통합 로직: 하얀색(원본) -> 파란색(선택) -> 재질(적용) 흐름 제어
  // ⚪ 단계 1: 아무런 질감 없는 '완전 회색' 적용 (백지 상태)
  const applyDefaultGrey = (mat) => {
    mat.color.set("#bbbbbb"); // 부드러운 중간 회색
    mat.emissive.set("#000000");
    mat.emissiveIntensity = 0;
    mat.metalness = 0; // 금속 광택 제거
    mat.roughness = 0.8; // 매끄러운 무광 질감
    mat.map = null; // API/모델에 심긴 텍스처 맵 제거
    mat.normalMap = null;
  };

  // 🔵 단계 2: 파란색 강조 (선택됨)
  const applyBlueHighlight = (mat) => {
    mat.color.set("#aaddff");
    mat.emissive.set("#4ba3ff");
    mat.emissiveIntensity = 0.8;
    mat.metalness = 0.5;
    mat.roughness = 0.2;
  };

  // 🎨 단계 3: 선택한 재질 적용
  const applyPropsToMaterial = (mat, props) => {
    if (props.color) mat.color.set(props.color);
    if (props.metalness !== undefined) mat.metalness = props.metalness;
    if (props.roughness !== undefined) mat.roughness = props.roughness;
    mat.emissive.set("#000000");
    mat.emissiveIntensity = 0;
  };

  // --- 메인 로직 ---
  useEffect(() => {
    if (!gltf.scene) return;

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        const isTarget = selectedPartMesh
          ? isNameMatch(child.name, selectedPartMesh)
          : false;
        const originalMat = trueOriginalsRef.current.get(child);

        if (selectedPartMesh) {
          if (isTarget) {
            // 💡 재질 데이터가 있으면 재질 적용, 없으면(기본재질 선택 시) 파란색으로!
            if (overrideMaterial) {
              applyPropsToMaterial(child.material, overrideMaterial);
            } else {
              applyBlueHighlight(child.material);
            }
          } else {
            // 선택되지 않은 부품은 무조건 '완전 회색'
            applyDefaultGrey(child.material);
          }
        } else {
          // 전체 모델 모드
          if (overrideMaterial) {
            applyPropsToMaterial(child.material, overrideMaterial);
          } else {
            applyDefaultGrey(child.material);
          }
        }
        child.material.needsUpdate = true;
      }
    });
  }, [selectedPartMesh, overrideMaterial, gltf.scene]);

  // 3. 애니메이션 프레임 제어 (기존 유지)
  useEffect(() => {
    if (!mixerRef.current || actionsRef.current.length === 0) return;

    const normalizedTime = Math.max(0, Math.min(1, currentFrame / totalFrames));
    actionsRef.current.forEach((action) => {
      const clip = action.getClip();
      action.time = normalizedTime * clip.duration;
      action.paused = true;
    });
    mixerRef.current.update(0);
  }, [currentFrame, totalFrames]);

  // --- 헬퍼 함수 정의 ---

  // 파란색 강조 적용
  // const applyBlueHighlight = (mat) => {
  //   mat.color.set(0xaaddff);
  //   mat.emissive.set(0x4ba3ff);
  //   mat.emissiveIntensity = 0.8;
  //   mat.metalness = 0.5;
  //   mat.roughness = 0.2;
  // };

  // // 재질 속성 적용 및 강조 광택 제거
  // const applyPropsToMaterial = (mat, props) => {
  //   if (props.color) mat.color.set(props.color);
  //   if (props.metalness !== undefined) mat.metalness = props.metalness;
  //   if (props.roughness !== undefined) mat.roughness = props.roughness;

  //   // 재질이 적용되면 파란색 발광(emissive) 효과를 끕니다.
  //   mat.emissive.set(0x000000);
  //   mat.emissiveIntensity = 0;
  // };

  // 이름 매칭 로직
  const isNameMatch = (meshName, searchName) => {
    if (!meshName || !searchName) return false;
    const clean = (s) =>
      s
        .toLowerCase()
        .replace(/[-_\s.]/g, "")
        .replace(/\d+$/, "");
    return clean(meshName) === clean(searchName);
  };

  // 4. 모델 렌더링
  return <primitive object={gltf.scene} />;
}

export default AnimationPlayer;
