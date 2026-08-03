import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import {
  Container,
  type Component,
} from "@earendil-works/pi-tui";
import {
  wrapToolDefinition,
  type TimerRegistry,
  type ToolFamily,
} from "./tool-renderer.js";

type AnyToolDefinition = ToolDefinition<any, any, any>;

const STYLED_TOOL_EXECUTION = Symbol.for(
  "pi-tool-renderer.styled-execution",
);
const INTERCEPTOR_STATE = Symbol.for(
  "pi-tool-renderer.container-interceptor-state",
);

interface ToolExecutionComponent extends Component {
  toolName: string;
  toolDefinition: AnyToolDefinition;
  callRendererComponent?: Component;
  resultRendererComponent?: Component;
  updateDisplay(): void;
  [STYLED_TOOL_EXECUTION]?: true;
}

interface InterceptorState {
  timers: TimerRegistry;
  style: typeof styleToolExecution;
}

type InterceptedContainerPrototype = typeof Container.prototype & {
  [INTERCEPTOR_STATE]?: InterceptorState;
};

function isToolExecutionComponent(
  component: Component,
): component is ToolExecutionComponent {
  const candidate = component as Partial<ToolExecutionComponent>;
  return (
    typeof candidate.toolName === "string" &&
    typeof candidate.updateDisplay === "function" &&
    typeof candidate.toolDefinition === "object" &&
    candidate.toolDefinition !== null
  );
}

function familyFor(toolName: string): ToolFamily {
  return toolName === "bash" ? "bash" : "standard";
}

/**
 * Replace only the renderer used by one on-screen tool execution. The registry
 * definition remains untouched, so the tool owner's schema and execution path
 * continue to be authoritative.
 */
export function styleToolExecution(
  component: Component,
  timers: TimerRegistry,
): boolean {
  if (
    !isToolExecutionComponent(component) ||
    component[STYLED_TOOL_EXECUTION]
  ) {
    return false;
  }

  component[STYLED_TOOL_EXECUTION] = true;
  const originalDefinition = component.toolDefinition;
  component.toolDefinition = wrapToolDefinition(
    originalDefinition,
    familyFor(component.toolName),
    timers,
  );

  // The component rendered once in its constructor. Rebuild both slots with
  // the wrapped definition before it is attached to the transcript.
  component.callRendererComponent = undefined;
  component.resultRendererComponent = undefined;
  component.updateDisplay();
  return true;
}

/**
 * Pi has no public hook for decorating definitions owned by other extensions.
 * Tool executions are public TUI Components, though, and are attached through
 * Container.addChild. Intercepting that boundary lets us decorate the actual
 * definition supplied by Pi without re-registering or executing the tool.
 */
export function installToolRendererInterceptor(
  timers: TimerRegistry,
): void {
  const prototype = Container.prototype as InterceptedContainerPrototype;
  const installed = prototype[INTERCEPTOR_STATE];
  if (installed) {
    installed.timers = timers;
    installed.style = styleToolExecution;
    return;
  }

  const originalAddChild = prototype.addChild;
  const state: InterceptorState = { timers, style: styleToolExecution };
  prototype[INTERCEPTOR_STATE] = state;
  prototype.addChild = function addStyledChild(component: Component): void {
    state.style(component, state.timers);
    originalAddChild.call(this, component);
  };
}
