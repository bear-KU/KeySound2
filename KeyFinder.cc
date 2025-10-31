#include <napi.h>
#include <thread>
#include <string>
#include <iostream>
#include <atomic>
#include <cstring>
#include <vector>

// open
#include <fcntl.h>
#include <unistd.h>
// directory
#include <dirent.h>
// input 
#include <linux/input.h>
#include <linux/input-event-codes.h>
// ioctl
#include <sys/ioctl.h>

// ビットマップ配列から bit 番目が立っているかを確認するマクロ
#define EXIST_BIT(bit, array)    ((array)[(bit) / 8] & (1 << ((bit) % 8)))

class KeyBoardDevice {
 private:
  std::string path;
  std::string name;

 public:
  KeyBoardDevice(std::string device_path) : path(device_path) {
    int fd = open(path.c_str(), O_RDONLY);
    if (fd < 0) {
      perror("Failed to open device");
      return;
    }

    char name_buf[256] = "Unknown";
    if (ioctl(fd, EVIOCGNAME(sizeof(name_buf)), name_buf) > 0) {
      name = std::string(name_buf);
    } 

    close(fd);
  }

  const std::string getPath() const { return path; }
  const std::string getName() const { return name; }
};

// デバイスファイルの情報からキーボードかどうかを判定
bool is_keyboard(std::string device_path) {
  bool has_keys = false;
  bool has_repeat = false;

  int fd = open(device_path.c_str(), O_RDONLY);
  if (fd < 0) {
    perror("Failed to open device");
    return false;
  }

  uint8_t key_bits[(KEY_MAX / 8) + 1];
  // キーコードビットを取得
  if (ioctl(fd, EVIOCGBIT(EV_KEY, sizeof(key_bits)), key_bits) < 0) {
    close(fd);
    return false;
  }

  close(fd);

  if (EXIST_BIT(KEY_A, key_bits) &&
      EXIST_BIT(KEY_Z, key_bits) &&
      EXIST_BIT(KEY_1, key_bits) &&
      EXIST_BIT(KEY_SPACE, key_bits)) 
  {
    return true;
  }
  return false;

}

// 同じ名前のキーボードデバイスがすでに存在するかを確認
int search_same_keyboard(const std::vector<KeyBoardDevice>& keyboards, const KeyBoardDevice& new_device) {
  int size = static_cast<int>(keyboards.size());

  for (size_t i = 0; i < size; ++i) {
    if (keyboards[i].getName() == new_device.getName()) {
      return static_cast<int>(i);
    }
  }
  return -1;
}

// デバイスパスからイベント番号を取得
int get_event_number(const std::string& device_path) {
  size_t pos = device_path.find("event");
  if (pos == std::string::npos) {
    return -1; // "event"が見つからない場合
  }

  std::string number_str = device_path.substr(pos + 5); // "event"の後の部分を取得
  return std::stoi(number_str); // 数字に変換して返す
}

// キーボードデバイスを追加（同じ名前のデバイスがある場合はイベント番号が小さい方を優先）
void add_keyboard_device(std::vector<KeyBoardDevice>& keyboards, const std::string& device_path) {
  KeyBoardDevice new_device(device_path);
  int same_device_index = search_same_keyboard(keyboards, new_device);
  
  // 同一デバイスが存在しない場合は追加 
  if (same_device_index == -1) {
    keyboards.push_back(KeyBoardDevice(device_path));
    return;
  }

  int same_device_number = get_event_number(keyboards[same_device_index].getPath());
  int new_device_number = get_event_number(device_path);
  
  if (new_device_number < same_device_number) {
    keyboards[same_device_index] = new_device;
  }
}

// キーボードデバイス一覧を取得
std::vector<KeyBoardDevice> find_keyboards(std::vector<std::string> devices) {
  std::vector<KeyBoardDevice> keyboards;

  for (const std::string dev_path: devices) {
    if (is_keyboard(dev_path)) {
      add_keyboard_device(keyboards, dev_path);
    }
  }

  return keyboards;

}

// /dev/input/配下のイベントデバイスを探す
std::vector<std::string> find_event_devices() {
  std::vector<std::string> devices;
  std::string dev_path = "/dev/input/";
  DIR *dir = opendir("/dev/input/");
  dirent *entry;

  std::printf("[ Searching for event devices in /dev/input/ ]\n");

  if (dir == NULL) {
    perror("Failed to open /dev/input/");
    return devices;
  }

  // ディレクトリ内のファイルを走査し，"event"を含む名前のデバイスを探す
  while ((entry = readdir(dir)) != NULL) {
    std::string name = entry->d_name;

    if (name.find("event") != std::string::npos) {
      devices.push_back(std::string(dev_path + name));
    }
  }

  closedir(dir);
  return devices;
}

Napi::Object KeyBoardDeviceToJS(Napi::Env env, const KeyBoardDevice& dev) {
  Napi::Object obj = Napi::Object::New(env);
  obj.Set("name", Napi::String::New(env, dev.getName()));
  obj.Set("path", Napi::String::New(env, dev.getPath()));
  return obj;
}

// findKeyboards() のエクスポート
Napi::Value FindKeyboards(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  std::vector<KeyBoardDevice> devices = find_keyboards();

  Napi::Array arr = Napi::Array::New(env, devices.size());
  for (size_t i = 0; i < devices.size(); ++i) {
    arr.Set(i, KeyBoardDeviceToJS(env, devices[i]));
  }
  return arr;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("findKeyboards", Napi::Function::New(env, FindKeyboards));
  return exports;
}

NODE_API_MODULE(keyboard, InitAll)