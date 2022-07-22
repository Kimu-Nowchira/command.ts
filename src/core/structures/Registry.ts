/*
 * File: Registry.ts
 *
 * Copyright (c) 2022-2022 pikokr
 *
 * Licensed under MIT License. Please see more defails in LICENSE file.
 */

import chalk from 'chalk'
import { Collection } from 'discord.js'
import EventEmitter from 'events'
import _, { result } from 'lodash'
import { Logger } from 'tslog'
import { getComponentStore } from '../components'
import type { BaseComponent } from '../components'
import { getModuleHookStore } from '../hooks'
import { ListenerComponent } from '../listener'
import { CommandClientSymbol, FilePathSymbol } from '../symbols'
import { CommandClient } from './CommandClient'
import walkSync from 'walk-sync'
import path from 'path'

export class Registry {
  extensions: object[] = []

  emitters: Collection<string, EventEmitter> = new Collection()

  logger: Logger

  constructor(logger: Logger, public client: CommandClient) {
    this.logger = logger.getChildLogger({
      prefix: [chalk.green('[Registry]')],
    })
  }

  getComponentsWithTypeGlobal<T extends typeof BaseComponent<Config>, Config>(type: T): InstanceType<T>[] {
    const result: InstanceType<T>[] = []

    for (const ext of this.extensions) {
      result.push(...this.getComponentsWithType(ext, type))
    }

    return result
  }

  getComponentsWithType<T extends typeof BaseComponent<Config>, Config>(ext: object, type: T): InstanceType<T>[] {
    const componentStore = getComponentStore(ext)

    return Array.from(componentStore.filter((x) => (x.constructor as unknown) === type).values() as Iterable<InstanceType<T>>)
  }

  registerEventListeners(ext: object) {
    const listeners = this.getComponentsWithType(ext, ListenerComponent)

    for (const listener of listeners) {
      const emitter = this.emitters.get(listener.options.emitter)

      if (emitter) {
        const bound = listener.method.bind(ext)

        Reflect.defineMetadata('bound', bound, listener)

        emitter.addListener(listener.options.event, bound)
      }
    }
  }

  unregisterEventListeners(ext: object) {
    const listeners = this.getComponentsWithType(ext, ListenerComponent)

    for (const listener of listeners) {
      const emitter = this.emitters.get(listener.options.emitter)
      const bound = Reflect.getMetadata('bound', listener)

      if (emitter && bound) {
        emitter.removeListener(listener.options.event, bound)
      }
    }
  }

  async loadAllModulesInDirectory(dir: string): Promise<object[]> {
    const results: object[] = []

    const files = walkSync(dir).filter((x) => x.endsWith('.ts') || x.endsWith('.js'))

    for (const file of files) {
      try {
        const p = path.join(dir, file)
        const mod = require(p)

        if (typeof mod.setup !== 'function') continue

        const modules = await mod.setup()

        results.push(...(await this.registerModules(modules, p)))
      } catch (e) {
        this.logger.error(`Failed to load ${file}`)
      }
    }

    return results
  }

  private async registerModules(modules: object | object[], p: string) {
    const results: object[] = []
    if (modules instanceof Array) {
      for (const module of modules) {
        await this.registerModule(module)
        Reflect.defineMetadata(FilePathSymbol, p, module)
        results.push(module)
      }
    } else {
      await this.registerModule(modules)
      Reflect.defineMetadata(FilePathSymbol, p, modules)
      results.push(modules)
    }

    return results
  }

  async reloadModules() {
    const result: { file: string; result: boolean; error?: Error }[] = []
    const paths = new Set<string>()
    for (const module of this.extensions) {
      const file = Reflect.getMetadata(FilePathSymbol, module)
      if (!file) continue

      paths.add(file)

      await this.unregisterModule(module)
      delete require.cache[require.resolve(file)]
    }

    for (const path of paths) {
      try {
        const mod = require(path)

        if (typeof mod.setup !== 'function') continue

        const modules = await mod.setup()

        await this.registerModules(modules, path)

        result.push({
          file: path,
          result: true,
        })
      } catch (e) {
        result.push({
          file: path,
          result: false,
          error: e as Error,
        })
      }
    }

    return result
  }

  async registerModule(ext: object) {
    Reflect.defineMetadata(CommandClientSymbol, this.client, ext)

    this.registerEventListeners(ext)
    await this.runModuleHook(ext, 'load')
    this.extensions.push(ext)
    this.logger.info(`Module registered: ${chalk.green(ext.constructor.name)}`)
  }

  async unregisterModule(ext: object) {
    this.unregisterEventListeners(ext)
    await this.runModuleHook(ext, 'unload')
    _.remove(this.extensions, (x) => x === ext)
    this.logger.info(`Module unregistered: ${chalk.green(ext.constructor.name)}`)
  }

  runModuleHook(ext: object, hookName: string, ...args: unknown[]) {
    const hooks = getModuleHookStore(ext)

    const functions = hooks.get(hookName)

    if (functions) {
      for (const fn of functions) {
        fn.call(ext, ...args)
      }
    }
  }

  registerEventEmitter(name: string, emitter: EventEmitter) {
    this.emitters.set(name, emitter)
  }
}
