import { Project } from "@/core/Project";

export namespace ProgramFunctions {
  /**
   * 核心代码的获取变量值的方法
   * @param varName
   * @returns
   */
  export function getVarInCore(project: Project, varName: string): string {
    return project.autoCompute.variables.get(varName) || "NaN";
  }

  export function isHaveVar(project: Project, varName: string): boolean {
    return project.autoCompute.variables.has(varName);
  }

  /**
   * 设置变量，变量名不能是逻辑节点名称
   * @param args
   * @returns
   */
  export function setVar(project: Project, args: string[]): string[] {
    if (args.length !== 2) {
      return ["error", "参数数量错误，必须保证两个"];
    }
    const varName = args[0];
    if (varName.includes(" ")) {
      return ["error", "变量名不能包含空格"];
    }
    // 变量名不能以数字开头
    if (/^\d/.test(varName)) {
      return ["error", "变量名不能以数字开头"];
    }
    project.autoCompute.variables.set(varName, args[1]);
    return ["success"];
  }

  /**
   * 获取现存变量，如果没有，则返回NaN
   * @param args
   */
  export function getVar(project: Project, args: string[]): string[] {
    if (args.length === 1) {
      const varName = args[0];
      return [project.autoCompute.variables.get(varName) || "NaN"];
    }
    return ["error", "参数数量错误"];
  }
}
