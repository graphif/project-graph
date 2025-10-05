import { Project, ProjectState, service } from "@/core/Project";
import { Settings } from "@/core/service/Settings";
import { deserialize, serialize } from "@graphif/serializer";
import { cn } from "@udecode/cn";
import { Delta, diff, patch } from "jsondiffpatch";
import _ from "lodash";
import { toast } from "sonner";

/**
 * 专门管理历史记录
 * 负责撤销、反撤销、重做等操作
 * 具有直接更改舞台状态的能力
 *
 * 切换文件，保存时都应该重置
 */
@service("historyManager")
export class HistoryManager {
  /**
   * 历史记录列表数组
   * 每一项都是变化的delta，不是完整的舞台数据！
   */
  deltas: Delta[] = [];
  /**
   * 历史记录列表数组上的一个指针
   *
   * []
   * -1      一开始数组为空时，指针指向 -1
   *
   * [a]
   *  0
   *
   * [a, b]
   *     1
   */
  currentIndex = -1;

  /**
   * 初始化的舞台数据
   */
  initialStage: Record<string, any>[] = [];

  // 在project加载完毕后调用
  constructor(private readonly project: Project) {
    this.initialStage = serialize(project.stage);
  }

  /**
   * 记录一步骤
   * @param file
   */
  recordStep() {
    console.time("recordStep");
    // console.trace("recordStep");
    // this.deltas = this.deltas.splice(this.currentIndex + 1);
    this.deltas.splice(this.currentIndex + 1);
    // 上面一行的含义：删除从 currentIndex + 1 开始的所有元素。
    // [a, b, c, d, e]
    //  0  1  2  3  4
    //        ^
    //  currentIndex = 2，去掉 3 4
    // 变成
    // [a, b, c]
    //  0  1  2
    //        ^

    // 也就是撤回了好几步(两步)之后再做修改，后面的曾经历史就都删掉了，相当于重开了一个分支。
    this.currentIndex++;
    // [a, b, c]
    //  0  1  2  3
    //           ^
    const prev = serialize(this.get(this.currentIndex - 1)); // [C stage]
    const current = serialize(this.project.stage); // [D stage]
    const patch_ = diff(prev, current); // [D stage] - [C stage] = [d]
    if (!patch_) {
      this.currentIndex--; // 没有变化，当指针回退到当前位置
      return;
    }

    this.deltas.push(patch_);
    // [a, b, c, d]
    //  0  1  2  3
    //           ^
    while (this.deltas.length > Settings.historySize) {
      // 当历史记录超过限制时，需要删除最旧的记录
      // 但是不能简单删除，因为get方法依赖于从initialStage开始应用所有delta
      // 所以我们需要将第一个delta合并到initialStage中，然后删除这个delta
      const firstDelta = _.cloneDeep(this.deltas[0]);
      this.initialStage = patch(_.cloneDeep(this.initialStage), firstDelta) as any;
      this.deltas.shift(); // 删除第一个delta [a]
      // [b, c, d]
      //  0  1  2  3
      //           ^

      this.currentIndex--;
      // [b, c, d]
      //  0  1  2
      //        ^
    }
    // 检测index是否越界
    if (this.currentIndex >= this.deltas.length) {
      this.currentIndex = this.deltas.length - 1;
    }
    this.project.state = ProjectState.Unsaved;
    console.timeEnd("recordStep");
  }

  /**
   * 撤销
   */
  undo() {
    // currentIndex 最小为 -1
    if (this.currentIndex >= 0) {
      this.currentIndex--;
      this.project.stage = this.get(this.currentIndex);
    }
    toast(
      <div className="flex text-sm">
        <span className="m-2 flex flex-col justify-center">
          <span>当前历史位置</span>
          <span className={cn(this.currentIndex === -1 && "text-red-500")}>{this.currentIndex + 1}</span>
        </span>
        <span className="m-2 flex flex-col justify-center">
          <span>当前历史长度</span>
          <span className={cn(this.deltas.length === Settings.historySize && "text-yellow-500")}>
            {this.deltas.length}
          </span>
        </span>
        <span className="m-2 flex flex-col justify-center">
          <span>限定历史长度</span>
          <span className="opacity-50">{Settings.historySize}</span>
        </span>
      </div>,
    );
  }

  /**
   * 反撤销
   */
  redo() {
    if (this.currentIndex < this.deltas.length - 1) {
      this.currentIndex++;
      this.project.stage = this.get(this.currentIndex);
    }
    toast(
      <div className="flex text-sm">
        <span className="m-2 flex flex-col justify-center">
          <span>当前历史位置</span>
          <span className={cn(this.currentIndex === this.deltas.length - 1 && "text-green-500")}>
            {this.currentIndex + 1}
          </span>
        </span>
        <span className="m-2 flex flex-col justify-center">
          <span>当前历史长度</span>
          <span className={cn(this.deltas.length === Settings.historySize && "text-yellow-500")}>
            {this.deltas.length}
          </span>
        </span>
        <span className="m-2 flex flex-col justify-center">
          <span>限定历史长度</span>
          <span className="opacity-50">{Settings.historySize}</span>
        </span>
      </div>,
    );
  }

  get(index: number) {
    // 处理边界情况：如果索引为负数，直接返回初始状态
    if (index < 0) {
      return deserialize(_.cloneDeep(this.initialStage), this.project);
    }

    // 先获取从0到index（包含index）的所有patch
    const deltas = _.cloneDeep(this.deltas.slice(0, index + 1));
    // 从initialStage开始应用patch，得到在index时刻的舞台序列化数据
    // const data = deltas.reduce((acc, delta) => {
    //   return patch(_.cloneDeep(acc), _.cloneDeep(delta)) as any;
    // }, _.cloneDeep(this.initialStage));
    let data = _.cloneDeep(this.initialStage); // 迭代这个data
    for (const delta of deltas) {
      data = patch(data, _.cloneDeep(delta)) as any;
    }
    // 反序列化得到舞台对象
    const stage = deserialize(data, this.project);
    return stage;
  }

  /**
   * 清空历史记录
   * 保存文件时调用，将当前状态设为新的初始状态
   */
  clearHistory() {
    this.deltas = [];
    this.currentIndex = -1;
    this.initialStage = serialize(this.project.stage);
    this.project.state = ProjectState.Saved;
    toast("历史记录已清空");
  }
}
