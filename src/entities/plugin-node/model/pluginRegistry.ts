import { PluginDefinition, PluginType } from './types';

// Реестр всех доступных плагинов в приложении
class PluginRegistryClass {
  private plugins = new Map<string, PluginDefinition>();
  private pluginsByType = new Map<PluginType, string[]>();

  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} already registered`);
      return;
    }
    
    this.plugins.set(plugin.id, plugin);
    
    if (!this.pluginsByType.has(plugin.type)) {
      this.pluginsByType.set(plugin.type, []);
    }
    this.pluginsByType.get(plugin.type)!.push(plugin.id);
    
    console.log(`✅ Plugin registered: ${plugin.name} (${plugin.id})`);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      const typePlugins = this.pluginsByType.get(plugin.type);
      if (typePlugins) {
        const index = typePlugins.indexOf(pluginId);
        if (index !== -1) typePlugins.splice(index, 1);
      }
      this.plugins.delete(pluginId);
      console.log(`❌ Plugin unregistered: ${pluginId}`);
    }
  }

  getPlugin(id: string): PluginDefinition | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByType(type: PluginType): PluginDefinition[] {
    const ids = this.pluginsByType.get(type) || [];
    return ids.map(id => this.plugins.get(id)).filter(Boolean) as PluginDefinition[];
  }

  hasPlugin(id: string): boolean {
    return this.plugins.has(id);
  }
  
  getPluginCount(): number {
    return this.plugins.size;
  }
}

export const PluginRegistry = new PluginRegistryClass();