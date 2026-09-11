"use client";

import { useEffect, useState } from "react";

// iOS Safari는 주소창이 나타났다 사라졌다 하면서 "레이아웃 뷰포트"와 "화면에 실제 보이는
// 영역(visualViewport)"이 어긋나는 순간이 있어서, dvh 단위만으로는 하단 고정 요소가
// 가끔 주소창 뒤에 가려짐. visualViewport를 직접 추적해서 그 차이만큼 bottom에 더해줌
export function useViewportBottomInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      const diff = window.innerHeight - (vv!.height + vv!.offsetTop);
      setInset(Math.max(0, Math.round(diff)));
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
