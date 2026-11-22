//! Traditional Chinese as used in Taiwan (`zh-TW`). Speech engines only know Chinese (`zh`) and
//! mostly write it in Simplified characters, so the app transcribes as `zh` and converts the text
//! with OpenCC's `s2twp` rules: Taiwan characters and Taiwan wording (软件 → 軟體).

use crate::transcript::{Segment, Word};
use ferrous_opencc::{config::BuiltinConfig, OpenCC};
use std::sync::OnceLock;

/// The language code the transcription settings use for Traditional Chinese (Taiwan).
pub const TAIWAN_TRADITIONAL: &str = "zh-TW";

/// The language to ask the engine for.
pub fn engine_language(lang: Option<&str>) -> Option<String> {
    lang.map(|lang| if lang == TAIWAN_TRADITIONAL { "zh" } else { lang }.to_string())
}

/// Built once: loading the dictionaries takes a moment.
fn converter() -> Option<&'static OpenCC> {
    static CONVERTER: OnceLock<Option<OpenCC>> = OnceLock::new();
    CONVERTER
        .get_or_init(|| match OpenCC::from_config(BuiltinConfig::S2twp) {
            Ok(converter) => Some(converter),
            Err(error) => {
                tracing::error!("could not load the Traditional Chinese converter: {error}");
                None
            }
        })
        .as_ref()
}

/// Simplified (or mixed) Chinese to Taiwan Traditional. The text comes back unchanged if the
/// converter cannot load, so a transcript is never lost to it.
pub fn to_taiwan_traditional(text: &str) -> String {
    converter().map_or_else(|| text.to_string(), |converter| converter.convert(text))
}

/// Convert a segment and its words when the transcript was asked for in Traditional Chinese (Taiwan).
pub fn localize_segment(mut segment: Segment, lang: Option<&str>) -> Segment {
    if lang != Some(TAIWAN_TRADITIONAL) {
        return segment;
    }
    segment.text = to_taiwan_traditional(&segment.text);
    if let Some(words) = segment.words.as_mut() {
        for Word { text, .. } in words.iter_mut() {
            *text = to_taiwan_traditional(text);
        }
    }
    segment
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn taiwan_traditional_is_transcribed_as_chinese() {
        assert_eq!(engine_language(Some("zh-TW")).as_deref(), Some("zh"));
    }

    #[test]
    fn other_languages_go_to_the_engine_unchanged() {
        assert_eq!(engine_language(Some("ja")).as_deref(), Some("ja"));
        assert_eq!(engine_language(Some("auto")).as_deref(), Some("auto"));
        assert_eq!(engine_language(None), None);
    }

    #[test]
    fn simplified_text_becomes_taiwan_traditional_with_taiwan_words() {
        assert_eq!(to_taiwan_traditional("软件和网络"), "軟體和網路");
    }

    #[test]
    fn text_without_chinese_is_left_alone() {
        assert_eq!(to_taiwan_traditional("Hello, world 123"), "Hello, world 123");
    }

    #[test]
    fn a_segment_and_its_words_are_converted() {
        let segment = Segment {
            start: 0,
            stop: 100,
            text: "软件".to_string(),
            speaker: None,
            words: Some(vec![Word { start: 0, stop: 50, text: "软".to_string() }, Word { start: 50, stop: 100, text: "件".to_string() }]),
        };
        let converted = localize_segment(segment, Some("zh-TW"));
        assert_eq!(converted.text, "軟體");
        let words: Vec<_> = converted.words.unwrap().into_iter().map(|word| word.text).collect();
        assert_eq!(words, ["軟", "件"]);
    }

    #[test]
    fn a_segment_in_another_language_is_untouched() {
        let segment = Segment { start: 0, stop: 100, text: "软件".to_string(), speaker: None, words: None };
        assert_eq!(localize_segment(segment, Some("zh")).text, "软件");
    }
}
