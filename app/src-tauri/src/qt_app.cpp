#include "qt_app.h"
#include <QWebEngineProfile>
#include <QWebEnginePage>
#include <QWebChannel>
#include <QWebEngineSettings>
#include <QUrl>
#include <QFile>
#include <QWebEngineScript>
#include <QWebEngineScriptCollection>
#include <QTimer>
#include <QApplication>
#include <cstdio>
#include <QtGui/QSurfaceFormat>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include <QDir>
#include <vector>
#include <string>
#include <QWebEngineUrlScheme>
#include <QWebEngineUrlSchemeHandler>
#include <QWebEngineUrlRequestJob>
#include <QBuffer>
#include <QMimeDatabase>
// Includes the generated CXX-Qt header for TauriIpcBridge
#include "project-graph/src/ipc_bridge.cxxqt.h"

QApplication *g_app = nullptr;
QWebEngineView *g_view = nullptr;

class TauriSchemeHandler : public QWebEngineUrlSchemeHandler
{
public:
    explicit TauriSchemeHandler(TauriIpcBridge *bridge, QObject *parent = nullptr)
        : QWebEngineUrlSchemeHandler(parent), m_bridge(bridge) {}

    void requestStarted(QWebEngineUrlRequestJob *job) override
    {
        QUrl url = job->requestUrl();
        QString path = url.path();

        printf("DEBUG: TauriSchemeHandler requestStarted for URL: %s, path: %s\n",
               url.toString().toUtf8().constData(), path.toUtf8().constData());

        if (path.isEmpty() || path == "/")
        {
            path = "index.html";
        }

        QByteArray data = m_bridge->get_tauri_asset(path);
        printf("DEBUG: TauriSchemeHandler loaded %d bytes for path: %s\n", data.size(), path.toUtf8().constData());

        if (data.isEmpty() && path != "index.html" && path != "index.html/")
        {
            printf("DEBUG: TauriSchemeHandler failing job for: %s\n", path.toUtf8().constData());
            job->fail(QWebEngineUrlRequestJob::UrlNotFound);
            return;
        }

        QMimeDatabase db;
        QString mime = db.mimeTypeForFile(path).name();
        // Fallbacks for common web types
        if (path.endsWith(QStringLiteral(".js")))
            mime = QStringLiteral("application/javascript");
        else if (path.endsWith(QStringLiteral(".css")))
            mime = QStringLiteral("text/css");
        else if (path.endsWith(QStringLiteral(".wasm")))
            mime = QStringLiteral("application/wasm");
        else if (path.endsWith(QStringLiteral(".html")))
            mime = QStringLiteral("text/html");
        else if (path.endsWith(QStringLiteral(".svg")))
            mime = QStringLiteral("image/svg+xml");

        QBuffer *buffer = new QBuffer(job);
        buffer->setData(data);
        buffer->open(QIODevice::ReadOnly);

        printf("DEBUG: TauriSchemeHandler replying with MIME type: %s\n", mime.toUtf8().constData());
        job->reply(mime.toUtf8(), buffer);
    }

private:
    TauriIpcBridge *m_bridge;
};

