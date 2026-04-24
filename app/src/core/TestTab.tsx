import React from "react";
import { Tab } from "./Tab";

export class TestTab extends Tab {
  constructor() {
    super({});
  }

  async init() {
    console.log("TestTab initialized");
  }

  render(): React.ReactNode {
    return null;
  }

  public getComponent(): React.ComponentType {
    const TestComponent = class extends React.Component {
      render() {
        return (
          <div className="bg-background text-foreground flex h-full w-full items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold">Test Tab</h1>
              <p className="text-muted-foreground mt-4 text-xl">This is a dynamically created test tab.</p>
            </div>
          </div>
        );
      }
    };
    TestComponent.displayName = "TestComponent";
    return TestComponent;
  }
}
