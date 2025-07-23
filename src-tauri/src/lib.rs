use std::collections::HashMap;
use serde_json::Value;
use tauri::State;
use tokio::sync::Mutex;

mod gemini_service;
use gemini_service::{GeminiService, TutorFeedback};

// 全局狀態管理
struct AppState {
    gemini_service: Mutex<Option<GeminiService>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn initialize_gemini_service(
    api_key: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let service = GeminiService::new(api_key);
    let mut gemini_service = state.gemini_service.lock().await;
    *gemini_service = Some(service);
    Ok("Gemini service initialized successfully".to_string())
}

#[tauri::command]
async fn test_gemini_connection(
    api_key: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // 創建臨時服務進行測試
    let test_service = GeminiService::new(api_key.clone());
    
    // 測試簡單的內容生成
    match test_service.generate_practice_content(
        "daily",
        "beginner", 
        &vec!["測試".to_string()]
    ).await {
        Ok(content) => {
            // 測試成功，初始化服務
            let mut gemini_service = state.gemini_service.lock().await;
            *gemini_service = Some(test_service);
            Ok(format!("連接測試成功！生成的測試內容：{}", content.chars().take(50).collect::<String>()))
        },
        Err(e) => {
            Err(format!("連接測試失敗：{}", e))
        }
    }
}

#[tauri::command]
async fn get_ai_tutor_feedback(
    user_performance: HashMap<String, Value>,
    practice_context: String,
    state: State<'_, AppState>,
) -> Result<TutorFeedback, String> {
    let gemini_service = state.gemini_service.lock().await;
    
    if let Some(service) = gemini_service.as_ref() {
        match service.generate_tutor_feedback(&user_performance, &practice_context).await {
            Ok(feedback) => Ok(feedback),
            Err(e) => {
                eprintln!("Gemini API error: {}", e);
                // 提供備用反饋
                Ok(create_fallback_feedback(&user_performance))
            }
        }
    } else {
        Err("Gemini service not initialized. Please set up your API key first.".to_string())
    }
}

#[tauri::command]
async fn generate_practice_content(
    topic: String,
    difficulty_level: String,
    user_interests: Vec<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let gemini_service = state.gemini_service.lock().await;
    
    if let Some(service) = gemini_service.as_ref() {
        match service.generate_practice_content(&topic, &difficulty_level, &user_interests).await {
            Ok(content) => Ok(content),
            Err(e) => {
                eprintln!("Gemini API error: {}", e);
                // 提供備用內容
                Ok(create_fallback_content(&topic, &difficulty_level))
            }
        }
    } else {
        Err("Gemini service not initialized. Please set up your API key first.".to_string())
    }
}

#[tauri::command]
async fn gemini_text_to_speech(
    text: String,
    voice_config: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let gemini_service = state.gemini_service.lock().await;
    
    if let Some(service) = gemini_service.as_ref() {
        match service.generate_speech_audio(&text, voice_config.as_deref()).await {
            Ok(audio_data) => Ok(audio_data),
            Err(e) => {
                eprintln!("Gemini TTS error: {}", e);
                Err(format!("Gemini語音合成失敗: {}", e))
            }
        }
    } else {
        Err("Gemini service not initialized. Please set up your API key first.".to_string())
    }
}

// 模擬語音識別（實際項目中應該集成真實的ASR服務）
#[tauri::command]
async fn speech_to_text(audio_data: String) -> Result<String, String> {
    // 這裡應該集成實際的語音識別服務
    // 目前返回模擬結果
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    Ok("This is a simulated speech recognition result.".to_string())
}

// 模擬語音合成（實際項目中應該集成真實的TTS服務）
#[tauri::command]
async fn text_to_speech(text: String) -> Result<String, String> {
    // 這裡應該集成實際的語音合成服務
    // 目前返回模擬結果
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    Ok(format!("Generated audio for: {}", text))
}

// 模擬發音評分（實際項目中應該集成真實的發音評估服務）
#[tauri::command]
async fn pronunciation_score(
    audio_data: String,
    reference_text: String,
) -> Result<HashMap<String, f64>, String> {
    // 這裡應該集成實際的發音評分服務
    tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
    
    let mut scores = HashMap::new();
    scores.insert("overall".to_string(), 75.0 + rand::random::<f64>() * 20.0);
    scores.insert("pronunciation".to_string(), 70.0 + rand::random::<f64>() * 25.0);
    scores.insert("fluency".to_string(), 65.0 + rand::random::<f64>() * 30.0);
    scores.insert("completeness".to_string(), 80.0 + rand::random::<f64>() * 15.0);
    
    Ok(scores)
}

#[tauri::command]
async fn start_recording() -> Result<String, String> {
    Ok("Recording started".to_string())
}

#[tauri::command]
async fn stop_recording() -> Result<String, String> {
    Ok("Recording stopped".to_string())
}

#[tauri::command]
async fn save_practice_record(
    topic: String,
    scores: HashMap<String, f64>,
    feedback: String,
) -> Result<String, String> {
    // 這裡應該保存到數據庫
    println!("Saving practice record: topic={}, scores={:?}", topic, scores);
    Ok("Practice record saved successfully".to_string())
}

#[tauri::command]
async fn get_learning_stats() -> Result<HashMap<String, Value>, String> {
    // 這裡應該從數據庫獲取學習統計
    let mut stats = HashMap::new();
    stats.insert("total_sessions".to_string(), Value::Number(serde_json::Number::from(42)));
    stats.insert("average_score".to_string(), Value::Number(serde_json::Number::from_f64(78.5).unwrap()));
    stats.insert("improvement_rate".to_string(), Value::Number(serde_json::Number::from_f64(12.3).unwrap()));
    
    Ok(stats)
}

// 備用反饋生成函數
fn create_fallback_feedback(user_performance: &HashMap<String, Value>) -> TutorFeedback {
    let overall_score = user_performance
        .get("overall")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    
    let (encouragement, motivation_level) = if overall_score >= 80.0 {
        ("太棒了！您的發音非常標準，繼續保持這種優秀的表現！".to_string(), "high".to_string())
    } else if overall_score >= 60.0 {
        ("很好的進步！您正在穩步提升，繼續努力！".to_string(), "medium".to_string())
    } else {
        ("每一次練習都是進步，不要氣餒，您一定會越來越好！".to_string(), "high".to_string())
    };
    
    TutorFeedback {
        encouragement,
        specific_feedback: "您的努力很值得讚賞，在發音準確度方面有不錯的表現。".to_string(),
        improvement_tips: vec![
            "每天堅持練習15-20分鐘".to_string(),
            "注意單詞的重音和語調".to_string(),
            "多聽母語者的發音並模仿".to_string(),
        ],
        next_challenge: "嘗試挑戰更複雜的句型練習".to_string(),
        motivation_level,
        difficulty_adjustment: "maintain".to_string(),
    }
}

// 備用練習內容生成函數
fn create_fallback_content(topic: &str, difficulty_level: &str) -> String {
    match (topic, difficulty_level) {
        ("daily", "beginner") => "Hello! How are you today? I hope you have a great day. What are your plans for this weekend?".to_string(),
        ("daily", "intermediate") => "Good morning! I was wondering if you could help me with something. I'm looking for a good restaurant nearby. Do you have any recommendations?".to_string(),
        ("business", "beginner") => "Good morning. I would like to schedule a meeting. When would be a good time for you? Thank you for your time.".to_string(),
        ("business", "intermediate") => "I'd like to discuss our quarterly results and explore new opportunities for growth. Could we arrange a conference call with the team next week?".to_string(),
        _ => "Practice makes perfect. The more you speak, the more confident you become. Keep up the great work and don't be afraid to make mistakes.".to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        gemini_service: Mutex::new(None),
    };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            initialize_gemini_service,
            test_gemini_connection,
            get_ai_tutor_feedback,
            generate_practice_content,
            gemini_text_to_speech,
            speech_to_text,
            text_to_speech,
            pronunciation_score,
            start_recording,
            stop_recording,
            save_practice_record,
            get_learning_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
