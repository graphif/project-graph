use std::{
    cell::Cell,
    ffi::OsString,
    os::windows::ffi::OsStringExt,
    ptr,
};

use windows::{
    core::{implement, BOOL},
    Win32::{
        Foundation::{HWND, LPARAM, POINTL},
        System::{
            Com::{IDataObject, DVASPECT_CONTENT, FORMATETC, TYMED_HGLOBAL},
            Memory::{GlobalLock, GlobalUnlock},
            Ole::{
                IDropTarget, IDropTarget_Impl, RegisterDragDrop, ReleaseStgMedium, RevokeDragDrop,
                CF_HDROP, DROPEFFECT, DROPEFFECT_COPY, DROPEFFECT_NONE,
            },
            SystemServices::MODIFIERKEYS_FLAGS,
        },
        UI::{
            Shell::{DragFinish, DragQueryFileW, HDROP},
            WindowsAndMessaging::EnumChildWindows,
        },
    },
};
use tauri::{Emitter, Manager, AppHandle};

const CF_UNICODETEXT: u16 = 13;

#[derive(Clone, serde::Serialize)]
struct PgDragDropPayload {
    kind: String,
    paths: Vec<String>,
    text: Option<String>,
    x: f64,
    y: f64,
}

#[implement(IDropTarget)]
struct PgDropTarget {
    app: AppHandle,
    has_valid_data: Cell<bool>,
}

fn has_hdrop(pdata_obj: &IDataObject) -> bool {
    let format = FORMATETC {
        cfFormat: CF_HDROP.0,
        ptd: ptr::null_mut(),
        dwAspect: DVASPECT_CONTENT.0,
        lindex: -1,
        tymed: TYMED_HGLOBAL.0 as u32,
    };
    unsafe { pdata_obj.QueryGetData(&format) }.is_ok()
}

fn has_text(pdata_obj: &IDataObject) -> bool {
    let format = FORMATETC {
        cfFormat: CF_UNICODETEXT,
        ptd: ptr::null_mut(),
        dwAspect: DVASPECT_CONTENT.0,
        lindex: -1,
        tymed: TYMED_HGLOBAL.0 as u32,
    };
    unsafe { pdata_obj.QueryGetData(&format) }.is_ok()
}

fn read_hdrop(pdata_obj: &IDataObject) -> Option<Vec<String>> {
    let format = FORMATETC {
        cfFormat: CF_HDROP.0,
        ptd: ptr::null_mut(),
        dwAspect: DVASPECT_CONTENT.0,
        lindex: -1,
        tymed: TYMED_HGLOBAL.0 as u32,
    };
    let medium = unsafe { pdata_obj.GetData(&format) }.ok()?;
    let hdrop = unsafe { HDROP(medium.u.hGlobal.0 as _) };
    let count = unsafe { DragQueryFileW(hdrop, 0xFFFFFFFF, None) };
    let mut paths = Vec::with_capacity(count as usize);
    for i in 0..count {
        let len = unsafe { DragQueryFileW(hdrop, i, None) } as usize;
        let mut buf = vec![0u16; len + 1];
        unsafe { DragQueryFileW(hdrop, i, Some(&mut buf)) };
        let os_str = OsString::from_wide(&buf[..len]);
        paths.push(os_str.to_string_lossy().into_owned());
    }
    unsafe { DragFinish(hdrop) };
    Some(paths)
}

fn read_text(pdata_obj: &IDataObject) -> Option<String> {
    let format = FORMATETC {
        cfFormat: CF_UNICODETEXT,
        ptd: ptr::null_mut(),
        dwAspect: DVASPECT_CONTENT.0,
        lindex: -1,
        tymed: TYMED_HGLOBAL.0 as u32,
    };
    let mut medium = unsafe { pdata_obj.GetData(&format) }.ok()?;
    unsafe {
        let ptr = GlobalLock(medium.u.hGlobal) as *const u16;
        if ptr.is_null() {
            return None;
        }
        let mut len = 0;
        while *ptr.add(len) != 0 {
            len += 1;
        }
        let slice = std::slice::from_raw_parts(ptr, len);
        let text = String::from_utf16_lossy(slice);
        let _ = GlobalUnlock(medium.u.hGlobal);
        ReleaseStgMedium(ptr::addr_of_mut!(medium));
        Some(text)
    }
}

