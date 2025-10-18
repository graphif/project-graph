import { readFile } from "@tauri-apps/plugin-fs";
import { Settings } from "../Settings";

/**
 * 播放音效的服务
 * 这个音效播放服务是用户自定义的
 */
export namespace SoundService {
  export namespace play {
    // 开始切断
    export function cuttingLineStart() {
      loadAndPlaySound(Settings.cuttingLineStartSoundFile);
    }

    // 开始连接
    export function connectLineStart() {
      loadAndPlaySound(Settings.connectLineStartSoundFile);
    }

    // 连接吸附到目标点
    export function connectFindTarget() {
      loadAndPlaySound(Settings.connectFindTargetSoundFile);
    }

    // 自动保存执行特效
    // 自动备份执行特效

    // 框选增加物体音效

    // 切断特效声音
    export function cuttingLineRelease() {
      loadAndPlaySound(Settings.cuttingLineReleaseSoundFile);
    }
    // 连接成功

    // 对齐吸附音效
    export function alignAndAttach() {
      loadAndPlaySound(Settings.alignAndAttachSoundFile);
    }
    // 鼠标进入按钮区域的声音
    export function mouseEnterButton() {
      loadAndPlaySound(Settings.uiButtonEnterSoundFile);
    }
    export function mouseClickButton() {
      loadAndPlaySound(Settings.uiButtonClickSoundFile);
    }
    export function mouseClickSwitchButtonOn() {
      loadAndPlaySound(Settings.uiSwitchButtonOnSoundFile);
    }
    export function mouseClickSwitchButtonOff() {
      loadAndPlaySound(Settings.uiSwitchButtonOffSoundFile);
    }
  }

  const audioContext = new window.AudioContext();

  export function playSoundByFilePath(filePath: string) {
    loadAndPlaySound(filePath);
  }

  async function loadAndPlaySound(filePath: string) {
    if (!Settings.soundEnabled) {
      return;
    }
    if (filePath.trim() === "") {
      return;
    }

    // 解码音频数据
    const audioBuffer = await getAudioBufferByFilePath(filePath); // 消耗0.1秒
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination); // 小概率消耗0.01秒
    source.start(0);
  }

  const pathAudioBufferMap = new Map<string, AudioBuffer>();

  async function getAudioBufferByFilePath(filePath: string) {
    // 先从缓存中获取音频数据
    const result = pathAudioBufferMap.get(filePath);
    if (result) {
      return result;
    }

    // 缓存中没有

    // 读取文件为字符串
    const uint8Array = await readFile(filePath);

    // 创建 ArrayBuffer
    const arrayBuffer = uint8Array.buffer as ArrayBuffer;

    // 解码音频数据
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 加入缓存
    pathAudioBufferMap.set(filePath, audioBuffer);

    return audioBuffer;
  }
}
