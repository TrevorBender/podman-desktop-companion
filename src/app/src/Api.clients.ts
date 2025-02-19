// vendors
// project
import {
  //
  Domain,
  GlobalUserSettings,
  GlobalUserSettingsOptions,
  EngineConnectorSettings,
  ControllerScope,
  //
  ContainerClientResponse,
  Container,
  ContainerStats,
  ContainerImageMount,
  ContainerImagePortMapping,
  //
  ContainerImage,
  ContainerImageHistory,
  //
  Secret,
  Volume,
  ApplicationDescriptor,
  SystemInfo,
  SystemPruneReport,
  SystemResetReport,
  Machine,
  Pod,
  PodProcessReport,
  //
  ContainerStateList,
  TestResult,
  Program,
  ProgramExecutionResult,
  ConnectOptions,
  EngineApiOptions,
  EngineProgramOptions
} from "./Types";

import { Native } from "./Native";
import { FindProgramOptions, GenerateKubeOptions } from "./domain/types";

export interface FetchDomainOptions {}

export interface FetchImageOptions {
  Id: string;
  withHistory?: boolean;
  withKube?: boolean;
}

export interface PushImageOptions {
  destination?: string;
  tlsVerify?: boolean;
  registryAuth?: string;
}
export interface FetchContainerOptions {
  Id: string;
  withLogs?: boolean;
  withStats?: boolean;
  withKube?: boolean;
}

export interface FetchVolumeOptions {
  Id: string;
}
export interface CreateContainerOptions {
  ImageId: string;
  Name?: string;
  // flags
  Start?: boolean;
  Mounts?: ContainerImageMount[];
  PortMappings?: ContainerImagePortMapping[];
}

export interface CreateVolumeOptions {
  Driver: string;
  Label: { [key: string]: string };
  Labels: { [key: string]: string };
  Name: string;
  Options: { [key: string]: string };
}

export interface FetchSecretOptions {
  Id: string; // name or id
}

export interface CreateSecretOptions {
  driver?: string;
  name: string;
  Secret: string;
}

export interface FetchMachineOptions {
  Name: string; // name or id
}
export interface CreateMachineOptions {}

export interface FetchPodOptions {
  Id: string;
  withProcesses?: boolean;
  withKube?: boolean;
  withLogs?: boolean | { Tail: number };
}
export interface CreatePodOptions {
  Name: string;
  Start?: boolean;
}

export interface InvocationOptions<T = unknown> {
  method: string;
  params?: T;
}

export const coerceContainer = (container: Container) => {
  if (container.ImageName) {
    container.Image = container.ImageName;
  }
  container.Logs = container.Logs || [];
  container.Ports = container.Ports || [];
  if (typeof container.State === "object") {
    container.DecodedState = container.State.Status as ContainerStateList;
  } else {
    container.DecodedState = container.State as ContainerStateList;
  }
  return container;
};

export const coerceImage = (image: ContainerImage) => {
  let info = "";
  let tag = "";
  let name = "";
  let registry = "";
  const nameSource = image.Names || image.NamesHistory;
  const parts = (nameSource ? nameSource[0] || "" : "").split(":");
  [info, tag] = parts;
  let paths = [];
  [registry, ...paths] = info.split("/");
  name = paths.join("/");
  if (!tag) {
    if (image.RepoTags) {
      const fromTag = (image.RepoTags[0] || "");
      name = fromTag.slice(0, fromTag.indexOf(":"));
      tag = fromTag.slice(fromTag.indexOf(":") + 1);
    }
  }
  image.Name = registry ? name : `library/${name}`;
  image.Tag = tag;
  image.Registry = registry || "docker.io";
  image.History = [];
  return image;
};

export const coercePod = (pod: Pod) => {
  pod.Processes = {
    Processes: [],
    Titles: []
  };
  return pod;
}


interface ApiDriverConfig<D> {
  timeout?: number;
  headers?: { [key: string]: any};
  params?: URLSearchParams | D;
}

