use lucide_icons::Icon;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, LazyLock, RwLock};

#[derive(Debug, Clone)]
pub struct MajorCategory {
    pub key: &'static str,
    pub label: &'static str,
    pub icon: Icon,
}

#[derive(Debug, Clone)]
pub struct MinorCategory {
    pub key: &'static str,
    pub major_key: &'static str,
    pub label: &'static str,
    pub icon: Icon,
}

#[derive(Debug, Clone)]
pub enum SettingControl {
    Input,
    Checkbox,
    Slider {
        min: f64,
        max: f64,
        step: Option<f64>,
        suffix: Option<&'static str>,
    },
    Select {
        options: &'static [(&'static str, &'static str)],
    },
}

#[derive(Debug, Clone)]
pub struct SettingMetadata {
    pub key: &'static str,
    pub label: &'static str,
    pub minor_key: &'static str,
    pub icon: Icon,
    pub description: Option<&'static str>,
}

pub trait ControlRenderable {
    fn render(&mut self, ui: &mut egui::Ui, control: &SettingControl, id: &str) -> bool;
}

impl ControlRenderable for String {
    fn render(&mut self, ui: &mut egui::Ui, control: &SettingControl, id: &str) -> bool {
        match control {
            SettingControl::Input => ui.text_edit_singleline(self).changed(),
            SettingControl::Select { options } => {
                let mut changed = false;
                let current_label = options
                    .iter()
                    .find(|(v, _)| *v == self.as_str())
                    .map(|(_, l)| *l)
                    .unwrap_or("Unknown");

                egui::ComboBox::from_id_salt(id)
                    .selected_text(current_label)
                    .show_ui(ui, |ui| {
                        for (val, lab) in *options {
                            if ui
                                .selectable_value(self, (*val).to_string(), *lab)
                                .clicked()
                            {
                                changed = true;
                            }
                        }
                    });
                changed
            }
            _ => {
                ui.label("Unsupported control for String");
                false
            }
        }
    }
}

impl ControlRenderable for bool {
    fn render(&mut self, ui: &mut egui::Ui, control: &SettingControl, _id: &str) -> bool {
        match control {
            SettingControl::Checkbox => ui.checkbox(self, "").changed(),
            _ => {
                ui.label("Unsupported control for bool");
                false
            }
        }
    }
}

impl ControlRenderable for f32 {
    fn render(&mut self, ui: &mut egui::Ui, control: &SettingControl, _id: &str) -> bool {
        match control {
            SettingControl::Slider {
                min,
                max,
                step,
                suffix,
            } => {
                let mut slider = egui::Slider::new(self, (*min as f32)..=(*max as f32));
                if let Some(s) = step {
                    slider = slider.step_by(*s);
                }
                if let Some(suf) = suffix {
                    slider = slider.suffix(*suf);
                }
                ui.add(slider).changed()
            }
            _ => {
                ui.label("Unsupported control for f32");
                false
            }
        }
    }
}

impl ControlRenderable for u64 {
    fn render(&mut self, ui: &mut egui::Ui, control: &SettingControl, _id: &str) -> bool {
        match control {
            SettingControl::Slider {
                min,
                max,
                step,
                suffix,
            } => {
                let mut slider = egui::Slider::new(self, (*min as u64)..=(*max as u64));
                if let Some(s) = step {
                    slider = slider.step_by(*s);
                }
                if let Some(suf) = suffix {
                    slider = slider.suffix(*suf);
                }
                ui.add(slider).changed()
            }
            _ => {
                ui.label("Unsupported control for u64");
                false
            }
        }
    }
}

