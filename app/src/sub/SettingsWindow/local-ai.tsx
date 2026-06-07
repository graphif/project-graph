import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export default function LocalAiTab() {
  const [ahaDir, setAhaDir] = useState<string>("查询中...");
  const [modelExists, setModelExists] = useState<boolean | null>(null);

  useEffect(() => {
    invoke<string>("get_aha_directory")
      .then(setAhaDir)
      .catch(() => setAhaDir("获取失败"));
    invoke<boolean>("paddleocr_vl_1_6_model_exists")
      .then(setModelExists)
      .catch(() => setModelExists(false));
  }, []);

  return (
    <div className="mx-auto my-8 flex w-2/3 flex-col gap-4 overflow-auto">
      <h2 className="text-xl font-semibold">本地 AI</h2>
      <div className="rounded-md border p-4">
        <div className="text-xs opacity-50">aha 目录</div>
        <div className="mt-1 font-mono text-sm break-all">{ahaDir}</div>
      </div>
      <div className="rounded-md border p-4">
        <div className="text-xs opacity-50">OCR 模型 (PaddleOCR-VL-1.6)</div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span
            className={`inline-block size-2 rounded-full ${
              modelExists === null ? "bg-yellow-400" : modelExists ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {modelExists === null ? "检测中..." : modelExists ? "模型已就绪" : "模型未安装"}
        </div>
      </div>
    </div>
  );
}
