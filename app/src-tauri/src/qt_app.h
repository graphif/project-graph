#pragma once

#include <QApplication>
#include <QWebEngineView>
#include <QWebChannel>
#include <QString>

int run_qt_app();

extern "C"
{
    void qt_evaluate_js(const QString &js);
    void init_qt_app(const QString &app_data_path);
    bool tick_qt_app();
}