export class ApiDriver {
  public async request<T = any, D = any>(method: string, url: string, data?: D, config?: ApiDriverConfig<D>) {
    const request = {
      method: "createApiRequest",
      params: {
        method,
        url,
        ...config,
        data
      },
    };
    const reply = await Native.getInstance().proxyService<ContainerClientResponse<T>>(request, true);
    return reply.result;
  }
  public async get<T = any, D = any>(url: string, config?: ApiDriverConfig<D>) {
    return this.request<T, D>("GET", url, undefined, config);
  }
  public async delete<T = any, D = any>(url: string, config?: ApiDriverConfig<D>) {
    return this.request<T, D>("DELETE", url, undefined, config);
  }
  public async head<T = any, D = any>(url: string, config?: ApiDriverConfig<D>) {
    return this.request<T, D>("HEAD", url, undefined, config);
  }
  public async post<T = any, D = any>(url: string, data?: D, config?: ApiDriverConfig<D>) {
    return this.request<T, D>("POST", url, data, config);
  }
  public async put<T = any, D = any>(url: string, data?: D, config?: ApiDriverConfig<D>) {
    return this.request<T, D>("PUT", url, data, config);
  }
  public async patch<T = any, D = any>(url: string, data?: D, config?: ApiDriverConfig<D>) {
    return this.request<T, D>("PATCH", url, data, config);
  }
}
export class ContainerClient {
  protected dataApiDriver: ApiDriver;
  protected engine: string = "";

  constructor() {
    this.dataApiDriver = new ApiDriver();
  }
  setEngine(engine: string) {
    this.engine = engine;
  }
  getEngine() {
    return this.engine;
  }

  protected async withResult<T>(handler: () => Promise<T>) {
    const response = await handler();
    return response;
  }

