import * as discord_js from 'discord.js';
import { Collection, Snowflake, ApplicationCommandData, Interaction, ChatInputCommandInteraction, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction, Message, Client, User, APIApplicationCommandSubcommandOption, ChatInputApplicationCommandData, UserApplicationCommandData, MessageApplicationCommandData, ApplicationCommandType, APIApplicationCommandOption } from 'discord.js';
import EventEmitter from 'events';
import * as tslog from 'tslog';
import { Logger, ISettingsParam } from 'tslog';

declare type ModuleHookStore = Collection<string, Function[]>;
declare const getModuleHookStore: (target: object) => ModuleHookStore;
declare const moduleHook: (name: string) => MethodDecorator;

declare type ComponentHookFn = (...args: any[]) => void | Promise<void>;
declare type ComponentHookStore = Collection<string, ComponentHookFn[]>;
declare const createComponentHook: (name: string, fn: ComponentHookFn) => MethodDecorator;

declare class ComponentArgumentDecorator<Options = unknown> {
    options: Options;
    constructor(options: Partial<Options>);
    defaultOptions(): Options;
}

declare class ComponentArgument {
    type: unknown;
    decorators: ComponentArgumentDecorator[];
    constructor(type: unknown);
}

declare class BaseComponent {
    method: Function;
    hooks: ComponentHookStore;
    argTypes: Collection<number, ComponentArgument>;
    _init(method: Function, argTypes: unknown[]): void;
    executeGlobalHook(target: object, name: string, args: unknown[]): Promise<void>;
    executeHook(target: object, name: string, args: unknown[]): Promise<void>;
    execute(target: object, args: unknown[], beforeCallArgs?: unknown[]): Promise<any>;
}

declare type ComponentStore = Collection<string | symbol, BaseComponent>;
declare type ComponentArgumentStore = Collection<number, ComponentArgumentDecorator>;
declare const getComponentStore: (target: object) => ComponentStore;
declare const getComponent: (target: object, key: string | symbol) => BaseComponent | undefined;
declare const createComponentDecorator: (component: BaseComponent) => MethodDecorator;
declare const getComponentArgumentStore: (target: object, key: string | symbol) => ComponentArgumentStore;
declare const createArgumentDecorator: <Options>(type: {
    new (options: Partial<Options>): ComponentArgumentDecorator<Options>;
}) => (options: Options) => ParameterDecorator;

declare type Options$2 = {
    component: unknown;
    type: Function;
    parameterless: boolean;
};
declare type OptionsArg$1 = Omit<Options$2, 'parameterless'> & {
    parameterless?: boolean;
};
declare class ConverterComponent extends BaseComponent {
    options: Options$2;
    constructor(options: OptionsArg$1);
}
declare const argConverter: (options: OptionsArg$1) => MethodDecorator;

declare const createCheckDecorator: (fn: ComponentHookFn) => MethodDecorator;
declare const ownerOnly: MethodDecorator;

declare class OwnerOnlyError {
}

declare const mergeMethodDecorators: (decorators: MethodDecorator[]) => MethodDecorator;

declare type Options$1 = {
    emitter: string;
    event: string;
};
declare type OptionsArg = {
    emitter?: string;
    event: string;
};
declare class ListenerComponent extends BaseComponent {
    options: Options$1;
    constructor(options: OptionsArg);
}
declare const listener: (options: OptionsArg) => MethodDecorator;

declare class Extension {
    protected get commandClient(): CommandClient;
    protected get client(): discord_js.Client<boolean>;
    protected _logger?: Logger<unknown>;
    protected get logger(): Logger<unknown>;
    protected convertArguments(component: unknown, argList: unknown[], args: Collection<number, ComponentArgument>, getConverterArgs: (arg: ComponentArgument, index: number, converter: ConverterComponent) => unknown[] | Promise<unknown[]>): Promise<void>;
}

declare class CTSExtension extends Extension {
    protected get logger(): tslog.Logger<unknown>;
}

declare type ApplicationCommandExtensionConfig = {
    guilds?: Snowflake[];
};
declare class ApplicationCommandExtension extends CTSExtension {
    config: ApplicationCommandExtensionConfig;
    constructor(config: ApplicationCommandExtensionConfig);
    unmanagedCommands: (ApplicationCommandData & {
        guilds?: Snowflake[];
    })[];
    registerUnmanagedCommand(command: ApplicationCommandData & {
        guilds?: Snowflake[];
    }): void;
    interactionCreate(i: Interaction): Promise<void>;
    sync(): Promise<void>;
    chatInteraction(i: ChatInputCommandInteraction): Promise<ChatInputCommandInteraction<discord_js.CacheType>>;
    messageInteraction(i: MessageContextMenuCommandInteraction): Promise<MessageContextMenuCommandInteraction<discord_js.CacheType>>;
    userInteraction(i: UserContextMenuCommandInteraction): Promise<UserContextMenuCommandInteraction<discord_js.CacheType>>;
    commandInteraction(i: UserContextMenuCommandInteraction): Promise<UserContextMenuCommandInteraction<discord_js.CacheType>>;
}

