#pragma once

#include <QApplication>
#include <QWebEngineView>
#include <QWebChannel>
#include <QString>
#include <QByteArray>

int run_qt_app();

// Convert a QString to QByteArray preserving all byte values (Latin-1).
// Used by ipc_bridge.rs to recover binary data sent from JS.
QByteArray qt_qstring_to_latin1(const QString &s);

// Convert a QByteArray to a compact JSON array string "[0,1,255,…]".
// Used by ipc_bridge.rs to forward binary data through Tauri events.
QString qt_qbytearray_to_json_array(const QByteArray &data);

extern "C"
{
    void qt_evaluate_js(const QString &js);
    void init_qt_app(const QString &app_data_path);
    bool tick_qt_app();
}