  async getDomain() {
    return this.withResult<Domain>(async () => {
      const [containers, images, machines, volumes] = await Promise.all([
        this.getContainers(),
        this.getImages(),
        this.getMachines(),
        this.getVolumes()
      ]);
      const domain: Domain = {
        containers,
        images,
        machines,
        volumes
      };
      return domain;
    });
  }
  async getImages() {
    return this.withResult<ContainerImage[]>(async () => {
      const result = await this.dataApiDriver.get<ContainerImage[]>("/images/json");
      return result.ok ? result.data.map((it) => coerceImage(it)) : [];
    });
  }
  async getImage(id: string, opts?: FetchImageOptions) {
    return this.withResult<ContainerImage>(async () => {
      const params = new URLSearchParams();
      const result = await this.dataApiDriver.get<ContainerImage>(`/images/${id}/json`, {
        params
      });
      const image = coerceImage(result.data);
      if (opts?.withHistory) {
        image.History = await this.getImageHistory(id);
      }
      return image;
    });
  }
  async getImageHistory(id: string) {
    return this.withResult<ContainerImageHistory[]>(async () => {
      const result = await this.dataApiDriver.get<ContainerImageHistory[]>(`/images/${id}/history`);
      return result.data;
    });
  }
  async removeImage(id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.delete<boolean>(`/images/${id}`);
      return result.ok;
    });
  }
  async pullImage(name: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/images/pull`, undefined, {
        params: {
          reference: name
        }
      });
      return result.ok;
    });
  }
  async pushImage(id: string, opts?: PushImageOptions) {
    return this.withResult<boolean>(async () => {
      const params: { [key: string]: string } = {};
      if (opts) {
        if (opts.destination) {
          params.destination = opts.destination;
        }
        if (opts.tlsVerify === false) {
          params.tslVerify = "false";
        }
      }
      const result = await this.dataApiDriver.post<boolean>(`/images/${id}/push`, undefined, {
        params
      });
      return result.ok;
    });
  }
  // container
  async getContainers() {
    return this.withResult<Container[]>(async () => {
      const result = await this.dataApiDriver.get<Container[]>("/containers/json", {
        params: {
          all: true
        }
      });
      return result.ok ? result.data.map((it) => coerceContainer(it)) : [];
    });
  }
  async getContainer(id: string, opts?: FetchContainerOptions) {
    return this.withResult<Container>(async () => {
      const result = await this.dataApiDriver.get<Container>(`/containers/${id}/json`);
      const container = coerceContainer(result.data);
      if (opts?.withLogs) {
        container.Logs = await this.getContainerLogs(id);
      }
      return container;
    });
  }
  async getContainerLogs(id: string) {
    return this.withResult<string[]>(async () => {
      const result = await this.dataApiDriver.get<string[]>(`/containers/${id}/logs`, {
        params: {
          stdout: true,
          stderr: true
        }
      });
      return `${result.data as any}`.trim().split("\n");
    });
  }
  async getContainerStats(id: string) {
    return this.withResult<ContainerStats>(async () => {
      const result = await this.dataApiDriver.get<ContainerStats>(`/containers/${id}/stats`, {
        params: {
          stream: false
        }
      });
      return result.data;
    });
  }
  async pauseContainer(id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/containers/${id}/pause`);
      return result.ok;
    });
  }
  async unpauseContainer(id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/containers/${id}/unpause`);
      return result.ok;
    });
  }
  async stopContainer(id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/containers/${id}/stop`);
      return result.ok;
    });
  }
  async restartContainer(id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/containers/${id}/restart`);
      return result.ok;
    });
  }
  async removeContainer(id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.delete<boolean>(`/containers/${id}`, {
        params: {
          force: true,
          v: true
        }
      });
      return result.ok;
    });
  }
  async createContainer(opts: CreateContainerOptions) {
    return this.withResult<{ created: boolean; started: boolean; }>(async () => {
      const creator = {
        image: opts.ImageId,
        name: opts.Name,
        mounts: opts.Mounts?.filter((mount) => mount.source && mount.destination).map((mount) => {
          return {
            Source: mount.source,
            Destination: mount.destination,
            Type: mount.type
          };
        }),
        portmappings: opts.PortMappings?.map((mapping) => {
          return {
            protocol: mapping.protocol,
            container_port: mapping.container_port,
            host_ip: mapping.host_ip === "localhost" ? "127.0.0.1" : mapping.host_ip,
            host_port: mapping.host_port
          };
        })
      };
      let url = "/containers/create";
      if (opts.Name) {
        const searchParams = new URLSearchParams();
        searchParams.set("name", opts.Name)
        url = `${url}?${searchParams.toString()}`;
      }
      const createResult = await this.dataApiDriver.post<{ Id: string }>(url, creator);
      const create = { created: false, started: false };
      if (createResult.ok) {
        create.created = true;
        if (opts.Start) {
          const { Id } = createResult.data;
          const startResult = await this.dataApiDriver.post(`/containers/${Id}/start`);
          if (startResult.ok) {
            create.started = true;
          }
        } else {
          create.started = false;
        }
      }
      return create;
    });
  }
  // Volumes
  async getVolumes() {
    return this.withResult<Volume[]>(async () => {
      const engine = this.getEngine();
      let serviceUrl = "/volumes/json";
      let processData = (input: any) => input as Volume[];
      if (engine.startsWith("docker"))  {
        serviceUrl = "/volumes";
        processData = (input: any) => {
          const output = input.Volumes;
          return output as Volume[];
        };
      }
      const result = await this.dataApiDriver.get<Volume[]>(serviceUrl);
      return result.ok ? processData(result.data) : [];
    });
  }
  async getVolume(nameOrId: string, opts?: FetchVolumeOptions) {
    return this.withResult<Volume>(async () => {
      const engine = this.getEngine();
      let serviceUrl = `/volumes/${nameOrId}/json`;
      if (engine.startsWith("docker"))  {
        serviceUrl = `/volumes/${nameOrId}`;
      }
      const result = await this.dataApiDriver.get<Volume>(serviceUrl);
      return result.data;
    });
  }
  async inspectVolume(nameOrId: string) {
    return this.withResult<Volume>(async () => {
      const result = await this.dataApiDriver.get<Volume>(`/volumes/${nameOrId}/json`);
      return result.data;
    });
  }
  async createVolume(opts: CreateVolumeOptions) {
    return this.withResult<Volume>(async () => {
      const creator = opts;
      const result = await this.dataApiDriver.post<Volume>("/volumes/create", creator);
      return result.data;
    });
  }
  async removeVolume(nameOrId: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.delete<boolean>(`/volumes/${nameOrId}`, {
        params: {
          force: true
        }
      });
      return result.ok;
    });
  }
  async pruneVolumes(filters: any) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post("/volumes/prune", filters);
      return result.ok;
    });
  }
  // Secrets
  async getSecrets() {
    return this.withResult<Secret[]>(async () => {
      const result = await this.dataApiDriver.get<Secret[]>("/secrets/json");
      return result.ok ? result.data : [];
    });
  }
  async getSecret(nameOrId: string, opts?: FetchSecretOptions) {
    return this.withResult<Secret>(async () => {
      const result = await this.dataApiDriver.get<Secret>(`/secrets/${nameOrId}/json`);
      return result.data;
    });
  }
  async inspectSecret(nameOrId: string) {
    return this.withResult<Secret>(async () => {
      const result = await this.dataApiDriver.get<Secret>(`/secrets/${nameOrId}/json`);
      return result.data;
    });
  }
  async createSecret(opts: CreateSecretOptions) {
    return this.withResult<Secret>(async () => {
      const creator = {
        Secret: opts.Secret
      };
      const params: { name: string; driver?: string } = { name: opts.name };
      if (opts.driver) {
        params.driver = opts.driver;
      }
      const result = await this.dataApiDriver.post<Secret>("/secrets/create", creator, {
        params
      });
      return result.data;
    });
  }
  async removeSecret(id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.delete<boolean>(`/secrets/${id}`, {
        params: {
          force: true
        }
      });
      return result.ok;
    });
  }
  // System
  async getSystemInfo() {
    return this.withResult<SystemInfo>(async () => {
      const reply = await Native.getInstance().proxyService<SystemInfo>({
        method: "getSystemInfo",
      });
      return reply.result;
    });
  }
  async pruneSystem() {
    // return this.withResult<SystemPruneReport>(async () => {
    //   const result = await this.dataApiDriver.post<SystemPruneReport>(`/system/prune`);
    //   return result.data;
    // });
    return this.withResult<SystemPruneReport>(async () => {
      const reply = await Native.getInstance().proxyService<SystemPruneReport>({
        method: "pruneSystem",
      });
      return reply.result;
    });
  }

  async start(opts: ConnectOptions | undefined) {
    return this.withResult<ApplicationDescriptor>(async () => {
      const reply = await Native.getInstance().proxyService<ApplicationDescriptor>({
        method: "start",
        params: opts
      });
      return reply.result;
    });
  }

  async connect(opts: ConnectOptions) {
    return this.withResult<boolean>(async () => {
      const reply = await Native.getInstance().proxyService<boolean>({
        method: "connect",
        params: opts
      });
      return reply.result;
    });
  }

  // HTTP API

  // Containers
  async connectToContainer(item: Container) {
    return this.withResult<boolean>(async () => {
      const reply = await Native.getInstance().proxyService<boolean>({
        method: "connectToContainer",
        params: { id: item.Id, title: item.Name || item.Names?.[0], shell: undefined }
      });
      return reply.result;
    });
  }

  // Controller scopes - WSL distributions, LIMA instances and podman machines
  async getControllerScopes() {
    return this.withResult<ControllerScope[]>(async () => {
      const reply = await Native.getInstance().proxyService<ControllerScope[]>({
        method: "getControllerScopes"
      });
      return reply.result;
    });
  }

  // Machines
  async getMachines() {
    return this.withResult<Machine[]>(async () => {
      const reply = await Native.getInstance().proxyService<Machine[]>({
        method: "getMachines"
      });
      return reply.result;
    });
  }
  async getMachine(Name: string) {
    return this.withResult<Machine>(async () => {
      const reply = await Native.getInstance().proxyService<Machine>({
        method: "inspectMachine",
        params: { Name }
      });
      return reply.result;
    });
  }
  async createMachine(opts: CreateMachineOptions) {
    return this.withResult<Machine>(async () => {
      const reply = await Native.getInstance().proxyService<Machine>({
        method: "createMachine",
        params: opts
      });
      return reply.result;
    });
  }
  async removeMachine(Name: string) {
    return this.withResult<boolean>(async () => {
      const reply = await Native.getInstance().proxyService<boolean>({
        method: "removeMachine",
        params: { Name, force: true }
      });
      return reply.result;
    });
  }
  async stopMachine(Name: string) {
    return this.withResult<boolean>(async () => {
      const reply = await Native.getInstance().proxyService<boolean>({
        method: "stopMachine",
        params: { Name }
      });
      return reply.result;
    });
  }
  async restartMachine(Name: string) {
    return this.withResult<boolean>(async () => {
      const reply = await Native.getInstance().proxyService<boolean>({
        method: "restartMachine",
        params: { Name }
      });
      return reply.result;
    });
  }
  async connectToMachine(Name: string) {
    return this.withResult<boolean>(async () => {
      const reply = await Native.getInstance().proxyService<boolean>({
        method: "connectToMachine",
        params: { Name }
      });
      return reply.result;
    });
  }

  // Pods
  async getPods() {
    return this.withResult<Pod[]>(async () => {
      const result = await this.dataApiDriver.get<Pod[]>("/pods/json", {
        params: {
          all: true
        }
      });
      return result.ok ? result.data.map((it) => coercePod(it)) : [];
    });
  }
  async getPod(Id: string) {
    return this.withResult<Pod>(async () => {
      const result = await this.dataApiDriver.get<Pod>(`/pods/${Id}/json`);
      const item = coercePod(result.data);
      return item;
    });
  }
  async getPodProcesses(Id: string) {
    return this.withResult<PodProcessReport>(async () => {
      const result = await this.dataApiDriver.get<PodProcessReport>(`/pods/${Id}/top`);
      if (!result.data) {
        return {
          Processes: [],
          Titles: []
        };
      }
      return result.data;
    });
  }
  async getPodLogs(Id: string, tail?: number) {
    return this.withResult<ProgramExecutionResult>(async () => {
      const reply = await Native.getInstance().proxyService<ProgramExecutionResult>({
        method: "getPodLogs",
        params: {
          Id,
          Tail: tail
        }
      });
      return reply.result;
    });
  }
  async createPod(opts: CreatePodOptions) {
    return this.withResult<{ created: boolean; started: boolean; }>(async () => {
      const creator = {
        name: opts.Name,
      };
      let url = "/pods/create";
      if (opts.Name) {
        const searchParams = new URLSearchParams();
        searchParams.set("name", opts.Name)
        url = `${url}?${searchParams.toString()}`;
      }
      const createResult = await this.dataApiDriver.post<{ Id: string }>(url, creator);
      const create = { created: false, started: false };
      if (createResult.ok) {
        create.created = true;
        if (opts.Start) {
          const { Id } = createResult.data;
          const startResult = await this.dataApiDriver.post(`/pods/${Id}/start`);
          if (startResult.ok) {
            create.started = true;
          }
        } else {
          create.started = false;
        }
      }
      return create;
    });
  }
  async removePod(Id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.delete<boolean>(`/pods/${Id}`, {
        params: {
          force: true,
          v: true
        }
      });
      return result.ok;
    });
  }
  async stopPod(Id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/pods/${Id}/stop`);
      return result.ok;
    });
  }
  async restartPod(Id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/pods/${Id}/restart`);
      return result.ok;
    });
  }
  async pausePod(Id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/pods/${Id}/pause`);
      return result.ok;
    });
  }
  async unpausePod(Id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/pods/${Id}/unpause`);
      return result.ok;
    });
  }
  async killPod(Id: string) {
    return this.withResult<boolean>(async () => {
      const result = await this.dataApiDriver.post<boolean>(`/pods/${Id}/kill`);
      return result.ok;
    });
  }

  // System
  async resetSystem() {
    return this.withResult<SystemResetReport>(async () => {
      const reply = await Native.getInstance().proxyService<SystemResetReport>({
        method: "resetSystem"
      });
      return reply.result;
    });
  }

  // Generators
  async generateKube(opts: GenerateKubeOptions) {
    return this.withResult<ProgramExecutionResult>(async () => {
      const reply = await Native.getInstance().proxyService<ProgramExecutionResult>({
        method: "generateKube",
        params: opts
      });
      console.debug(reply);
      return reply.result;
    });
  }

  // Configuration globals
  async getGlobalUserSettings() {
    return this.withResult<GlobalUserSettings>(async () => {
      const reply = await Native.getInstance().proxyService<GlobalUserSettings>({
        method: "getGlobalUserSettings",
      });
      return reply.result;
    });
  }

  async setGlobalUserSettings(options: Partial<GlobalUserSettingsOptions>) {
    return this.withResult<GlobalUserSettings>(async () => {
      const reply = await Native.getInstance().proxyService<GlobalUserSettings>({
        method: "setGlobalUserSettings",
        params: options
      });
      return reply.result;
    });
  }

  // Configuration per engine
  async getEngineUserSettings(id: string) {
    return this.withResult<any>(async () => {
      const reply = await Native.getInstance().proxyService<any>({
        method: "getEngineUserSettings",
        params: {
          id
        },
      });
      return reply.result;
    });
  }

  async setEngineUserSettings(id: string, settings: Partial<EngineConnectorSettings>) {
    return this.withResult<EngineConnectorSettings>(async () => {
      const reply = await Native.getInstance().proxyService<EngineConnectorSettings>({
        method: "setEngineUserSettings",
        params: {
          id,
          settings
        }
      });
      console.debug(reply);
      return reply.result;
    });
  }

  async testEngineProgramReachability(opts: EngineProgramOptions) {
    return this.withResult<TestResult>(async () => {
      const reply = await Native.getInstance().proxyService<TestResult>({
        method: "test",
        params: {
          subject: "reachability.program",
          payload: opts
        }
      });
      return reply.result;
    });
  }

  async testApiReachability(opts: EngineApiOptions) {
    return this.withResult<TestResult>(async () => {
      const reply = await Native.getInstance().proxyService<TestResult>({
        method: "test",
        params: {
          subject: "reachability.api",
          payload: opts
        }
      });
      return reply.result;
    });
  }

  async findProgram(options: FindProgramOptions) {
    return this.withResult<Program>(async () => {
      const reply = await Native.getInstance().proxyService<Program>({
        method: "findProgram",
        params: options
      });
      return reply.result;
    });
  }

}
