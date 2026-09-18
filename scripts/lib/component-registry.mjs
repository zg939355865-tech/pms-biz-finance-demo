import fs from 'node:fs';

const registryUrl = new URL('../../prototype-resources/components/component-registry.json', import.meta.url);
export const componentRegistry = JSON.parse(fs.readFileSync(registryUrl, 'utf8'));

export const registeredComponents = new Set(Object.values(componentRegistry.categories).flat());
export const registeredFieldComponents = new Set(componentRegistry.fieldComponents);
export const registeredColumnComponents = new Set(componentRegistry.columnComponents);
export const registeredPageTypes = new Set(componentRegistry.pageTypes);

export function walkComponents(nodes, visit, path = 'regions') {
  for (const [index, node] of (nodes || []).entries()) {
    const nodePath = `${path}[${index}]`;
    visit(node, nodePath);
    walkComponents(node.children, visit, `${nodePath}.children`);
    if (node.rowExpansion) walkComponents([node.rowExpansion], visit, `${nodePath}.rowExpansion`);
    for (const [tabIndex, tab] of (node.tabs || []).entries()) {
      walkComponents(tab.children, visit, `${nodePath}.tabs[${tabIndex}].children`);
    }
  }
}
