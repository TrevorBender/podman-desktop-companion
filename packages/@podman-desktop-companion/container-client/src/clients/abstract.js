// vendors
const merge = require("lodash.merge");
// project
const { createLogger } = require("@podman-desktop-companion/logger");
// module
const { createApiDriver, getApiConfig } = require("../api");
class AbstractContainerClient {
  constructor(userConfiguration, id, engine, program) {
    this.userConfiguration = userConfiguration;
    this.id = id;
    this.engine = engine;
    this.program = program;
    this.logger = createLogger(`clients.${engine}`);
    this.cache = {
      engine: undefined
    };
  }

  // Settings management
  async getMergedSettings(engine) {
    return merge(
      {},
      // detected
      engine.settings.detect,
      // custom
      engine.settings.custom
    );
  }
  async getCurrentSettings() {
    if (!this.cache.engine) {
      this.cache.engine = await this.getEngine();
    }
    const { engine } = this.cache;
    const settings = await this.getMergedSettings(engine);
    return settings;
  }

  // API life-cycle
  async createApiConfiguration(settings) {
    return {};
  }
  async getApiConfig() {
    const settings = await this.getCurrentSettings();
    const config = getApiConfig(settings.api.baseURL, settings.api.connectionString);
    return config;
  }
  async getApiDriver() {
    const config = await this.getApiConfig();
    const driver = await createApiDriver(config);
    return driver;
  }
  async isApiConfigured() {
    throw new Error("Not implemented");
  }
  async isApiScopeAvailable() {
    throw new Error("Not implemented");
  }
  async isApiAvailable() {
    throw new Error("Not implemented");
  }
  async isApiRunning() {
    const configured = await this.isApiConfigured();
    if (!configured) {
      this.logger.warn("isApiRunning failed - API is not configured");
      return { success: false, details: "API is not configured" };
    }
    const isScopeAvailable = await this.isApiScopeAvailable();
    if (!isScopeAvailable) {
      this.logger.warn("isApiRunning failed - API scope is not available");
      return { success: false, details: "API scope is not available" };
    }
    const available = await this.isApiAvailable();
    if (!available) {
      this.logger.warn("isApiRunning failed - API is not available");
      return { success: false, details: "API is not available" };
    }
    const result = {
      success: false,
      details: undefined
    };
    const driver = await this.getApiDriver();
    try {
      const response = await driver.get("/_ping");
      result.success = response?.data === "OK";
      result.details = response?.data;
    } catch (error) {
      result.details = error.message;
    }
    return result;
  }
  async startApi() {
    throw new Error("Not implemented");
  }
  async stopApi() {
    throw new Error("Not implemented");
  }

  async checkAvailability() {
    return {
      available: false,
      reason: "Not implemented"
    };
  }
  async getEngine() {
    const availability = await this.checkAvailability();
    const settings = {};
    const engine = {
      id: this.id,
      engine: this.engine,
      program: this.program,
      availability,
      settings
    };
    return engine;
  }

  // Public API
  async getSystemInfo() {
    throw new Error("Not implemented");
  }

  // Original podman influenced design specific
  async getMachines() {
    return [];
  }
  async getSystemConnections() {
    return [];
  }
}

module.exports = {
  AbstractContainerClient
};
