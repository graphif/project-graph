use crate::stage::{Stage, structs::Text};

pub struct Terminal {
    input: String,
}

impl Terminal {
    pub fn new() -> Self {
        Terminal {
            input: String::new(),
        }
    }

    pub fn ui(&mut self, ui: &mut egui::Ui, stage: &mut Stage) {
        ui.heading("Terminal");
        ui.separator();
        ui.text_edit_multiline(&mut self.input);
        if ui.button("execute").clicked() {
            match knus::parse::<Vec<Text>>("terminal_input.kdl", &self.input) {
                Ok(doc) => {
                    for entity in doc {
                        stage.context.add(entity.into());
                    }
                }
                Err(e) => {
                    log::error!("{:?}", miette::Report::new(e));
                }
            }
            self.input.clear();
        }
    }
}
