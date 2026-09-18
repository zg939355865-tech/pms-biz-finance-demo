import { registeredComponents, componentRegistry } from "./scripts/lib/component-registry.mjs";
console.log("registered:", [...registeredComponents].sort().join(", "));
console.log("requiredProps keys:", Object.keys(componentRegistry.requiredComponentProperties||{}).join(", "));
console.log("Modal req:", JSON.stringify(componentRegistry.requiredComponentProperties?.Modal));
console.log("EditableTable req:", JSON.stringify(componentRegistry.requiredComponentProperties?.EditableTable));
console.log("Alert req:", JSON.stringify(componentRegistry.requiredComponentProperties?.Alert));
