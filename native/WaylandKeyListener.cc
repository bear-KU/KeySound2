#include <napi.h> // Node-API header. VSCode IntelliSense may show a missing header warning, but it builds correctly.
#include <thread>
#include <string>
#include <iostream>
#include <atomic>
#include <cstring>
#include <vector>

// Linux specific headers
#include <linux/input.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <poll.h>
#include <sys/ioctl.h>

// Constants
const int POLL_TIMEOUT_MS = 100;

// Look up table for key codes to key names
const std::vector<std::string> keyCodeToName = {
    "RESERVED", "ESCAPE", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "MINUS", "EQUAL", "BACKSPACE", "TAB",
    "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "LEFTBRACE", "RIGHTBRACE", "ENTER", "LEFTCTRL",
    "A", "S", "D", "F", "G", "H", "J", "K", "L", "SEMICOLON", "APOSTROPHE", "GRAVE", "LEFTSHIFT",
    "BACKSLASH", "Z", "X", "C", "V", "B", "N", "M", "COMMA", "DOT", "SLASH", "RIGHTSHIFT",
    "KPASTERISK", "LEFTALT", "SPACE", "CAPSLOCK", "F1", "F2", "F3", "F4", "F5", "F6",
    "F7", "F8", "F9", "F10", "NUMLOCK", "SCROLLLOCK", "K7", "K8", "K9", "KPMINUS",
    "K4", "K5", "K6", "KPPLUS", "K1", "K2", "K3", "K0", "KPDOT", "UNKNOWN_84",
    "ZENKAKUHANKAKU", "102ND", "F11", "F12", "RO", "KATAKANA", "HIRAGANA", "HENKAN", "KATAKANAHIRAGANA",
    "MUHENKAN", "KPJPCOMMA", "KPENTER", "RIGHTCTRL", "KPSLASH", "SYSRQ", "RIGHTALT", "LINEFEED", "HOME",
    "UP", "PAGEUP", "LEFT", "RIGHT", "END", "DOWN", "PAGEDOWN", "INSERT", "DELETE",
    "MACRO", "MUTE", "VOLUMEDOWN", "VOLUMEUP", "POWER", "KPEQUAL", "KPPLUSMINUS", "PAUSE", "SCALE" // 120
    // Add more key codes as needed
};

// KeyListener Class Definition
class KeyListener : public Napi::ObjectWrap<KeyListener> {
public:
    KeyListener(const Napi::CallbackInfo& info);
    ~KeyListener();

    Napi::Value Start(const Napi::CallbackInfo& info);
    Napi::Value Stop(const Napi::CallbackInfo& info);

    static Napi::Object Init(Napi::Env env, Napi::Object exports);

private:
    void listenKeys();
    void closeDevice();
    bool checkIsKeyboard(int fd);

    std::string devicePath;
    std::thread workerThread;
    Napi::ThreadSafeFunction tsfn;
    std::atomic<bool> isRunning{false};
    std::atomic<int> fd{-1};
};

// --- Constructor & Destructor ---

KeyListener::KeyListener(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<KeyListener>(info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "Device path string expected").ThrowAsJavaScriptException();
        return;
    }
    this->devicePath = info[0].As<Napi::String>();
}

KeyListener::~KeyListener() {
    if (this->isRunning.load()) {
        this->isRunning.store(false);
        this->closeDevice();
        if (this->workerThread.joinable()) {
            this->workerThread.join();
        }
    }
}

// --- Internal Functions ---

void KeyListener::listenKeys() {
    int local_fd = open(this->devicePath.c_str(), O_RDONLY | O_NONBLOCK);
    if (local_fd < 0) {
        std::string msg = "Failed to open " + this->devicePath + ": " + strerror(errno);
        this->tsfn.NonBlockingCall([msg](Napi::Env env, Napi::Function cb) {
            Napi::Object err = Napi::Object::New(env);
            err.Set("type", "error");
            err.Set("message", msg);
            cb.Call({err});
        });
        this->isRunning.store(false);
        this->tsfn.Release();
        return;
    }

    if (!checkIsKeyboard(local_fd)) {
        std::string msg = "Device " + this->devicePath + " is not a keyboard (no EV_KEY).";
        this->tsfn.NonBlockingCall([msg](Napi::Env env, Napi::Function cb) {
            Napi::Object err = Napi::Object::New(env);
            err.Set("type", "error");
            err.Set("message", msg);
            cb.Call({err});
        });
        close(local_fd);
        this->isRunning.store(false);
        this->tsfn.Release();
        return;
    }

    this->fd.store(local_fd);

    struct pollfd pfd;
    pfd.fd = local_fd;
    pfd.events = POLLIN;

    input_event ev;
    bool released = false;
    auto releaseTSFN = [&]() {
        if (!released) {
            this->tsfn.Release();
            released = true;
        }
    };

    while (this->isRunning.load()) {
        int ret = poll(&pfd, 1, POLL_TIMEOUT_MS);
        if (ret > 0 && (pfd.revents & POLLIN)) {
            ssize_t bytes = read(local_fd, &ev, sizeof(ev));
            if (bytes == sizeof(ev) && ev.type == EV_KEY && ev.value >= 0 && ev.value <= 2) {
                napi_status status = this->tsfn.NonBlockingCall([ev](Napi::Env env, Napi::Function cb) {
                    Napi::Object event = Napi::Object::New(env);

                    std::string state;
                    if (ev.value == 1)      state = "DOWN";
                    else if (ev.value == 0) state = "UP";
                    else if (ev.value == 2) state = "REPEAT";

                    std::string name;
                    if (ev.code < static_cast<int>(keyCodeToName.size())) {
                        name = "KEY_" + keyCodeToName[ev.code];
                    } else {
                        name = "UNKNOWN_" + std::to_string(ev.code);
                    }

                    event.Set("state", state);
                    event.Set("name", name);
                    cb.Call({event});
                });
                if (status != napi_ok) break;
            }
        }
    }

    this->closeDevice();
    releaseTSFN();
}

void KeyListener::closeDevice() {
    int current_fd = this->fd.exchange(-1);
    if (current_fd != -1) {
        close(current_fd);
    }
}

bool KeyListener::checkIsKeyboard(int fd) {
    unsigned long evbit[(EV_MAX + 7) / 8] = {0};
    if (ioctl(fd, EVIOCGBIT(0, sizeof(evbit)), evbit) < 0)
        return false;
    return evbit[EV_KEY / 8] & (1 << (EV_KEY % 8));
}


// --- Public Methods ---

Napi::Value KeyListener::Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (this->isRunning.load()) {
        Napi::Error::New(env, "Listener already running").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Callback function expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Function cb = info[0].As<Napi::Function>();
    this->isRunning.store(true);

    this->tsfn = Napi::ThreadSafeFunction::New(env, cb, "KeyListenerCallback", 0, 1);
    this->workerThread = std::thread(&KeyListener::listenKeys, this);

    return env.Undefined();
}

Napi::Value KeyListener::Stop(const Napi::CallbackInfo& info) {
    if (!this->isRunning.load()) {
        return info.Env().Undefined();
    }

    this->isRunning.store(false);
    this->closeDevice();
    if (this->workerThread.joinable()) {
        this->workerThread.join();
    }
    return info.Env().Undefined();
}

// --- Module Registration ---

Napi::Object KeyListener::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "KeyListener", {
        InstanceMethod("start", &KeyListener::Start),
        InstanceMethod("stop", &KeyListener::Stop)
    });

    exports.Set("KeyListener", func);
    return exports;
}

Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return KeyListener::Init(env, exports);
}

NODE_API_MODULE(keylistener, InitModule)
