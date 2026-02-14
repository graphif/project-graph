use std::collections::HashMap;

use egui::Pos2;
use nanoid::nanoid;

use crate::stage::structs::{Entity, TextNode};

pub struct StageContext {
    entities: HashMap<String, Entity>,
}

impl StageContext {
    pub fn new() -> Self {
        StageContext {
            entities: HashMap::new(),
        }
    }
    pub fn random() -> Self {
        let mut entities: HashMap<String, Entity> = HashMap::new();
        for i in 0..1000 {
            let id = nanoid!();
            entities.insert(
                id.clone(),
                TextNode {
                    id,
                    content: format!("节点 {}", i),
                    position: Pos2::new(
                        rand::random::<f32>() * 2000.0 - 1000.0,
                        rand::random::<f32>() * 2000.0 - 1000.0,
                    ),
                }
                .into(),
            );
        }
        StageContext { entities }
    }

    pub fn entities(&self) -> &HashMap<String, Entity> {
        &self.entities
    }
}
