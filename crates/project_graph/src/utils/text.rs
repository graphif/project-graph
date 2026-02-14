use egui::{Context, FontId, Painter};
use lru::LruCache;
use std::num::NonZeroUsize;
use std::sync::{LazyLock, Mutex};

#[derive(Hash, PartialEq, Eq, Clone)]
struct TextWidthCacheKey {
    text: String,
    /// 浮点数不能作为哈希键，所以需要转换为整数后存储
    size: i32,
}

static TEXT_WIDTH_CACHE: LazyLock<Mutex<LruCache<TextWidthCacheKey, f32>>> = LazyLock::new(|| {
    let cache = LruCache::new(NonZeroUsize::new(1024).unwrap());
    Mutex::new(cache)
});

/// 计算文字宽度
pub fn get_text_width(text: &str, font_size: f32, painter: &Painter) -> f32 {
    let key = TextWidthCacheKey {
        text: text.to_string(),
        size: (font_size * 10.0) as i32,
    };

    if let Ok(mut cache) = TEXT_WIDTH_CACHE.lock() {
        if let Some(&width) = cache.get(&key) {
            return width;
        }
    }

    let font_id = FontId::proportional(font_size);
    let galley = painter.layout_no_wrap(text.to_string(), font_id, egui::Color32::TRANSPARENT);
    let width = galley.size().x;

    if let Ok(mut cache) = TEXT_WIDTH_CACHE.lock() {
        cache.put(key, width);
    }

    width
}
