use std::collections::HashMap;

use egui::Pos2;
use nanoid::nanoid;

use crate::stage::elements::{
    Element, ElementTrait,
    entities::{Entity, text::Text},
};

pub struct StageContext {
    elements: HashMap<String, Element>,
}

impl StageContext {
    pub fn new() -> Self {
        StageContext {
            elements: HashMap::new(),
        }
    }
    pub fn random() -> Self {
        let mut elements: HashMap<String, Element> = HashMap::new();
        for i in 0..1000 {
            let id = nanoid!();
            elements.insert(
                id.clone(),
                Entity::from(Text::new(
                    id,
                    Pos2::new(
                        rand::random::<f32>() * 2000.0 - 1000.0,
                        rand::random::<f32>() * 2000.0 - 1000.0,
                    ),
                    format!("节点 {}", i),
                ))
                .into(),
            );
        }
        StageContext { elements }
    }

    pub fn elements(&self) -> &HashMap<String, Element> {
        &self.elements
    }

    pub fn add(&mut self, element: Element) {
        self.elements.insert(element.id().to_string(), element);
    }
}
