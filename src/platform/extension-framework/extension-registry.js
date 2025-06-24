"use strict";
// Extension Registry - Platform Framework
// This class manages registration and discovery of extensions
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionRegistry = void 0;
class ExtensionRegistry {
    constructor() {
        this.extensions = new Map();
    }
    register(name, extension) {
        if (this.extensions.has(name)) {
            throw new Error(`Extension with name "${name}" is already registered`);
        }
        this.extensions.set(name, extension);
    }
    getExtension(name) {
        return this.extensions.get(name) || null;
    }
    listExtensions() {
        return Array.from(this.extensions.keys());
    }
}
exports.ExtensionRegistry = ExtensionRegistry;
//# sourceMappingURL=extension-registry.js.map