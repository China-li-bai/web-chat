use serde::{Deserialize, Serialize};
use reqwest;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiConfig {
    pub api_key: String,
    pub model: String,
    pub base_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiRequest {
    pub contents: Vec<Content>,
    #[serde(rename = "generationConfig")]
    pub generation_config: GenerationConfig,
    #[serde(rename = "safetySettings")]
    pub safety_settings: Vec<SafetySetting>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Content {
    pub parts: Vec<Part>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Part {
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerationConfig {
    pub temperature: f32,
    #[serde(rename = "topK")]
    pub top_k: i32,
    #[serde(rename = "topP")]
    pub top_p: f32,
    #[serde(rename = "maxOutputTokens")]
    pub max_output_tokens: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SafetySetting {
    pub category: String,
    pub threshold: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeminiResponse {
    pub candidates: Vec<Candidate>,
    #[serde(rename = "usageMetadata")]
    pub usage_metadata: Option<UsageMetadata>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Candidate {
    pub content: Content,
    #[serde(rename = "finishReason")]
    pub finish_reason: Option<String>,
    pub index: i32,
    #[serde(rename = "safetyRatings")]
    pub safety_ratings: Vec<SafetyRating>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SafetyRating {
    pub category: String,
    pub probability: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageMetadata {
    #[serde(rename = "promptTokenCount")]
    pub prompt_token_count: i32,
    #[serde(rename = "candidatesTokenCount")]
    pub candidates_token_count: i32,
    #[serde(rename = "totalTokenCount")]
    pub total_token_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TutorFeedback {
    pub encouragement: String,
    pub specific_feedback: String,
    pub improvement_tips: Vec<String>,
    pub next_challenge: String,
    pub motivation_level: String, // "high", "medium", "low"
    pub difficulty_adjustment: String, // "increase", "maintain", "decrease"
}

pub struct GeminiService {
    config: GeminiConfig,
    client: reqwest::Client,
}

impl GeminiService {
    pub fn new(api_key: String) -> Self {
        let config = GeminiConfig {
            api_key,
            model: "gemini-1.5-pro".to_string(),
            base_url: "https://gemini.66666618.xyz/v1beta/models".to_string(),
        };
        
        let client = reqwest::Client::new();
        
        Self { config, client }
    }
    
    pub async fn generate_tutor_feedback(
        &self,
        user_performance: &HashMap<String, serde_json::Value>,
        practice_context: &str,
    ) -> Result<TutorFeedback, Box<dyn std::error::Error>> {
        let prompt = self.create_tutor_prompt(user_performance, practice_context);
        
        let request = GeminiRequest {
            contents: vec![Content {
                parts: vec![Part { text: prompt }],
                role: Some("user".to_string()),
            }],
            generation_config: GenerationConfig {
                temperature: 0.7,
                top_k: 40,
                top_p: 0.95,
                max_output_tokens: 1024,
            },
            safety_settings: vec![
                SafetySetting {
                    category: "HARM_CATEGORY_HARASSMENT".to_string(),
                    threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
                },
                SafetySetting {
                    category: "HARM_CATEGORY_HATE_SPEECH".to_string(),
                    threshold: "BLOCK_MEDIUM_AND_ABOVE".to_string(),
                },
            ],
        };
        
        let url = format!(
            "{}/{}:generateContent?key={}",
            self.config.base_url, self.config.model, self.config.api_key
        );
        
        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await?
            .json::<GeminiResponse>()
            .await?;
        
        if let Some(candidate) = response.candidates.first() {
            let content = &candidate.content.parts[0].text;
            self.parse_tutor_response(content)
        } else {
            Err("No response from Gemini API".into())
        }
    }
    
    fn create_tutor_prompt(
        &self,
        user_performance: &HashMap<String, serde_json::Value>,
        practice_context: &str,
    ) -> String {
        let overall_score = user_performance
            .get("overall")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let pronunciation_score = user_performance
            .get("pronunciation")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let fluency_score = user_performance
            .get("fluency")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let completeness_score = user_performance
            .get("completeness")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        
        format!(
            r#"你是一位專業的英語口語私人導師，具有豐富的教學經驗和激勵學生的能力。請根據學生的練習表現提供個性化的反饋和指導。

學生練習情況：
- 練習內容：{}
- 總體得分：{:.1}分
- 發音準確度：{:.1}分
- 流利度：{:.1}分
- 完整度：{:.1}分

請以JSON格式回應，包含以下字段：
{{
  "encouragement": "鼓勵性話語，要具體且真誠",
  "specific_feedback": "針對具體表現的詳細反饋",
  "improvement_tips": ["改進建議1", "改進建議2", "改進建議3"],
  "next_challenge": "下一步挑戰或練習建議",
  "motivation_level": "根據表現判斷激勵程度：high/medium/low",
  "difficulty_adjustment": "難度調整建議：increase/maintain/decrease"
}}

要求：
1. 鼓勵為主，建設性批評為輔
2. 提供具體可行的改進建議
3. 根據分數水平調整激勵策略
4. 像Duolingo一樣提供即時、積極的反饋
5. 使用繁體中文回應"#,
            practice_context, overall_score, pronunciation_score, fluency_score, completeness_score
        )
    }
    
    fn parse_tutor_response(&self, content: &str) -> Result<TutorFeedback, Box<dyn std::error::Error>> {
        // 嘗試從回應中提取JSON
        let json_start = content.find('{');
        let json_end = content.rfind('}');
        
        if let (Some(start), Some(end)) = (json_start, json_end) {
            let json_str = &content[start..=end];
            match serde_json::from_str::<serde_json::Value>(json_str) {
                Ok(json) => {
                    let feedback = TutorFeedback {
                        encouragement: json["encouragement"]
                            .as_str()
                            .unwrap_or("很好的嘗試！繼續加油！")
                            .to_string(),
                        specific_feedback: json["specific_feedback"]
                            .as_str()
                            .unwrap_or("您的發音整體不錯，繼續練習會更好。")
                            .to_string(),
                        improvement_tips: json["improvement_tips"]
                            .as_array()
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str())
                                    .map(|s| s.to_string())
                                    .collect()
                            })
                            .unwrap_or_else(|| vec!["多聽多練".to_string(), "注意語調".to_string()]),
                        next_challenge: json["next_challenge"]
                            .as_str()
                            .unwrap_or("嘗試更複雜的句子練習")
                            .to_string(),
                        motivation_level: json["motivation_level"]
                            .as_str()
                            .unwrap_or("medium")
                            .to_string(),
                        difficulty_adjustment: json["difficulty_adjustment"]
                            .as_str()
                            .unwrap_or("maintain")
                            .to_string(),
                    };
                    Ok(feedback)
                }
                Err(_) => {
                    // 如果JSON解析失敗，提供默認反饋
                    Ok(TutorFeedback {
                        encouragement: "很好的練習！您正在進步中。".to_string(),
                        specific_feedback: "繼續保持練習的節奏，您會看到明顯的改善。".to_string(),
                        improvement_tips: vec![
                            "每天堅持練習15分鐘".to_string(),
                            "注意單詞的重音位置".to_string(),
                            "模仿母語者的語調".to_string(),
                        ],
                        next_challenge: "嘗試朗讀一段新聞文章".to_string(),
                        motivation_level: "medium".to_string(),
                        difficulty_adjustment: "maintain".to_string(),
                    })
                }
            }
        } else {
            // 如果找不到JSON格式，提供默認反饋
            Ok(TutorFeedback {
                encouragement: "很棒的嘗試！每一次練習都是進步。".to_string(),
                specific_feedback: "您的努力很值得讚賞，繼續保持這種學習態度。".to_string(),
                improvement_tips: vec![
                    "保持每日練習的習慣".to_string(),
                    "錄音後多聽幾遍自己的發音".to_string(),
                ],
                next_challenge: "挑戰更長的對話練習".to_string(),
                motivation_level: "high".to_string(),
                difficulty_adjustment: "maintain".to_string(),
            })
        }
    }
    
    pub async fn generate_practice_content(
        &self,
        topic: &str,
        difficulty_level: &str,
        user_interests: &[String],
    ) -> Result<String, Box<dyn std::error::Error>> {
        let prompt = format!(
            r#"作為英語口語教學專家，請為學生生成個性化的練習內容。

要求：
- 主題：{}
- 難度等級：{}
- 學生興趣：{}

請生成一段適合的英語練習文本（50-100詞），要求：
1. 符合指定主題和難度
2. 融入學生的興趣點
3. 語言自然流暢
4. 適合口語練習
5. 包含常用詞彙和句型

只返回練習文本，不要其他說明。"#,
            topic,
            difficulty_level,
            user_interests.join("、")
        );
        
        let request = GeminiRequest {
            contents: vec![Content {
                parts: vec![Part { text: prompt }],
                role: Some("user".to_string()),
            }],
            generation_config: GenerationConfig {
                temperature: 0.8,
                top_k: 40,
                top_p: 0.95,
                max_output_tokens: 512,
            },
            safety_settings: vec![],
        };
        
        let url = format!(
            "{}/{}:generateContent?key={}",
            self.config.base_url, self.config.model, self.config.api_key
        );
        
        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await?
            .json::<GeminiResponse>()
            .await?;
        
        if let Some(candidate) = response.candidates.first() {
            Ok(candidate.content.parts[0].text.trim().to_string())
        } else {
            Err("No response from Gemini API".into())
        }
    }
    
    pub async fn generate_speech_audio(
        &self,
        text: &str,
        voice_config: Option<&str>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // 使用 Gemini 生成更自然的語音提示文本
        let enhanced_prompt = format!(
            r#"請將以下文本轉換為適合語音合成的格式，添加適當的語調標記和停頓：

原文：{}

要求：
1. 保持原意不變
2. 添加適當的語調變化
3. 標記重音位置
4. 適合英語學習者聽讀

只返回優化後的文本，不要其他說明。"#,
            text
        );
        
        let request = GeminiRequest {
            contents: vec![Content {
                parts: vec![Part { text: enhanced_prompt }],
                role: Some("user".to_string()),
            }],
            generation_config: GenerationConfig {
                temperature: 0.3,
                top_k: 20,
                top_p: 0.8,
                max_output_tokens: 256,
            },
            safety_settings: vec![],
        };
        
        let url = format!(
            "{}/{}:generateContent?key={}",
            self.config.base_url, self.config.model, self.config.api_key
        );
        
        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await?
            .json::<GeminiResponse>()
            .await?;
        
        if let Some(candidate) = response.candidates.first() {
            let enhanced_text = candidate.content.parts[0].text.trim();
            // 返回增強後的文本，前端將使用 Web Speech API 播放
            Ok(format!("{{\"enhanced_text\": \"{}\", \"original_text\": \"{}\"}}", enhanced_text, text))
        } else {
            Err("No response from Gemini API".into())
        }
    }
}