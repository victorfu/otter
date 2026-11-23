//! Chinese (Taiwan), `zh-TW`. The engines know Chinese only as `zh`, and whisper often writes it in
//! Simplified characters and mainland wording. Taiwan is the same `zh` recognition with its text sent
//! through OpenCC's `s2twp`: Traditional characters and Taiwan phrasing (软件 → 軟體, 视频 → 影片).

use std::sync::OnceLock;

use ferrous_opencc::{config::BuiltinConfig, OpenCC};
use whisper_rs::{Segment, TranscribeOptions};

pub const TAIWAN: &str = "zh-TW";
const CHINESE: &str = "zh";

/// Whether the caller asked for Chinese (Taiwan), in any letter case.
pub fn is_taiwan(language: Option<&str>) -> bool {
    language.is_some_and(|code| code.eq_ignore_ascii_case(TAIWAN))
}

/// Chinese (Taiwan) after Chinese, for an engine that transcribes Chinese.
pub fn with_taiwan(mut languages: Vec<String>) -> Vec<String> {
    if let Some(index) = languages.iter().position(|code| code == CHINESE) {
        if !languages.iter().any(|code| code == TAIWAN) {
            languages.insert(index + 1, TAIWAN.to_string());
        }
    }
    languages
}

/// The options an engine gets for a Taiwan request: plain Chinese, with Taiwan applied to the text afterwards.
pub fn engine_options(mut options: TranscribeOptions) -> TranscribeOptions {
    if is_taiwan(options.language.as_deref()) {
        options.language = Some(CHINESE.to_string());
    }
    options
}

fn converter() -> &'static OpenCC {
    static CONVERTER: OnceLock<OpenCC> = OnceLock::new();
    // The dictionaries are compiled into the crate, so only a broken build can fail here.
    CONVERTER.get_or_init(|| OpenCC::from_config(BuiltinConfig::S2twp).expect("built-in s2twp config"))
}

/// The text in Traditional characters and Taiwan phrasing.
pub fn to_taiwan(text: &str) -> String {
    converter().convert(text)
}

/// The segment's text and words in Traditional characters and Taiwan phrasing.
pub fn convert_segment(segment: &mut Segment) {
    segment.text = to_taiwan(&segment.text);
    for word in &mut segment.words {
        word.text = to_taiwan(&word.text);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_traditional_characters_and_taiwan_phrasing() {
        assert_eq!(to_taiwan("今天的会议要讨论软件和视频"), "今天的會議要討論軟體和影片");
    }

    #[test]
    fn leaves_traditional_text_and_other_languages_alone() {
        assert_eq!(
            to_taiwan("我們要討論新版 app 的 release 時程"),
            "我們要討論新版 app 的 release 時程"
        );
        assert_eq!(to_taiwan("Hello, world"), "Hello, world");
    }

    #[test]
    fn lists_taiwan_right_after_chinese() {
        let languages = |codes: &[&str]| codes.iter().map(|code| code.to_string()).collect::<Vec<_>>();
        assert_eq!(
            with_taiwan(languages(&["en", "zh", "de"])),
            languages(&["en", "zh", "zh-TW", "de"])
        );
        assert_eq!(with_taiwan(languages(&["en", "he"])), languages(&["en", "he"]));
        assert_eq!(with_taiwan(languages(&["zh", "zh-TW"])), languages(&["zh", "zh-TW"]));
    }

    #[test]
    fn hands_the_engine_plain_chinese() {
        let options = engine_options(TranscribeOptions {
            language: Some("ZH-tw".to_string()),
            ..Default::default()
        });
        assert_eq!(options.language.as_deref(), Some("zh"));
        let english = engine_options(TranscribeOptions {
            language: Some("en".to_string()),
            ..Default::default()
        });
        assert_eq!(english.language.as_deref(), Some("en"));
    }
}
