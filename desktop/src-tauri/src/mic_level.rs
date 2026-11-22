use std::path::Path;

use hound::{SampleFormat, WavReader};

pub enum MicLevel {
    QuietBackground,
    Keep,
    Boost(u8),
}

/// Measure 20 ms windows on the isolated microphone track. A bounded histogram
/// lets long meetings use the same memory as short dictation clips.
pub fn measure(path: &Path) -> Result<MicLevel, hound::Error> {
    let mut reader = WavReader::open(path)?;
    let spec = reader.spec();
    let window = (spec.sample_rate / 50).max(1) as usize * usize::from(spec.channels);
    match spec.sample_format {
        SampleFormat::Float => levels(reader.samples::<f32>(), window),
        SampleFormat::Int => {
            let scale = 2_f32.powi(i32::from(spec.bits_per_sample) - 1);
            levels(
                reader.samples::<i32>().map(|value| value.map(|sample| sample as f32 / scale)),
                window,
            )
        }
    }
}

fn levels(samples: impl Iterator<Item = Result<f32, hound::Error>>, window: usize) -> Result<MicLevel, hound::Error> {
    let mut histogram = [0_u64; 97]; // RMS dBFS, -96 through 0.
    let mut energy = 0.0_f64;
    let mut count = 0;
    for sample in samples {
        let value = f64::from(sample?);
        energy += value * value;
        count += 1;
        if count == window {
            let db = (10.0 * (energy / window as f64).log10()).round().clamp(-96.0, 0.0);
            histogram[(db + 96.0) as usize] += 1;
            count = 0;
            energy = 0.0;
        }
    }

    let total: u64 = histogram.iter().sum();
    let percentile = |rank: u64| {
        let mut cumulative = 0;
        histogram
            .iter()
            .position(|n| {
                cumulative += n;
                cumulative >= rank
            })
            .unwrap_or(96) as i32
            - 96
    };
    // Ignore the quietest background and require at least 160 ms above it.
    // This is an energy heuristic, not a speech recognizer.
    let floor = percentile(total.div_ceil(10));
    let threshold = (floor + 6).max(-62);
    let below: u64 = histogram.iter().take((threshold + 96) as usize).sum();
    let active = total - below;
    if active < 8 {
        return Ok(if floor < -40 {
            MicLevel::QuietBackground
        } else {
            MicLevel::Keep
        });
    }
    let voice = percentile(below + (active * 3).div_ceil(4));
    Ok(if voice < -26 {
        MicLevel::Boost((-20 - voice).min(24) as u8)
    } else {
        MicLevel::Keep
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_clip(quiet: f32, voiced: f32) -> MicLevel {
        let samples = (0..3200).map(|i| Ok(if i % 800 < 400 { quiet } else { voiced }));
        levels(samples, 20).unwrap()
    }

    #[test]
    fn boosts_quiet_variable_audio_but_leaves_normal_audio_and_background_alone() {
        assert!(matches!(sample_clip(0.0001, 0.005), MicLevel::Boost(24)));
        assert!(matches!(sample_clip(0.0001, 0.1), MicLevel::Keep));
        assert!(matches!(sample_clip(0.003, 0.003), MicLevel::QuietBackground));
        assert!(matches!(sample_clip(0.0, 0.0), MicLevel::QuietBackground));
    }
}
