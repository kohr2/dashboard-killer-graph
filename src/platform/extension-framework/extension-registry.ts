// Extension Registry - Platform Framework
// This class manages registration and discovery of extensions

export class ExtensionRegistry {
  private extensions: Map<string, any> = new Map();
  
  register(name: string, extension: any): void {
    if (this.extensions.has(name)) {
      throw new Error(`Extension with name "${name}" is already registered`);
    }
    this.extensions.set(name, extension);
  }
  
  getExtension(name: string): any {
    return this.extensions.get(name) || null;
  }
  
  listExtensions(): string[] {
    return Array.from(this.extensions.keys());
  }
} 