impl PgDropTarget {
    fn emit_event(&self, kind: &str, paths: Vec<String>, text: Option<String>, x: f64, y: f64) {
        let _ = self.app.emit("pg-drag-drop", PgDragDropPayload {
            kind: kind.to_string(),
            paths,
            text,
            x,
            y,
        });
    }
}

#[allow(non_snake_case)]
impl IDropTarget_Impl for PgDropTarget_Impl {
    fn DragEnter(
        &self,
        pdata_obj: windows_core::Ref<'_, IDataObject>,
        _grf_key_state: MODIFIERKEYS_FLAGS,
        pt: &POINTL,
        pdw_effect: *mut DROPEFFECT,
    ) -> windows::core::Result<()> {
        let obj = pdata_obj.as_ref().unwrap();
        let hdrop = has_hdrop(obj);
        let text = !hdrop && has_text(obj);
        let valid = hdrop || text;
        self.has_valid_data.set(valid);

        if valid {
            unsafe { *pdw_effect = DROPEFFECT_COPY };
            self.emit_event("enter", Vec::new(), None, pt.x as f64, pt.y as f64);
        } else {
            unsafe { *pdw_effect = DROPEFFECT_NONE };
        }
        Ok(())
    }

    fn DragOver(
        &self,
        _grf_key_state: MODIFIERKEYS_FLAGS,
        pt: &POINTL,
        pdw_effect: *mut DROPEFFECT,
    ) -> windows::core::Result<()> {
        if self.has_valid_data.get() {
            unsafe { *pdw_effect = DROPEFFECT_COPY };
            self.emit_event("over", Vec::new(), None, pt.x as f64, pt.y as f64);
        } else {
            unsafe { *pdw_effect = DROPEFFECT_NONE };
        }
        Ok(())
    }

    fn DragLeave(&self) -> windows::core::Result<()> {
        if self.has_valid_data.get() {
            self.emit_event("leave", Vec::new(), None, 0.0, 0.0);
            self.has_valid_data.set(false);
        }
        Ok(())
    }

    fn Drop(
        &self,
        pdata_obj: windows_core::Ref<'_, IDataObject>,
        _grf_key_state: MODIFIERKEYS_FLAGS,
        pt: &POINTL,
        _pdw_effect: *mut DROPEFFECT,
    ) -> windows::core::Result<()> {
        if !self.has_valid_data.get() {
            return Ok(());
        }

        let obj = pdata_obj.as_ref().unwrap();
        if let Some(paths) = read_hdrop(obj) {
            self.emit_event("drop", paths, None, pt.x as f64, pt.y as f64);
        } else if let Some(text) = read_text(obj) {
            self.emit_event("drop", Vec::new(), Some(text), pt.x as f64, pt.y as f64);
        }

        self.has_valid_data.set(false);
        Ok(())
    }
}

struct EnumContext {
    app: AppHandle,
}

unsafe extern "system" fn enum_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let ctx = &*(lparam.0 as *const EnumContext);
    let target: IDropTarget = PgDropTarget {
        app: ctx.app.clone(),
        has_valid_data: Cell::new(false),
    }
    .into();
    let _ = RevokeDragDrop(hwnd);
    if let Err(e) = RegisterDragDrop(hwnd, &target) {
        println!("[custom_drag_drop] RegisterDragDrop failed for {hwnd:?}: {e}");
    }
    BOOL(1)
}

pub fn install(app: AppHandle) {
    let window = match app.get_webview_window("main") {
        Some(w) => w,
        None => {
            println!("[custom_drag_drop] main window not found, skipping");
            return;
        }
    };
    let main_hwnd = match window.hwnd() {
        Ok(h) => h,
        Err(e) => {
            println!("[custom_drag_drop] failed to get hwnd: {e}");
            return;
        }
    };

    let ctx = EnumContext { app: app.clone() };
    let ctx_ptr: *const EnumContext = &ctx;

    unsafe {
        let _ = EnumChildWindows(
            Some(main_hwnd),
            Some(enum_callback),
            LPARAM(ctx_ptr as _),
        );
    }
}
