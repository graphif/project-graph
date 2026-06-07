use aha::models::{paddleocr_vl::generate::PaddleOCRVLGenerateModel, GenerateModel};
use aha::params::chat::ChatCompletionParameters;
use regex::{Regex, RegexBuilder};
use std::path::Path;
use std::sync::{Mutex, OnceLock};

/// 全局缓存的 OCR 模型实例，首次调用时加载，之后复用
static OCR_MODEL: OnceLock<Mutex<Option<PaddleOCRVLGenerateModel>>> = OnceLock::new();

fn clean_ocr_output(input: &str) -> String {
    // 匹配 <|LOC_ 后跟数字再跟 |> 的模式
    let re = Regex::new(r"<\|LOC_\d+\|>").unwrap();
    re.replace_all(input, "").to_string()
}

fn process_latex(input: &str) -> String {
    // 开启 dot_matches_newline 标志，允许 . 匹配 \n
    let re = RegexBuilder::new(r"\\\((?s:.*?)\\\)")
        .dot_matches_new_line(true)
        .build()
        .unwrap();

    // 替换为包含换行的格式
    let result = re.replace_all(input, |caps: &regex::Captures| {
        let content = &caps[0];
        // 去掉首尾的 \( 和 \)
        let inner = &content[2..content.len() - 2];

        // 构造特定的多行格式
        format!("$$\n{}\n$$", inner.trim())
    });

    result.to_string()
}

fn with_model<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&mut PaddleOCRVLGenerateModel) -> Result<R, String>,
{
    let model_mutex = OCR_MODEL.get_or_init(|| Mutex::new(None));
    let mut guard = model_mutex.lock().map_err(|e| format!("Failed to lock model mutex: {}", e))?;

    if guard.is_none() {
        let save_dir = aha::utils::get_default_save_dir().ok_or_else(|| {
            "Failed to get default save directory: no directory available".to_string()
        })?;
        let model_path = format!("{}/PaddlePaddle/PaddleOCR-VL-1.6/", save_dir);
        let model = PaddleOCRVLGenerateModel::init(&model_path, None, None)
            .map_err(|e| format!("Failed to initialize model: {}", e))?;
        *guard = Some(model);
    }

    f(guard.as_mut().unwrap())
}

#[tauri::command]
pub fn get_aha_directory() -> Result<String, String> {
    aha::utils::get_default_save_dir().ok_or_else(|| "Failed to get aha directory".to_string())
}

#[tauri::command]
pub fn paddleocr_vl_1_6_model_exists() -> bool {
    let save_dir = match aha::utils::get_default_save_dir() {
        Some(d) => d,
        None => return false,
    };
    let model_path = format!("{}/PaddlePaddle/PaddleOCR-VL-1.6/", save_dir);
    Path::new(&model_path).exists()
}

#[tauri::command]
pub async fn paddleocr_vl_1_6_generate(image_path: String) -> Result<String, String> {
    let message = format!(
        r#"
          {{
              "model": "paddleocr_vl1.6",
              "messages": [
                  {{
                      "role": "user",
                      "content": [ 
                          {{
                              "type": "image",
                              "image_url": 
                              {{
                                  "url": "file://{}"
                              }}
                          }}
                      ]
                  }}
              ],
              "stream": false
          }}
        "#,
        image_path
    );

    // 解析 JSON
    let mes: ChatCompletionParameters = serde_json::from_str(&message)
        .map_err(|e| format!("Failed to parse JSON message: {}", e))?;

    // 在阻塞线程中执行模型推理（避免阻塞异步运行时）
    let res = tokio::task::spawn_blocking(move || {
        with_model(|model| {
            model
                .generate(mes)
                .map_err(|e| format!("Model generation failed: {}", e))
        })
    })
    .await
    .map_err(|e| format!("OCR task panicked: {}", e))??;

    // 安全提取文本
    let choice = res
        .choices
        .first()
        .ok_or_else(|| "Response contains no choices".to_string())?;
    let text = choice
        .message
        .text()
        .ok_or_else(|| "Choice message has no text content".to_string())?;

    let cleaned = clean_ocr_output(text);
    let final_res = process_latex(&cleaned);

    Ok(final_res)
}