declare type TextCommandOptions = {
    name: string;
    aliases?: string[];
    description?: string;
};
declare class TextCommandComponent extends BaseComponent {
    options: TextCommandOptions;
    constructor(options: TextCommandOptions);
}
declare const command: (options: TextCommandOptions) => MethodDecorator;

declare type TextCommandConfig = {
    prefix: string | string[] | ((msg: Message) => Promise<string | string[]> | string | string[]);
};
declare module 'discord.js' {
    interface Message {
        command: TextCommandComponent;
    }
}

declare class TextCommandRestOption extends ComponentArgumentDecorator<void> {
}
declare const rest: (options: void) => ParameterDecorator;

declare class CommandClient extends EventEmitter {
    discord: Client;
    logger: Logger<unknown>;
    ctsLogger: Logger<unknown>;
    registry: Registry;
    owners: Set<Snowflake>;
    constructor(discord: Client, logger?: Logger<unknown>, loggerOptions?: ISettingsParam<unknown>);
    isOwner(user: User): Promise<boolean>;
    fetchOwners(): Promise<void>;
    enableApplicationCommandsExtension(config: ApplicationCommandExtensionConfig): Promise<void>;
    enableTextCommandsExtension(config: TextCommandConfig): Promise<void>;
    getApplicationCommandsExtension(): ApplicationCommandExtension | undefined;
    static getFromModule(ext: object): CommandClient;
}

declare class Registry {
    client: CommandClient;
    extensions: object[];
    emitters: Collection<string, EventEmitter>;
    logger: Logger<unknown>;
    globalHooks: Record<string, ComponentHookFn[]>;
    constructor(logger: Logger<unknown>, client: CommandClient);
    addGlobalHook(name: string, fn: ComponentHookFn): void;
    getComponentsWithTypeGlobal<T>(type: unknown): T[];
    getComponentsWithType<T>(ext: object, type: unknown): T[];
    registerEventListeners(ext: object): void;
    unregisterEventListeners(ext: object): void;
    loadAllModulesInDirectory(dir: string, pattern?: RegExp): Promise<object[]>;
    loadModulesAtPath(file: string): Promise<object[]>;
    private registerModules;
    reloadModules(): Promise<{
        file: string;
        result: boolean;
        error?: Error | undefined;
        extensions?: object[] | undefined;
    }[]>;
    registerModule(ext: object): Promise<void>;
    unregisterModule(ext: object): Promise<void>;
    runModuleHook(ext: object, hookName: string, ...args: unknown[]): void;
    registerEventEmitter(name: string, emitter: EventEmitter): void;
}

declare class SubCommandGroup {
    options: Omit<APIApplicationCommandSubcommandOption, 'type'>;
    guilds?: string[] | undefined;
    constructor(options: Omit<APIApplicationCommandSubcommandOption, 'type'>, guilds?: string[] | undefined);
    command(options: Omit<ChatInputApplicationCommandData, 'options' | 'type'>): MethodDecorator;
    createChild(options: Omit<APIApplicationCommandSubcommandOption, 'type'>): SubCommandGroupChild;
}
declare class SubCommandGroupChild {
    options: Omit<APIApplicationCommandSubcommandOption, 'type'>;
    parent: SubCommandGroup;
    constructor(options: Omit<APIApplicationCommandSubcommandOption, 'type'>, parent: SubCommandGroup);
    command(options: Omit<ChatInputApplicationCommandData, 'options' | 'type'>): MethodDecorator;
}

declare type Options = (UserApplicationCommandData | MessageApplicationCommandData | Omit<ChatInputApplicationCommandData, 'options'>) & {
    type: ApplicationCommandType;
    guilds?: Snowflake[];
};
declare class ApplicationCommandComponent extends BaseComponent {
    options: Options;
    subcommandGroup?: SubCommandGroup;
    subcommandGroupChild?: SubCommandGroupChild;
    constructor(options: UserApplicationCommandData | MessageApplicationCommandData | Omit<ChatInputApplicationCommandData, 'options'>);
}
declare const applicationCommand: (options: Options) => MethodDecorator;

declare const option: (options: APIApplicationCommandOption) => ParameterDecorator;

export { ApplicationCommandComponent, Options as ApplicationCommandComponentOptions, ApplicationCommandExtension, ApplicationCommandExtensionConfig, Options$2 as ArgumentConvertOptions, OptionsArg$1 as ArgumentConvertOptionsArg, BaseComponent, CommandClient, ComponentArgument, ComponentArgumentDecorator, ComponentArgumentStore, ComponentHookFn, ComponentHookStore, ComponentStore, ConverterComponent, Extension, ListenerComponent, Options$1 as ListenerOptions, OptionsArg as ListenerOptionsArg, ModuleHookStore, OwnerOnlyError, Registry, SubCommandGroup, SubCommandGroupChild, TextCommandComponent, TextCommandConfig, TextCommandOptions, TextCommandRestOption, applicationCommand, argConverter, command, createArgumentDecorator, createCheckDecorator, createComponentDecorator, createComponentHook, getComponent, getComponentArgumentStore, getComponentStore, getModuleHookStore, listener, mergeMethodDecorators, moduleHook, option, ownerOnly, rest };