extern "C"
{
    bool tick_qt_app()
    {
        if (g_app)
        {
            g_app->processEvents();
            // Return true if windows are still open
            return !QApplication::allWindows().isEmpty();
        }
        return false;
    }

    void qt_evaluate_js(const QString &js)
    {
        if (!g_view)
            return;
        // Driving from same thread now
        if (g_view && g_view->page())
        {
            g_view->page()->runJavaScript(js);
        }
    }

    void init_qt_app(const QString &app_data_path)
    {
        if (!g_app)
        {
            // 强制使用单线程的 basic 渲染循环，修复 processEvents 导致的黑屏问题
            qputenv("QSG_RENDER_LOOP", "basic");

            printf("DEBUG: Starting init_qt_app with path: %s\n", app_data_path.toUtf8().constData());

            // 1. Read argv.json from appdata
            QString argvJsonPath = QDir(app_data_path).filePath("argv.json");
            QFile file(argvJsonPath);
            QStringList extraArgs;

            if (!file.exists())
            {
                // 如果文件不存在，自动创建目录并写入默认值
                QDir().mkpath(app_data_path);
                if (file.open(QIODevice::WriteOnly))
                {
                    QJsonArray defaultArgs = {
                        "--disable-gpu-vsync",
                        "--disable-frame-rate-limit",
                        "--ignore-gpu-blocklist",
                        "--enable-gpu-rasterization",
                        "--enable-zero-copy",
                        "--enable-features=VaapiVideoDecoder,VaapiOnNvidiaGPUs,AcceleratedVideoDecodeLinuxGL,AcceleratedVideoDecodeLinuxZeroCopyGL,UseOzonePlatform",
                        "--ozone-platform-hint=auto",
                        "--enable-wayland-ime",
                        "--disable-gpu-sandbox",
                        "--no-sandbox",
                        "--remote-debugging-port=9223"};
                    QJsonDocument doc(defaultArgs);
                    file.write(doc.toJson());
                    file.close();
                    printf("DEBUG: Created default argv.json at %s\n", argvJsonPath.toUtf8().constData());
                }
            }

            if (file.open(QIODevice::ReadOnly))
            {
                QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
                if (doc.isArray())
                {
                    QJsonArray arr = doc.array();
                    for (const auto &val : arr)
                    {
                        if (val.isString())
                        {
                            extraArgs << val.toString();
                        }
                    }
                }
                file.close();
            }
            else
            {
                printf("DEBUG: No argv.json found, using hardcoded defaults\n");
                extraArgs << "--disable-gpu-vsync" << "--disable-frame-rate-limit" << "--ignore-gpu-blocklist"
                          << "--enable-gpu-rasterization" << "--enable-zero-copy"
                          << "--enable-features=VaapiVideoDecoder,VaapiOnNvidiaGPUs,AcceleratedVideoDecodeLinuxGL,AcceleratedVideoDecodeLinuxZeroCopyGL,UseOzonePlatform"
                          << "--ozone-platform-hint=auto" << "--enable-wayland-ime" << "--disable-gpu-sandbox" << "--no-sandbox"
                          << "--disable-web-security" << "--allow-file-access-from-files"
                          << "--remote-debugging-port=9223";
            }

            // Force security disabling if not present to ensure fetch works
            if (!extraArgs.contains("--disable-web-security"))
                extraArgs << "--disable-web-security";
            if (!extraArgs.contains("--allow-file-access-from-files"))
                extraArgs << "--allow-file-access-from-files";

            // Force --no-sandbox if not present
            if (!extraArgs.contains("--no-sandbox"))
                extraArgs << "--no-sandbox";
            if (!extraArgs.contains("--disable-gpu-sandbox"))
                extraArgs << "--disable-gpu-sandbox";

            // 2. Set Chromium flags
            QString chromiumFlags = extraArgs.join(" ");
            qputenv("QTWEBENGINE_CHROMIUM_FLAGS", chromiumFlags.toUtf8());
            printf("DEBUG: Chromium Flags: %s\n", chromiumFlags.toUtf8().constData());

            // 3. Prepare argv for QApplication
            static std::vector<std::string> argStrings;
            static std::vector<char *> argv;

            argStrings.clear();
            argv.clear();

            argStrings.push_back("project-graph");
            for (const QString &s : extraArgs)
            {
                argStrings.push_back(s.toStdString());
            }

            for (std::string &s : argStrings)
            {
                argv.push_back(&s[0]);
            }
            argv.push_back(nullptr);

            int argc = argv.size() - 1;

            printf("DEBUG: Setting default QSurfaceFormat\n");
            // Disable VSync at the OpenGL level
            QSurfaceFormat format = QSurfaceFormat::defaultFormat();
            format.setSwapInterval(0);
            QSurfaceFormat::setDefaultFormat(format);

            // Force Shared Contexts - WebEngine needs this
            QCoreApplication::setAttribute(Qt::AA_ShareOpenGLContexts);

            QWebEngineUrlScheme tauriScheme("tauri");
            tauriScheme.setFlags(QWebEngineUrlScheme::SecureScheme | QWebEngineUrlScheme::LocalAccessAllowed | QWebEngineUrlScheme::ContentSecurityPolicyIgnored);
            tauriScheme.setSyntax(QWebEngineUrlScheme::Syntax::Host);
            tauriScheme.setDefaultPort(80); // Just in case
            QWebEngineUrlScheme::registerScheme(tauriScheme);

            printf("DEBUG: About to create QApplication\n");
            g_app = new QApplication(argc, argv.data());
            printf("DEBUG: QApplication created successfully\n");

            printf("DEBUG: Setting up WebEngineView...\n");
            g_view = new QWebEngineView();
            g_view->setWindowTitle("Project Graph");

            // 确保网页本身没有背景色时显示白色而不是透明/黑色
            g_view->page()->setBackgroundColor(Qt::white);

            // Allow cross-origin requests and local file access
            g_view->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);
            g_view->settings()->setAttribute(QWebEngineSettings::LocalContentCanAccessFileUrls, true);
            g_view->settings()->setAttribute(QWebEngineSettings::AllowRunningInsecureContent, true);

            printf("DEBUG: QWebEngineView created and settings configured\n");

            QString zoomPath = QDir(app_data_path).filePath("zoomFactor.txt");
            QFile zoomFile(zoomPath);
            if (!zoomFile.exists())
            {
                QDir().mkpath(app_data_path);
                if (zoomFile.open(QIODevice::WriteOnly))
                {
                    zoomFile.write("1.0\n");
                    zoomFile.close();
                }
            }
            if (zoomFile.open(QIODevice::ReadOnly))
            {
                QByteArray zoomBytes = zoomFile.readAll();
                bool ok = false;
                double zoomFactor = QString::fromUtf8(zoomBytes).trimmed().toDouble(&ok);
                if (ok && zoomFactor > 0.0)
                {
                    g_view->setZoomFactor(zoomFactor);
                }
                else
                {
                    printf("DEBUG: Invalid zoomFactor.txt value, using default 1.0\n");
                    g_view->setZoomFactor(1.0);
                }
            }

            QWebChannel *channel = new QWebChannel(g_view->page());

            // Create the CxxQt object
            TauriIpcBridge *ipc_bridge = new TauriIpcBridge(g_view);

            // Install custom url scheme handler for tauri://
            g_view->page()->profile()->installUrlSchemeHandler(QByteArrayLiteral("tauri"), new TauriSchemeHandler(ipc_bridge, g_view->page()->profile()));

            // Register it to the web channel so JS can access it over qt.webChannelTransport
            channel->registerObject(QStringLiteral("ipc_bridge"), ipc_bridge);
            g_view->page()->setWebChannel(channel);

            // Inspector not enabled via attributes in Qt6, will use default profile port instead.

            // Inject qwebchannel.js before anything else
            QWebEngineScript qwebchannelScript;
            qwebchannelScript.setInjectionPoint(QWebEngineScript::DocumentCreation);
            qwebchannelScript.setWorldId(QWebEngineScript::MainWorld);
            qwebchannelScript.setName(QStringLiteral("qwebchannel.js"));

            QFile qwebchannelFile(":/qtwebchannel/qwebchannel.js");
            if (qwebchannelFile.open(QIODevice::ReadOnly))
            {
                qwebchannelScript.setSourceCode(QString::fromUtf8(qwebchannelFile.readAll()));
                g_view->page()->scripts().insert(qwebchannelScript);
            }

            QWebEngineScript tauriInitScript;
            tauriInitScript.setInjectionPoint(QWebEngineScript::DocumentCreation);
            tauriInitScript.setWorldId(QWebEngineScript::MainWorld);
            tauriInitScript.setName(QStringLiteral("tauri-init.js"));
            tauriInitScript.setSourceCode(R"(
                console.log('Tauri IPC init starting...');
                window.__IS_QT_RENDERER__ = true;
                window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
                
                // Mock window properties often used by tauri/plugins
                window.__TAURI_OS_PLUGIN_INTERNALS__ = {};
                window.__TAURI_FS_PLUGIN_INTERNALS__ = {};
                window.__TAURI_DIALOG_PLUGIN_INTERNALS__ = {};
                window.__TAURI_SHELL_PLUGIN_INTERNALS__ = {};

                const proxyOsInternals = window.opener?.__TAURI_OS_PLUGIN_INTERNALS__
                    ?? window.parent?.__TAURI_OS_PLUGIN_INTERNALS__
                    ?? window.top?.__TAURI_OS_PLUGIN_INTERNALS__;
                if (proxyOsInternals && Object.keys(window.__TAURI_OS_PLUGIN_INTERNALS__).length === 0) {
                    window.__TAURI_OS_PLUGIN_INTERNALS__ =
                        typeof structuredClone === "function"
                            ? structuredClone(proxyOsInternals)
                            : JSON.parse(JSON.stringify(proxyOsInternals));
                }
                
                // v2 needs metadata and plugins
                window.__TAURI_INTERNALS__.plugins = window.__TAURI_INTERNALS__.plugins || {};
                window.__TAURI_INTERNALS__.metadata = window.__TAURI_INTERNALS__.metadata || {
                    windows: [{ label: 'main', isFocused: true }],
                    currentWindow: { label: 'main' }
                };
                
                // v2 needs transformCallback and registerCallback
                window.__TAURI_INTERNALS__.transformCallback = (callback, once) => {
                    const identifier = Math.floor(Math.random() * 1000000);
                    window[`_${identifier}`] = (data) => {
                        if (once) delete window[`_${identifier}`];
                        callback(data);
                    };
                    return identifier;
                };
                
                window.__TAURI_INTERNALS__.registerCallback = (callback, once) => {
                    const identifier = Math.floor(Math.random() * 1000000);
                    window[`_${identifier}`] = (data) => {
                        if (once) delete window[`_${identifier}`];
                        callback(data);
                    };
                    return identifier;
                };

                const syncOsInternalsFromProxy = async () => {
                    const snapshot = await window.__TAURI_INTERNALS__.invoke("__qt_os_internals_snapshot");
                    if (snapshot && typeof snapshot === "object") {
                        window.__TAURI_OS_PLUGIN_INTERNALS__ = snapshot;
                    }
                };

                let channelReady = false;
                let pendingInvokes = [];
                let reqIdCounter = 0;
                let promiseMap = new Map();
                const encodeUint8ArrayToJsExpr = (arr) => new Promise((resolve, reject) => {
                    try {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = String(reader.result || "");
                            const parts = result.split(",");
                            const base64 = parts[1] || "";
                            resolve(`Uint8Array.from(atob('${base64}'), c => c.charCodeAt(0))`);
                        };
                        reader.onerror = () => reject(reader.error || new Error("Failed to read Uint8Array"));
                        reader.readAsDataURL(new Blob([arr]));
                    } catch (e) {
                        reject(e);
                    }
                });

                window.__TAURI_INTERNALS__.invoke = function(cmd, args, headers) {
                    console.log('Invoke called:', cmd, args, headers);
                    return new Promise((resolve, reject) => {
                        const reqId = String(++reqIdCounter);
                        promiseMap.set(reqId, { resolve, reject });
                        
                        if (channelReady) {
                            if (args instanceof Uint8Array) {
                                encodeUint8ArrayToJsExpr(args)
                                    .then((jsExpr) => {
                                        window.ipc_bridge.invoke_tauri(
                                            reqId,
                                            cmd,
                                            jsExpr,
                                            JSON.stringify(headers || {})
                                        );
                                    })
                                    .catch((e) => {
                                        promiseMap.delete(reqId);
                                        reject(e);
                                    });
                            } else {
                                try {
                                    window.ipc_bridge.invoke_tauri(
                                        reqId,
                                        cmd,
                                        JSON.stringify(args || {}),
                                        JSON.stringify(headers || {})
                                    );
                                } catch (e) {
                                    promiseMap.delete(reqId);
                                    reject(e);
                                }
                            }
                        } else {
                            pendingInvokes.push({ reqId, cmd, args, headers });
                        }
                    });
                };

                window.__TAURI_IPC_RESOLVE__ = function(reqId, ok, payload) {
                    console.log('IPC Resolve:', reqId, ok, payload);
                    if (promiseMap.has(reqId)) {
                        const { resolve, reject } = promiseMap.get(reqId);
                        promiseMap.delete(reqId);
                        
                        if (ok) {
                            resolve(payload);
                        } else {
                            reject(payload);
                        }
                    }
                };

                new QWebChannel(qt.webChannelTransport, function(channel) {
                    console.log('WebChannel ready');
                    window.ipc_bridge = channel.objects.ipc_bridge;
                    
                    channelReady = true;
                    
                    pendingInvokes.forEach(req => {
                        if (req.args instanceof Uint8Array) {
                            encodeUint8ArrayToJsExpr(req.args)
                                .then((jsExpr) => {
                                    window.ipc_bridge.invoke_tauri(
                                        req.reqId,
                                        req.cmd,
                                        jsExpr,
                                        JSON.stringify(req.headers || {})
                                    );
                                })
                                .catch((e) => {
                                    window.__TAURI_IPC_RESOLVE__(req.reqId, false, e.toString());
                                });
                        } else {
                            try {
                                window.ipc_bridge.invoke_tauri(
                                    req.reqId,
                                    req.cmd,
                                    JSON.stringify(req.args || {}),
                                    JSON.stringify(req.headers || {})
                                );
                            } catch (e) {
                                window.__TAURI_IPC_RESOLVE__(req.reqId, false, e.toString());
                            }
                        }
                    });
                    pendingInvokes = [];

                    window.dispatchEvent(new Event('tauri-ipc-ready'));
                    syncOsInternalsFromProxy();
                });
                console.log('Tauri IPC init finished');
            )");
            g_view->page()->scripts().insert(tauriInitScript);

            printf("DEBUG: Loading URL...\n");
#ifdef NDEBUG
            printf("DEBUG: Loading tauri://localhost\n");
            g_view->load(QUrl(QStringLiteral("tauri://localhost")));
#else
            printf("DEBUG: Loading http://localhost:1420\n");
            g_view->load(QUrl(QStringLiteral("http://localhost:1420")));
#endif
            g_view->resize(1024, 768);
            g_view->show();
            g_view->raise();
            printf("DEBUG: init_qt_app finished, window show() called\n");
        }
    }
}

int run_qt_app()
{
    // init_qt_app is now called from Rust with the app_data_path
    if (!g_app)
        return -1;
    return g_app->exec();
}
