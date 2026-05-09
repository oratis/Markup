// Prevents additional console window on Windows in release; not needed on macOS but harmless.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    markup_lib::run()
}
