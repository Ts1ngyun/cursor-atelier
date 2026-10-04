use tauri_plugin_dialog::DialogExt;

#[tauri::command]
async fn save_cursor_file(
    app: tauri::AppHandle,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<bool, String> {
    let destination = app
        .dialog()
        .file()
        .set_file_name(file_name)
        .blocking_save_file();

    let Some(destination) = destination else {
        return Ok(false);
    };
    let path = destination
        .as_path()
        .ok_or_else(|| "所选位置不是本地文件路径。".to_string())?;

    std::fs::write(path, bytes).map_err(|error| format!("无法保存文件：{error}"))?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_cursor_file])
        .run(tauri::generate_context!())
        .expect("failed to run Cursor Atelier");
}
