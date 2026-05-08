#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn app_runtime() -> &'static str {
    "tauri-desktop"
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_runtime])
        .run(tauri::generate_context!())
        .expect("failed to run Inkwell 2 desktop app");
}
