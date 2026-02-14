use egui::Margin;

use crate::stage::{Stage, structs::Entity};

pub struct Terminal {
    input: String,
    history: Vec<HistoryItem>,
}

impl Terminal {
    pub fn new() -> Self {
        Terminal {
            input: String::new(),
            history: Vec::new(),
        }
    }

    pub fn ui(&mut self, ui: &mut egui::Ui, stage: &mut Stage) {
        egui::ScrollArea::vertical()
            .stick_to_bottom(true)
            .show(ui, |ui| {
                // 历史记录
                for item in &self.history {
                    match item {
                        HistoryItem::In(cmd) => {
                            for (i, line) in cmd.lines().enumerate() {
                                let prefix = if i == 0 { "> " } else { "  " };
                                ui.label(
                                    egui::RichText::new(format!("{}{}", prefix, line))
                                        .color(egui::Color32::LIGHT_BLUE)
                                        .font(egui::FontId::monospace(14.0)),
                                );
                            }
                        }
                        HistoryItem::Out(output) => {
                            ui.label(
                                egui::RichText::new(output)
                                    .color(egui::Color32::WHITE)
                                    .font(egui::FontId::monospace(14.0)),
                            );
                        }
                        HistoryItem::Err(err) => {
                            ui.label(
                                egui::RichText::new(err)
                                    .color(egui::Color32::LIGHT_RED)
                                    .font(egui::FontId::monospace(14.0)),
                            );
                        }
                    }
                }

                // 输入框
                ui.horizontal(|ui| {
                    ui.label(
                        egui::RichText::new(">")
                            .color(egui::Color32::LIGHT_BLUE)
                            .font(egui::FontId::monospace(14.0)),
                    );

                    let response = ui.add(
                        egui::TextEdit::multiline(&mut self.input)
                            .id(ui.make_persistent_id("terminal_input"))
                            .desired_width(f32::INFINITY)
                            .desired_rows(1)
                            .lock_focus(true)
                            .text_color(egui::Color32::LIGHT_BLUE)
                            .font(egui::FontId::monospace(14.0))
                            .margin(Margin::ZERO)
                            .frame(false),
                    );
                    if response.has_focus()
                        && ui.input_mut(|i| i.consume_key(egui::Modifiers::NONE, egui::Key::Enter))
                    {
                        let modifiers = ui.input(|i| i.modifiers);
                        if !modifiers.shift && !modifiers.ctrl && !modifiers.alt {
                            self.history
                                .push(HistoryItem::In(self.input.clone().trim().to_string()));
                            match knus::parse::<Vec<Entity>>("terminal_input.kdl", &self.input) {
                                Ok(doc) => {
                                    for entity in doc {
                                        stage.context.add(entity.into());
                                    }
                                }
                                Err(e) => {
                                    // log::error!("{:?}", miette::Report::new(e.into()));
                                    self.history.push(HistoryItem::Err(get_plain_report_string(
                                        miette::Report::new(e),
                                    )));
                                }
                            }
                            self.input.clear();
                            response.request_focus();
                        }
                    }
                });

                ui.allocate_space(ui.available_size());
            });
    }
}

enum HistoryItem {
    In(String),
    Out(String),
    Err(String),
}

fn get_plain_report_string(report: miette::Report) -> String {
    let mut out = String::new();
    // 创建一个不带颜色的渲染处理器
    miette::GraphicalReportHandler::new_themed(miette::GraphicalTheme::unicode_nocolor())
        .render_report(&mut out, report.as_ref())
        .unwrap();
    out
}
