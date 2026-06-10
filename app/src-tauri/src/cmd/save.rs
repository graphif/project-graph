use serde::Deserialize;
use std::io::Write;

#[derive(Debug, Deserialize)]
pub struct AttachmentData {
    filename: String,
    data_base64: String,
}

#[tauri::command]
pub fn save_prg(
    path: String,
    stage_msgpack: String,
    tags_msgpack: String,
    reference_msgpack: String,
    metadata_msgpack: String,
    readme: Option<String>,
    attachments: Vec<AttachmentData>,
    thumbnail_base64: Option<String>,
) -> Result<(), String> {
    use base64::engine::general_purpose;
    use base64::Engine;
    use zip::write::FileOptions;
    use zip::CompressionMethod;
    use zip::ZipWriter;

    let mut zip_data = Vec::new();
    {
        let mut zip = ZipWriter::new(std::io::Cursor::new(&mut zip_data));
        let options = FileOptions::<()>::default().compression_method(CompressionMethod::Stored);

        zip.start_file("stage.msgpack", options)
            .map_err(|e| format!("zip stage.msgpack: {e}"))?;
        zip.write_all(
            &general_purpose::STANDARD
                .decode(&stage_msgpack)
                .map_err(|e| format!("decode stage_msgpack: {e}"))?,
        )
        .map_err(|e| format!("write stage.msgpack: {e}"))?;

        zip.start_file("tags.msgpack", options)
            .map_err(|e| format!("zip tags.msgpack: {e}"))?;
        zip.write_all(
            &general_purpose::STANDARD
                .decode(&tags_msgpack)
                .map_err(|e| format!("decode tags_msgpack: {e}"))?,
        )
        .map_err(|e| format!("write tags.msgpack: {e}"))?;

        zip.start_file("reference.msgpack", options)
            .map_err(|e| format!("zip reference.msgpack: {e}"))?;
        zip.write_all(
            &general_purpose::STANDARD
                .decode(&reference_msgpack)
                .map_err(|e| format!("decode reference_msgpack: {e}"))?,
        )
        .map_err(|e| format!("write reference.msgpack: {e}"))?;

        zip.start_file("metadata.msgpack", options)
            .map_err(|e| format!("zip metadata.msgpack: {e}"))?;
        zip.write_all(
            &general_purpose::STANDARD
                .decode(&metadata_msgpack)
                .map_err(|e| format!("decode metadata_msgpack: {e}"))?,
        )
        .map_err(|e| format!("write metadata.msgpack: {e}"))?;

        if let Some(readme_content) = &readme {
            zip.start_file("README.md", options)
                .map_err(|e| format!("zip README.md: {e}"))?;
            zip.write_all(readme_content.as_bytes())
                .map_err(|e| format!("write README.md: {e}"))?;
        }

        for attachment in &attachments {
            let file_path = format!("attachments/{}", attachment.filename);
            let data = general_purpose::STANDARD
                .decode(&attachment.data_base64)
                .map_err(|e| format!("decode {}: {e}", file_path))?;
            zip.start_file(&file_path, options)
                .map_err(|e| format!("zip {file_path}: {e}"))?;
            zip.write_all(&data)
                .map_err(|e| format!("write {file_path}: {e}"))?;
        }

        if let Some(thumb) = &thumbnail_base64 {
            let thumb_data = general_purpose::STANDARD
                .decode(thumb)
                .map_err(|e| format!("decode thumbnail: {e}"))?;
            zip.start_file("thumbnail.png", options)
                .map_err(|e| format!("zip thumbnail.png: {e}"))?;
            zip.write_all(&thumb_data)
                .map_err(|e| format!("write thumbnail.png: {e}"))?;
        }

        zip.finish()
            .map_err(|e| format!("finalize zip: {e}"))?;
    }

    std::fs::write(&path, &zip_data)
        .map_err(|e| format!("write file {path}: {e}"))?;

    Ok(())
}