macro_rules! define_settings {
    (
        $(
            $major_key:ident : $major_label:literal | $major_icon:path {
                $(
                    $minor_key:ident : $minor_label:literal | $minor_icon:path {
                        $(
                            $(#[$meta:meta])*
                            $field:ident : $type:ty = $default:expr => {
                                label: $label:literal,
                                icon: $icon:path,
                                control: $control:expr
                                $(, description: $desc:literal)?
                            }
                        ),* $(,)?
                    }
                ),* $(,)?
            }
        ),* $(,)?
    ) => {
        #[derive(Debug, Clone, Serialize, Deserialize)]
        pub struct Settings {
            $(
                $(
                    $(
                        $(#[$meta])*
                        pub $field: $type,
                    )*
                )*
            )*
        }

        impl Default for Settings {
            fn default() -> Self {
                Self {
                    $(
                        $(
                            $(
                                $field: $default,
                            )*
                        )*
                    )*
                }
            }
        }

        impl Settings {
            pub fn major_categories() -> Vec<MajorCategory> {
                vec![
                    $(
                        MajorCategory {
                            key: stringify!($major_key),
                            label: $major_label,
                            icon: $major_icon,
                        },
                    )*
                ]
            }

            pub fn minor_categories() -> Vec<MinorCategory> {
                vec![
                    $(
                        $(
                            MinorCategory {
                                key: stringify!($minor_key),
                                major_key: stringify!($major_key),
                                label: $minor_label,
                                icon: $minor_icon,
                            },
                        )*
                    )*
                ]
            }

            pub fn field_metadata() -> Vec<SettingMetadata> {
                vec![
                    $(
                        $(
                            $(
                                SettingMetadata {
                                    key: stringify!($field),
                                    label: $label,
                                    minor_key: stringify!($minor_key),
                                    icon: $icon,
                                    description: None $(.or(Some($desc)))?,
                                },
                            )*
                        )*
                    )*
                ]
            }

            pub fn render_control(&mut self, key: &str, ui: &mut egui::Ui) -> bool {
                $(
                    $(
                        $(
                            if key == stringify!($field) {
                                return self.$field.render(ui, &$control, key);
                            }
                        )*
                    )*
                )*
                false
            }
        }
    };
}

/// 全局单例，使用 RwLock 保证线程安全读写
/// LazyLock 确保只在第一次访问时初始化
static GLOBAL_SETTINGS: LazyLock<Arc<RwLock<Settings>>> =
    LazyLock::new(|| Arc::new(RwLock::new(Settings::default())));

impl Settings {
    /// 获取全局设置的读取副本（低开销）
    pub fn get() -> Settings {
        GLOBAL_SETTINGS.read().unwrap().clone()
    }

    /// 修改全局设置
    /// 传入一个闭包，只修改你需要修改的部分
    pub fn modify<F>(f: F)
    where
        F: FnOnce(&mut Settings),
    {
        let mut settings = GLOBAL_SETTINGS.write().unwrap();
        f(&mut settings);
    }

    /// 从 eframe storage 加载
    pub fn load(storage: Option<&dyn eframe::Storage>) {
        if let Some(storage) = storage {
            if let Some(json) = storage.get_string("app_settings") {
                match serde_json::from_str::<Settings>(&json) {
                    Ok(loaded_settings) => {
                        *GLOBAL_SETTINGS.write().unwrap() = loaded_settings;
                        log::info!("Settings loaded successfully.");
                        return;
                    }
                    Err(e) => {
                        log::error!("Failed to parse settings: {}", e);
                    }
                }
            }
        }
        log::info!("No saved settings found, using defaults.");
    }

    /// 保存到 eframe storage
    /// 这个方法通常在 App::save 钩子中调用
    pub fn save(storage: &mut dyn eframe::Storage) {
        let settings = GLOBAL_SETTINGS.read().unwrap();
        match serde_json::to_string(&*settings) {
            Ok(json) => {
                storage.set_string("app_settings", json);
                log::debug!("Settings saved.");
            }
            Err(e) => {
                log::error!("Failed to serialize settings: {}", e);
            }
        }
    }
}

// ===== 设置项定义 =====
define_settings! {
    general: "常规设置" | Icon::Settings {
        account: "账户信息" | Icon::User {
            user_name: String = "User".to_string() => {
                label: "用户名",
                icon: Icon::User,
                control: SettingControl::Input,
                description: "修改您在应用中显示的昵称"
            }
        }
    },
    appearance: "视觉效果" | Icon::Palette {
        theme: "主题配色" | Icon::SunMoon {
            theme_mode: String = "Dark".to_string() => {
                label: "主题模式",
                icon: Icon::SunMoon,
                control: SettingControl::Select {
                    options: &[("Dark", "暗黑"), ("Light", "明亮")]
                },
                description: "选择界面的整体色彩方案"
            }
        },
        typography: "排版与缩放" | Icon::Type {
            font_size: f32 = 14.0 => {
                label: "字体大小",
                icon: Icon::Type,
                control: SettingControl::Slider {
                    min: 10.0,
                    max: 24.0,
                    step: Some(1.0),
                    suffix: Some("px")
                },
                description: "调整全局基础文字的大小"
            },
            ui_scale: f32 = 1.0 => {
                label: "界面缩放",
                icon: Icon::Maximize,
                control: SettingControl::Slider {
                    min: 0.5,
                    max: 2.0,
                    step: Some(0.1),
                    suffix: None
                },
                description: "调整整个 UI 的渲染比例"
            }
        },
        effects: "动画效果" | Icon::Sparkles {
            enable_animations: bool = true => {
                label: "启用过渡动画",
                icon: Icon::Sparkles,
                control: SettingControl::Checkbox,
                description: "开启后界面切换将更加平滑"
            }
        }
    },
    behavior: "应用行为" | Icon::Activity {
        storage: "存储与同步" | Icon::Database {
            auto_save_interval: u64 = 60 => {
                label: "自动保存间隔",
                icon: Icon::Save,
                control: SettingControl::Slider {
                    min: 10.0,
                    max: 600.0,
                    step: Some(10.0),
                    suffix: Some("s")
                },
                description: "设置数据自动同步到本地的频率"
            },
            sync_on_startup: bool = true => {
                label: "启动时同步",
                icon: Icon::RefreshCw,
                control: SettingControl::Checkbox,
                description: "打开软件时是否自动拉取云端数据"
            }
        }
    },
    advanced: "高级选项" | Icon::Settings2 {
        debug: "开发者调试" | Icon::Bug {
            show_debug_info: bool = false => {
                label: "调试面板",
                icon: Icon::Bug,
                control: SettingControl::Checkbox,
                description: "在主界面下方显示性能指标和内部状态"
            }
        },
        engine: "图形引擎" | Icon::Zap {
            experimental_layout: bool = false => {
                label: "实验性布局算法",
                icon: Icon::Zap,
                control: SettingControl::Checkbox,
                description: "尝试使用最新的节点自动布局引擎（尚在测试中）"
            }
        }
    }
}
